import { describe, expect, it } from 'vitest';
import {
  DIRECTIONS,
  createGame,
  createRandom,
  fitGrid,
  ghostTailCount,
  pickCard,
  rules,
  step,
  stepMs,
  togglePause,
  turn,
  type GameState,
} from '../src/snake/game';

// A round with the rival parked off the board, so only the player's rules are in play.
function soloGame(): GameState {
  const state = createGame(20, 12, createRandom(7));
  state.cpu.alive = false;
  state.cpu.body = [];
  state.cpu.respawnAt = Number.POSITIVE_INFINITY;
  state.food = { x: 0, y: 0 };
  return state;
}

function start(state: GameState): void {
  turn(state, DIRECTIONS.right);
}

describe('board size', () => {
  it('keeps 18 cells on the short side of a phone and a desktop', () => {
    const phone = fitGrid(390, 770);
    const desktop = fitGrid(1440, 846);

    expect(phone.cols).toBe(18);
    expect(desktop.rows).toBe(18);
    expect(phone.cell).toBeGreaterThanOrEqual(rules.minCellPx);
    expect(desktop.cols * desktop.rows).toBeLessThan(700);
    expect(phone.cols * phone.rows).toBeLessThan(700);
  });

  it('centres the board inside the field', () => {
    const grid = fitGrid(390, 770);

    expect(grid.x).toBe(Math.floor((390 - grid.cols * grid.cell) / 2));
    expect(grid.x).toBeGreaterThanOrEqual(0);
    expect(grid.y + grid.rows * grid.cell).toBeLessThanOrEqual(770);
  });
});

describe('ready, pause and start', () => {
  it('waits on the ready screen until the first turn', () => {
    const state = soloGame();
    const head = { ...state.snake[0]! };

    expect(state.phase).toBe('ready');
    expect(step(state, Math.random, 0)).toEqual([]);
    expect(state.snake[0]).toEqual(head);

    turn(state, DIRECTIONS.up);
    expect(state.phase).toBe('playing');
    step(state, Math.random, 0);
    expect(state.snake[0]).toEqual({ x: head.x, y: head.y - 1 });
  });

  it('starts heading right when the first turn points back into the body', () => {
    const state = soloGame();
    const head = { ...state.snake[0]! };

    turn(state, DIRECTIONS.left);
    step(state, Math.random, 0);

    expect(state.snake[0]).toEqual({ x: head.x + 1, y: head.y });
  });

  it('holds the snake still while paused', () => {
    const state = soloGame();
    start(state);
    togglePause(state);
    const head = { ...state.snake[0]! };

    expect(step(state, Math.random, 0)).toEqual([]);
    expect(state.snake[0]).toEqual(head);

    togglePause(state);
    expect(state.phase).toBe('playing');
  });
});

describe('moving', () => {
  it('ignores a turn straight back and keeps at most two turns queued', () => {
    const state = soloGame();
    start(state);
    turn(state, DIRECTIONS.left);
    expect(state.turns).toEqual([]);

    turn(state, DIRECTIONS.up);
    turn(state, DIRECTIONS.left);
    turn(state, DIRECTIONS.down);
    expect(state.turns).toEqual([DIRECTIONS.up, DIRECTIONS.left]);
  });

  it('ends the round at the wall and reports where', () => {
    const state = soloGame();
    start(state);
    state.snake = [{ x: 19, y: 5 }, { x: 18, y: 5 }, { x: 17, y: 5 }];

    expect(step(state, Math.random, 0)).toEqual([{ type: 'death', at: { x: 20, y: 5 } }]);
    expect(state.phase).toBe('over');
  });

  it('lets the head take the cell the tail is leaving', () => {
    const state = soloGame();
    start(state);
    state.snake = [
      { x: 5, y: 5 },
      { x: 5, y: 6 },
      { x: 4, y: 6 },
      { x: 4, y: 5 },
    ];
    state.direction = DIRECTIONS.left;

    step(state, Math.random, 0);
    expect(state.phase).toBe('playing');
  });

  it('speeds up gradually from 6.5 to 11 steps a second as the snake grows', () => {
    expect(stepMs(3)).toBeCloseTo(1000 / 6.5);
    expect(stepMs(10)).toBeCloseTo(1000 / 7.5);
    expect(stepMs(200)).toBeCloseTo(1000 / 11);
  });
});

describe('eating', () => {
  it('grows one cell for a bean and chains a combo inside the window', () => {
    const state = soloGame();
    start(state);
    const head = state.snake[0]!;
    state.food = { x: head.x + 1, y: head.y };

    const events = step(state, createRandom(1), 1000);
    expect(events).toEqual([{ type: 'bean', at: { x: head.x + 1, y: head.y }, combo: 1, gain: 1 }]);

    step(state, createRandom(1), 1100);
    expect(state.snake).toHaveLength(4);

    const next = state.snake[0]!;
    state.food = { x: next.x + 1, y: next.y };
    step(state, createRandom(1), 2000);
    expect(state.combo).toBe(2);
  });

  it('gives espresso four cells and two combo, and cold brew slows the rival', () => {
    const state = soloGame();
    start(state);
    const head = state.snake[0]!;
    state.special = { point: { x: head.x + 1, y: head.y }, kind: 'espresso', bornAt: 0, expiresAt: 9999 };

    expect(step(state, Math.random, 10)[0]).toMatchObject({ type: 'special', kind: 'espresso', combo: 2 });
    expect(state.growth).toBe(rules.espressoGrowth - 1);

    const next = state.snake[0]!;
    state.special = { point: { x: next.x + 1, y: next.y }, kind: 'coldbrew', bornAt: 0, expiresAt: 9999 };
    step(state, Math.random, 20);
    expect(state.cpu.slowUntil).toBe(20 + rules.cpuSlowMs);
  });

  it('lets a special cup go cold when nobody reaches it', () => {
    const state = soloGame();
    start(state);
    state.special = { point: { x: 0, y: 11 }, kind: 'espresso', bornAt: 0, expiresAt: 500 };

    step(state, Math.random, 600);
    expect(state.special).toBeNull();
  });

  it('spawns a special cup every third bean, espresso first', () => {
    const state = soloGame();
    start(state);
    state.foodsEaten = 2;
    const head = state.snake[0]!;
    state.food = { x: head.x + 1, y: head.y };

    step(state, createRandom(3), 0);
    expect(state.special?.kind).toBe('espresso');
  });
});

describe('the rival', () => {
  it('is knocked out when it runs into the player, leaving drops and three cells of growth', () => {
    const state = soloGame();
    start(state);
    // The player wraps over the rival's head: above it, and on both sides.
    state.snake = [
      { x: 5, y: 6 },
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
      { x: 3, y: 6 },
      { x: 3, y: 7 },
    ];
    state.direction = DIRECTIONS.down;
    state.cpu = {
      body: [{ x: 4, y: 6 }, { x: 4, y: 7 }, { x: 4, y: 8 }],
      direction: DIRECTIONS.up,
      growth: 0,
      alive: true,
      respawnAt: 0,
      slowUntil: 0,
      stepParity: 0,
      best: 3,
    };

    const events = step(state, () => 0.99, 100);

    expect(events.map((event) => event.type)).toContain('ko');
    expect(state.kos).toBe(1);
    expect(state.cpu.alive).toBe(false);
    expect(state.drops.length).toBeGreaterThan(0);
  });

  it('remembers its longest length across a respawn', () => {
    const state = soloGame();
    start(state);
    state.cpu.best = 9;
    state.cpu.respawnAt = 0;

    step(state, createRandom(5), 10);
    expect(state.cpu.alive).toBe(true);
    expect(state.cpu.best).toBe(9);
  });
});

describe('barista card draft and survival blends', () => {
  it('opens a three-card draft on progressive bean milestones (4, then +5 = 9)', () => {
    const state = soloGame();
    start(state);
    state.foodsEaten = 3;
    const head = state.snake[0]!;
    state.food = { x: head.x + 1, y: head.y };

    const events = step(state, createRandom(9), 100);
    expect(events.some((event) => event.type === 'draft')).toBe(true);
    expect(state.draft).toHaveLength(3);
    expect(state.lastDraftAt).toBe(4);
    expect(state.nextDraftAt).toBe(9);

    const chosen = state.draft![0]!;
    expect(pickCard(state, chosen, 100, createRandom(9))).toBe(true);
    expect(state.draft).toBeNull();
    expect(state.cards[chosen]).toBe(1);
    expect(state.graceUntil).toBeGreaterThan(100);
  });

  it('compresses body with Ristretto while boosting peakLength and dropping crema', () => {
    const state = soloGame();
    start(state);
    state.snake = [
      { x: 10, y: 5 },
      { x: 9, y: 5 },
      { x: 8, y: 5 },
      { x: 7, y: 5 },
      { x: 6, y: 5 },
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
    ];
    state.peakLength = 8;

    pickCard(state, 'ristretto', 500, createRandom(2));
    expect(state.snake).toHaveLength(6);
    expect(state.peakLength).toBe(11);
    expect(state.drops.length).toBeGreaterThan(0);
  });

  it('lets the head cut through ghost tail cells with Paper Filter instead of dying', () => {
    const state = soloGame();
    start(state);
    pickCard(state, 'paper-filter', 0);
    // A loop of 8 segments where the head is about to step onto index 6 (within the last 4 tail cells).
    state.snake = [
      { x: 5, y: 5 },
      { x: 5, y: 4 },
      { x: 6, y: 4 },
      { x: 6, y: 5 },
      { x: 6, y: 6 },
      { x: 5, y: 6 },
      { x: 4, y: 5 },
      { x: 4, y: 6 },
    ];
    state.direction = DIRECTIONS.left;
    expect(ghostTailCount(state)).toBe(4);

    const events = step(state, createRandom(4), 3000);
    expect(state.phase).toBe('playing');
    expect(events.some((event) => event.type === 'tail-cut')).toBe(true);
    expect(state.snake.length).toBeLessThan(8);
  });

  it('auto-turns along a wall when Crema Rim is ready', () => {
    const state = soloGame();
    start(state);
    pickCard(state, 'crema-rim', 0);
    state.snake = [{ x: 19, y: 5 }, { x: 18, y: 5 }, { x: 17, y: 5 }];
    state.direction = DIRECTIONS.right;

    const events = step(state, createRandom(5), 7000);
    expect(state.phase).toBe('playing');
    expect(events.some((event) => event.type === 'wall-turn')).toBe(true);
    expect(state.snake[0]!.x).toBe(19);
    expect(state.snake[0]!.y).not.toBe(5);
  });

  it('survives a fatal crash with Velvet Foam shield and recharges after eating beans', () => {
    const state = soloGame();
    start(state);
    pickCard(state, 'velvet-foam', 0);
    expect(state.shield).toBe(true);

    // Trap against the top-right corner with no Crema Rim.
    state.snake = [
      { x: 19, y: 0 },
      { x: 18, y: 0 },
      { x: 17, y: 0 },
      { x: 16, y: 0 },
      { x: 15, y: 0 },
      { x: 14, y: 0 },
    ];
    state.direction = DIRECTIONS.right;

    const events = step(state, createRandom(6), 1000);
    expect(state.phase).toBe('playing');
    expect(state.shield).toBe(false);
    expect(events.some((event) => event.type === 'shield-break')).toBe(true);
    expect(state.snake).toHaveLength(3);
  });

  it('pulls adjacent beans and drops with Affogato Pull and spawns extra beans with Double Shot', () => {
    const state = soloGame();
    start(state);
    pickCard(state, 'affogato-pull', 0);
    pickCard(state, 'double-shot', 0, createRandom(8));

    expect(state.extraFoods).toHaveLength(1);

    const head = state.snake[0]!;
    // Place a drop one cell above the next head position (within Manhattan range 1).
    state.drops = [{ x: head.x + 1, y: head.y - 1 }];
    const events = step(state, createRandom(8), 2000);
    expect(events.some((event) => event.type === 'drop')).toBe(true);
    expect(state.drops).toHaveLength(0);
  });
});

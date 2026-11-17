import { describe, expect, it } from 'vitest';
import {
  CARDS,
  DIRECTIONS,
  UPGRADEABLE_CARD_IDS,
  beanGrowth,
  createGame,
  createRandom,
  drawDraftCards,
  fitGrid,
  ghostTailCount,
  pickCard,
  resume,
  rules,
  step,
  stepIntervalMs,
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
  state.foods = [{ x: 0, y: 0 }];
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

  it('holds the snake still while paused and grants soft-start grace on resume', () => {
    const state = soloGame();
    start(state);
    togglePause(state);
    const head = { ...state.snake[0]! };

    expect(step(state, Math.random, 0)).toEqual([]);
    expect(state.snake[0]).toEqual(head);

    resume(state, 500);
    expect(state.phase).toBe('playing');
    expect(state.graceUntil).toBe(500 + rules.graceMs);
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

  it('speeds up from 6.5 to 11.5 steps a second (+1 every 8 cells, capped at length 43)', () => {
    expect(stepMs(3)).toBeCloseTo(1000 / 6.5);
    expect(stepMs(11)).toBeCloseTo(1000 / 7.5);
    expect(stepMs(43)).toBeCloseTo(1000 / 11.5);
    expect(stepMs(200)).toBeCloseTo(1000 / 11.5);
  });
});

describe('eating', () => {
  it('grows one cell for a bean and chains a combo inside the window', () => {
    const state = soloGame();
    start(state);
    const head = state.snake[0]!;
    state.foods = [{ x: head.x + 1, y: head.y }];

    const events = step(state, createRandom(1), 1000);
    expect(events).toEqual([{ type: 'bean', at: { x: head.x + 1, y: head.y }, combo: 1 }]);
    expect(state.snake).toHaveLength(4);

    const next = state.snake[0]!;
    state.foods = [{ x: next.x + 1, y: next.y }];
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
    state.nextSpecialAt = 3;
    const head = state.snake[0]!;
    state.foods = [{ x: head.x + 1, y: head.y }];

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

  it('grows by only 1 cell when eating a bean, matching rules.beanGrowth', () => {
    const state = soloGame();
    start(state);
    state.snake = [{ x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 }];
    state.direction = DIRECTIONS.down;
    state.cpu = {
      body: [{ x: 10, y: 5 }, { x: 9, y: 5 }, { x: 8, y: 5 }],
      direction: DIRECTIONS.right,
      growth: 0,
      alive: true,
      respawnAt: 0,
      slowUntil: 0,
      stepParity: 0,
      best: 3,
    };
    state.foods = [{ x: 11, y: 5 }];

    step(state, () => 0.5, 100);
    expect(state.cpu.body).toHaveLength(4);
    expect(state.cpu.growth).toBe(0);

    // Next step without food should not grow further.
    step(state, () => 0.5, 200);
    expect(state.cpu.body).toHaveLength(4);
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

describe('barista card draft and v2 mechanics', () => {
  it('triggers draft on progressive milestones (4, 9, 15, 22, 30), advances draftIndex, and pauses step() while in draft phase', () => {
    const state = createGame(160, 12, createRandom(9));
    state.cpu.alive = false;
    state.cpu.body = [];
    state.cpu.respawnAt = Number.POSITIVE_INFINITY;
    start(state);

    const openedAt: number[] = [];
    const seenDraftIndices: number[] = [];
    const rng = createRandom(9);

    for (let bean = 1; bean <= 30; bean += 1) {
      const head = state.snake[0]!;
      state.foods = [{ x: head.x + 1, y: head.y }];
      step(state, rng, bean * 100);

      if (state.phase === 'draft') {
        openedAt.push(state.foodsEaten);
        seenDraftIndices.push(state.draftIndex);

        // Calling step() while phase === 'draft' must do nothing and must not auto-pick.
        const frozenHead = { ...state.snake[0]! };
        expect(step(state, rng, bean * 100 + 50)).toEqual([]);
        expect(state.phase).toBe('draft');
        expect(state.snake[0]).toEqual(frozenHead);

        const chosen = state.draft![0]!;
        expect(pickCard(state, chosen, bean * 100 + 50, rng)).toBe(true);
        expect(state.phase).toBe('playing');
        expect(state.draft).toBeNull();
      }
    }

    expect(openedAt).toEqual([4, 9, 15, 22, 30]);
    expect(seenDraftIndices).toEqual([0, 1, 2, 3, 4]);
    expect(state.draftIndex).toBe(5);
    expect(state.nextDraftAt).toBe(38);
  });

  it('queues pendingDrafts when multiple milestones are crossed in one step and opens them back-to-back', () => {
    const state = soloGame();
    start(state);
    pickCard(state, 'affogato-pull', 0);
    pickCard(state, 'double-shot', 0, createRandom(2));
    // Set foodsEaten = 8 so eating 2 beans in one step crosses both 4 and 9 if nextDraftAt starts at 4.
    state.foodsEaten = 3;
    state.nextDraftAt = 4;
    state.draftIndex = 0;
    const head = state.snake[0]!;
    // Put one bean right ahead and another adjacent so Affogato Pull grabs six beans? Let's place 6 beans in 3x3!
    state.foods = [
      { x: head.x + 1, y: head.y },
      { x: head.x + 1, y: head.y - 1 },
      { x: head.x + 1, y: head.y + 1 },
      { x: head.x + 2, y: head.y - 1 },
      { x: head.x + 2, y: head.y },
      { x: head.x + 2, y: head.y + 1 },
    ];

    step(state, createRandom(12), 100);
    expect(state.foodsEaten).toBe(9);
    expect(state.phase).toBe('draft');
    expect(state.pendingDrafts).toBe(1);
    expect(state.nextDraftAt).toBe(15);

    // Picking the first card immediately opens the queued second draft.
    pickCard(state, state.draft![0]!, 100, createRandom(12));
    expect(state.phase).toBe('draft');
    expect(state.pendingDrafts).toBe(0);
    expect(state.draft).toHaveLength(3);

    // Picking the second card resumes play.
    pickCard(state, state.draft![0]!, 100, createRandom(12));
    expect(state.phase).toBe('playing');
  });

  it('guarantees one card per category on the first draft, respects minLength, fills with House Blend, and stops when maxed', () => {
    const state = soloGame();
    // At length 3, only crema-rim is eligible in roast (ristretto needs 15, paper-filter needs 8).
    const firstChoices = drawDraftCards(state, createRandom(4));
    expect(firstChoices).toHaveLength(3);
    expect(firstChoices[0]).toBe('crema-rim');
    expect(CARDS[firstChoices[1]!].category).toBe('ice');
    expect(CARDS[firstChoices[2]!].category).toBe('crema');

    // When only 1 upgradeable card remains below max level, the other two slots are filled by house-blend.
    for (const id of UPGRADEABLE_CARD_IDS) {
      state.cards[id] = 3;
    }
    state.cards['decaf-pace'] = 2;
    state.draftIndex = 3;
    const fallbackChoices = drawDraftCards(state, createRandom(4));
    expect(fallbackChoices).toEqual(['decaf-pace', 'house-blend', 'house-blend']);

    // When all 8 cards are at Lv.3, drafts close with nextDraftAt = Infinity.
    pickCard(state, 'decaf-pace', 100);
    expect(state.nextDraftAt).toBe(Number.POSITIVE_INFINITY);
    expect(drawDraftCards(state, createRandom(4))).toEqual([]);
  });

  it('compresses body with Ristretto, drops floor(cut / 3) up to 4, and boosts peakLength by +3', () => {
    const state = soloGame();
    start(state);
    // 40 segments laid out across rows.
    state.snake = Array.from({ length: 40 }, (_, i) => ({ x: i % 20, y: Math.floor(i / 20) }));
    state.peakLength = 40;
    state.drops = [];

    pickCard(state, 'ristretto', 500, createRandom(2));
    // 25% of 40 = 10 removed -> 30 remaining, floor(10 / 3) = 3 drops, peakLength = 43.
    expect(state.snake).toHaveLength(30);
    expect(state.drops).toHaveLength(3);
    expect(state.peakLength).toBe(43);
  });

  it('cuts ghost tail with Paper Filter leaving at most 1 drop, enforces 2s cooldown, and matches render boundary', () => {
    const state = soloGame();
    start(state);
    pickCard(state, 'paper-filter', 0);
    // 8 segments: ghostTailCount is 4 (indices 4, 5, 6, 7).
    state.snake = [
      { x: 5, y: 5 },
      { x: 5, y: 4 },
      { x: 6, y: 4 },
      { x: 6, y: 5 },
      { x: 6, y: 6 },
      { x: 5, y: 6 },
      { x: 4, y: 5 }, // index 6: head will step left onto (4, 5)
      { x: 4, y: 6 }, // index 7: tail tip
    ];
    state.direction = DIRECTIONS.left;
    expect(ghostTailCount(state)).toBe(4);

    const events = step(state, createRandom(4), 3000);
    expect(state.phase).toBe('playing');
    expect(events.some((event) => event.type === 'tail-cut')).toBe(true);
    // Cut 2 segments (6 and 7), leaving at most 1 drop (no infinite farming).
    expect(state.drops).toHaveLength(1);
    expect(state.snake).toHaveLength(7);

    // During the 2000ms cooldown, hitting a tail segment is fatal.
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
    step(state, createRandom(4), 4000);
    expect(state.phase).toBe('over');
  });

  it('auto-turns toward the side with more flood-fill room when Crema Rim triggers', () => {
    const state = soloGame();
    start(state);
    pickCard(state, 'crema-rim', 0);
    // Head at (19, 2) heading right into wall: up has only 2 rows (y=1,0), down has 9 rows (y=3..11).
    state.snake = [{ x: 19, y: 2 }, { x: 18, y: 2 }, { x: 17, y: 2 }];
    state.direction = DIRECTIONS.right;

    const events = step(state, createRandom(5), 7000);
    expect(state.phase).toBe('playing');
    expect(events.some((event) => event.type === 'wall-turn')).toBe(true);
    expect(state.direction).toEqual(DIRECTIONS.down);
    expect(state.snake[0]).toEqual({ x: 19, y: 3 });
  });

  it('stalls in place on Velvet Foam shield break without diagonal direction corruption and prioritizes Crema Rim first', () => {
    const state = soloGame();
    start(state);
    pickCard(state, 'velvet-foam', 0);
    pickCard(state, 'crema-rim', 0);

    // 1. Hitting a wall when Crema Rim is ready uses Crema Rim first and keeps the shield intact.
    state.snake = [
      { x: 10, y: 0 },
      { x: 10, y: 1 },
      { x: 10, y: 2 },
      { x: 10, y: 3 },
      { x: 10, y: 4 },
      { x: 10, y: 5 },
      { x: 10, y: 6 },
    ];
    state.direction = DIRECTIONS.up;
    step(state, createRandom(6), 1000);
    expect(state.shield).toBe(true);

    // 2. Now Crema Rim is on cooldown; heading vertically into the wall triggers Velvet Foam stall.
    state.snake = [
      { x: 10, y: 0 },
      { x: 10, y: 1 },
      { x: 10, y: 2 },
      { x: 10, y: 3 },
      { x: 10, y: 4 },
      { x: 10, y: 5 },
      { x: 10, y: 6 },
    ];
    state.direction = DIRECTIONS.up;
    const breakEvents = step(state, createRandom(6), 1200);
    expect(breakEvents.some((event) => event.type === 'shield-break')).toBe(true);
    expect(state.phase).toBe('playing');
    expect(state.shield).toBe(false);
    // Spent 3 tail cells from 7 -> 4.
    expect(state.snake).toHaveLength(4);
    // Direction stays cardinal (never diagonal {x: 1, y: 1}!).
    expect(Math.abs(state.direction.x) + Math.abs(state.direction.y)).toBe(1);
    expect(state.stallUntil).toBe(1200 + rules.stallMs);

    // While stalled with no input, head stays still.
    const stalledHead = { ...state.snake[0]! };
    step(state, createRandom(6), 1400);
    expect(state.snake[0]).toEqual(stalledHead);

    // Steering releases the stall immediately on the next step.
    turn(state, DIRECTIONS.left);
    step(state, createRandom(6), 1500);
    expect(state.snake[0]).toEqual({ x: 9, y: 0 });
  });

  it('applies Cold Infusion level scaling to player chill, special cadence, and cold brew ratio', () => {
    const state = soloGame();
    start(state);
    state.nextDraftAt = 99;
    pickCard(state, 'cold-infusion', 0); // Lv.1: 1 espresso : 2 coldbrew
    state.foodsEaten = 2;
    state.nextSpecialAt = 3;
    const head = state.snake[0]!;
    state.foods = [{ x: head.x + 1, y: head.y }];

    step(state, createRandom(7), 100);
    expect(state.special?.kind).toBe('espresso');
    state.special = null;

    // Second special with Cold Infusion Lv.1 is coldbrew, and third is also coldbrew.
    state.foodsEaten = 5;
    state.nextSpecialAt = 6;
    state.foods = [{ x: state.snake[0]!.x + 1, y: state.snake[0]!.y }];
    step(state, createRandom(7), 200);
    expect(state.special).toMatchObject({ kind: 'coldbrew' });

    // Upgrade to Lv.2 (period becomes 2 beans) and Lv.3 (7.5s player chill, 5.5s rival slow).
    pickCard(state, 'cold-infusion', 200);
    pickCard(state, 'cold-infusion', 200);
    state.special = {
      point: { x: state.snake[0]!.x + 1, y: state.snake[0]!.y },
      kind: 'coldbrew',
      bornAt: 200,
      expiresAt: 9999,
    };
    step(state, createRandom(7), 300);
    expect(state.playerSlowUntil).toBe(300 + 7500);
    expect(state.cpu.slowUntil).toBe(300 + 5500);

    // Eating 3 beans in one step with period 2 (foodsEaten 2 -> 5, nextSpecialAt 3) must not skip the 5th-bean special.
    pickCard(state, 'affogato-pull', 300);
    state.special = null;
    state.foodsEaten = 2;
    state.nextSpecialAt = 3;
    state.specialsSpawned = 0;
    const h2 = state.snake[0]!;
    state.foods = [
      { x: h2.x + 1, y: h2.y },
      { x: h2.x + 1, y: h2.y - 1 },
      { x: h2.x + 1, y: h2.y + 1 },
    ];
    step(state, createRandom(7), 400);
    expect(state.foodsEaten).toBe(5);
    expect(state.specialsSpawned).toBe(1);
    expect(state.nextSpecialAt).toBe(5);
    expect(state.special).not.toBeNull();

    // Once the first special is cleared, the next step immediately spawns the queued 5th-bean special.
    state.special = null;
    step(state, createRandom(7), 500);
    expect(state.specialsSpawned).toBe(2);
    expect(state.nextSpecialAt).toBe(7);
    expect(state.special).not.toBeNull();
  });

  it('reduces effective speed tier with Decaf Pace without altering bean growth', () => {
    const state = soloGame();
    start(state);
    state.snake = Array.from({ length: 19 }, (_, i) => ({ x: 19 - i, y: 5 }));
    state.graceUntil = 0;

    // At length 19, normal speed is 6.5 + 2 = 8.5 steps/s.
    expect(stepIntervalMs(state, 5000)).toBeCloseTo(1000 / 8.5);

    pickCard(state, 'decaf-pace', 0);
    state.graceUntil = 0;
    // Lv.1 subtracts 8 cells -> effective length 11 -> 7.5 steps/s, and beanGrowth stays 1.
    expect(stepIntervalMs(state, 5000)).toBeCloseTo(1000 / 7.5);
    expect(beanGrowth(1)).toBe(1);
  });

  it('pulls beans and drops with Affogato Pull (3x3 at Lv.1) while ignoring special cups', () => {
    const state = soloGame();
    start(state);
    pickCard(state, 'affogato-pull', 0);
    pickCard(state, 'double-shot', 0, createRandom(8));

    expect(state.foods).toHaveLength(2);

    const head = state.snake[0]!;
    // Diagonal cell (head.x + 2, head.y + 1) is in 3x3 around nextHead (head.x + 1, head.y).
    state.drops = [{ x: head.x + 2, y: head.y + 1 }];
    state.special = {
      point: { x: head.x + 2, y: head.y - 1 },
      kind: 'espresso',
      bornAt: 0,
      expiresAt: 9999,
    };

    const events = step(state, createRandom(8), 2000);
    expect(events.some((event) => event.type === 'drop')).toBe(true);
    expect(state.drops).toHaveLength(0);
    // Special cup in 3x3 must not be pulled by magnet.
    expect(state.special).not.toBeNull();
  });
});

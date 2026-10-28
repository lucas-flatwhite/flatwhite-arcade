/**
 * The rules of Snake with no DOM and no clock of its own: every function takes the
 * world time it should act at, so a test can play a whole round step by step.
 */

export type Point = { x: number; y: number };
export type Direction = Point;
export type Phase = 'ready' | 'playing' | 'paused' | 'over';
export type SpecialKind = 'espresso' | 'coldbrew';

export const rules = {
  /** The short side of the board always holds this many cells, so a phone and a desktop play the same game. */
  shortSideCells: 18,
  minCellPx: 18,
  maxCellPx: 56,
  boardMarginPx: 8,
  baseSpeed: 7,
  maxSpeed: 12,
  speedRampEvery: 4,
  beanGrowth: 2,
  dropGrowth: 2,
  espressoGrowth: 4,
  coldbrewGrowth: 2,
  maxComboBonus: 2,
  comboWindowMs: 4200,
  specialSpawnEvery: 3,
  specialDurationMs: 7500,
  cpuRespawnMs: 2600,
  cpuSlowMs: 4000,
  cpuKoGrowth: 3,
  cpuWanderChance: 0.12,
  maxQueuedTurns: 2,
} as const;

export const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
} as const satisfies Record<string, Direction>;

export type Grid = {
  cols: number;
  rows: number;
  cell: number;
  /** Where the board's top-left corner sits inside the field, in CSS pixels. */
  x: number;
  y: number;
};

export type Special = {
  point: Point;
  kind: SpecialKind;
  bornAt: number;
  expiresAt: number;
};

export type Cpu = {
  body: Point[];
  direction: Direction;
  growth: number;
  alive: boolean;
  respawnAt: number;
  slowUntil: number;
  stepParity: number;
  /** The longest the rival grew this round. A respawn starts it over at three, so the duel reads this. */
  best: number;
};

export type GameState = {
  cols: number;
  rows: number;
  phase: Phase;
  snake: Point[];
  direction: Direction;
  turns: Direction[];
  growth: number;
  food: Point;
  special: Special | null;
  drops: Point[];
  foodsEaten: number;
  combo: number;
  maxCombo: number;
  comboExpiresAt: number;
  kos: number;
  cpu: Cpu;
  deathAt: Point | null;
};

export type GameEvent =
  | { type: 'bean'; at: Point; combo: number }
  | { type: 'special'; at: Point; kind: SpecialKind; combo: number }
  | { type: 'drop'; at: Point; combo: number }
  | { type: 'ko'; at: Point; combo: number }
  | { type: 'cpu-ate'; at: Point }
  | { type: 'death'; at: Point };

export function createRandom(seed: number): () => number {
  let value = seed >>> 0;

  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function fitGrid(width: number, height: number): Grid {
  const usableWidth = Math.max(0, width - rules.boardMarginPx * 2);
  const usableHeight = Math.max(0, height - rules.boardMarginPx * 2);
  const cell = Math.min(
    rules.maxCellPx,
    Math.max(rules.minCellPx, Math.floor(Math.min(usableWidth, usableHeight) / rules.shortSideCells)),
  );
  const cols = Math.max(10, Math.floor(usableWidth / cell));
  const rows = Math.max(10, Math.floor(usableHeight / cell));

  return {
    cols,
    rows,
    cell,
    x: Math.floor((width - cols * cell) / 2),
    y: Math.floor((height - rows * cell) / 2),
  };
}

/**
 * Fits a board that is already in play into a new field size, keeping its cells. Used
 * when a phone's URL bar or a rotation resizes the field mid-round.
 */
export function refitGrid(width: number, height: number, cols: number, rows: number): Grid {
  const cell = Math.max(
    1,
    Math.floor(
      Math.min((width - rules.boardMarginPx * 2) / cols, (height - rules.boardMarginPx * 2) / rows),
    ),
  );

  return {
    cols,
    rows,
    cell,
    x: Math.floor((width - cols * cell) / 2),
    y: Math.floor((height - rows * cell) / 2),
  };
}

/** How long one step lasts at this length: 7 steps a second, one faster every 4 cells, up to 12. */
export function stepMs(length: number): number {
  const speed = Math.min(
    rules.maxSpeed,
    rules.baseSpeed + Math.floor(Math.max(0, length - 3) / rules.speedRampEvery),
  );

  return 1000 / speed;
}

export function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

function isReverse(next: Direction, current: Direction): boolean {
  return next.x === -current.x && next.y === -current.y;
}

function inside(state: { cols: number; rows: number }, point: Point): boolean {
  return point.x >= 0 && point.y >= 0 && point.x < state.cols && point.y < state.rows;
}

function occupied(state: GameState): Point[] {
  const cells = [...state.snake, ...state.cpu.body, state.food, ...state.drops];

  if (state.special) {
    cells.push(state.special.point);
  }

  return cells;
}

export function pickFreeCell(
  cols: number,
  rows: number,
  taken: readonly Point[],
  random: () => number,
): Point {
  const blocked = new Set(taken.map((point) => point.y * cols + point.x));

  for (let attempt = 0; attempt < 64; attempt += 1) {
    const x = Math.floor(random() * cols);
    const y = Math.floor(random() * rows);

    if (!blocked.has(y * cols + x)) {
      return { x, y };
    }
  }

  const free: Point[] = [];

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (!blocked.has(y * cols + x)) {
        free.push({ x, y });
      }
    }
  }

  return free[Math.floor(random() * free.length)] ?? { x: 0, y: 0 };
}

function createCpu(cols: number, rows: number, taken: readonly Point[], random: () => number): Cpu {
  const base = { growth: 0, alive: true, respawnAt: 0, slowUntil: 0, stepParity: 0 };

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const head = pickFreeCell(cols, rows, taken, random);
    const direction = head.x > cols / 2 ? DIRECTIONS.left : DIRECTIONS.right;
    const body = [0, 1, 2].map((index) => ({ x: head.x - direction.x * index, y: head.y }));
    const valid = body.every(
      (segment) =>
        inside({ cols, rows }, segment) && !taken.some((point) => samePoint(point, segment)),
    );

    if (valid) {
      return { ...base, body, direction, best: body.length };
    }
  }

  return { ...base, body: [pickFreeCell(cols, rows, taken, random)], direction: DIRECTIONS.left, best: 1 };
}

export function createGame(cols: number, rows: number, random: () => number): GameState {
  const startX = Math.floor(cols / 3);
  const startY = Math.floor(rows / 2);
  const snake = [0, 1, 2].map((index) => ({ x: startX - index, y: startY }));
  const cpu = createCpu(cols, rows, snake, random);

  return {
    cols,
    rows,
    phase: 'ready',
    snake,
    direction: DIRECTIONS.right,
    turns: [],
    growth: 0,
    food: pickFreeCell(cols, rows, [...snake, ...cpu.body], random),
    special: null,
    drops: [],
    foodsEaten: 0,
    combo: 0,
    maxCombo: 0,
    comboExpiresAt: 0,
    kos: 0,
    cpu,
    deathAt: null,
  };
}

/**
 * Queues a turn. On the ready screen any direction starts the round; a turn straight
 * back into the body just starts it heading the way the snake already faces.
 */
export function turn(state: GameState, next: Direction): void {
  if (state.phase === 'ready') {
    state.phase = 'playing';
  }

  if (state.phase !== 'playing' || state.turns.length >= rules.maxQueuedTurns) {
    return;
  }

  const reference = state.turns[state.turns.length - 1] ?? state.direction;

  if (!samePoint(next, reference) && !isReverse(next, reference)) {
    state.turns.push(next);
  }
}

export function togglePause(state: GameState): void {
  if (state.phase === 'playing') {
    state.phase = 'paused';
  } else if (state.phase === 'paused') {
    state.phase = 'playing';
  } else if (state.phase === 'ready') {
    state.phase = 'playing';
  }
}

/** A bean grows the snake two cells, plus one more for every two links of combo, up to two more. */
export function beanGrowth(combo: number): number {
  return rules.beanGrowth + Math.min(rules.maxComboBonus, Math.floor(combo / 2));
}

function bumpCombo(state: GameState, now: number, by = 1): void {
  const alive = state.combo > 0 && now <= state.comboExpiresAt;
  state.combo = (alive ? state.combo : 0) + by;
  state.comboExpiresAt = now + rules.comboWindowMs;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
}

function chooseCpuDirection(state: GameState, random: () => number): Direction {
  const cpu = state.cpu;
  const head = cpu.body[0]!;
  const open = Object.values(DIRECTIONS).filter((direction) => {
    const next = { x: head.x + direction.x, y: head.y + direction.y };
    return !isReverse(direction, cpu.direction) && !isBlockedForCpu(state, next);
  });

  if (open.length === 0) {
    return cpu.direction;
  }

  if (random() < rules.cpuWanderChance) {
    return open[Math.floor(random() * open.length)]!;
  }

  const target = state.special ? state.special.point : state.food;
  let best = open[0]!;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const direction of open) {
    const distance =
      Math.abs(head.x + direction.x - target.x) + Math.abs(head.y + direction.y - target.y);
    const score = distance + random() * 0.8;

    if (score < bestScore) {
      bestScore = score;
      best = direction;
    }
  }

  return best;
}

function isBlockedForCpu(state: GameState, point: Point): boolean {
  return (
    !inside(state, point) ||
    state.snake.some((segment) => samePoint(segment, point)) ||
    state.cpu.body.some((segment) => samePoint(segment, point))
  );
}

function stepCpu(state: GameState, random: () => number, now: number, events: GameEvent[]): void {
  const cpu = state.cpu;

  if (!cpu.alive) {
    if (now >= cpu.respawnAt) {
      const best = cpu.best;
      state.cpu = createCpu(state.cols, state.rows, [...state.snake, state.food, ...state.drops], random);
      state.cpu.best = Math.max(best, state.cpu.best);
    }

    return;
  }

  // A chilled rival moves every other step.
  if (now < cpu.slowUntil) {
    cpu.stepParity = (cpu.stepParity + 1) % 2;

    if (cpu.stepParity === 1) {
      return;
    }
  } else {
    cpu.stepParity = 0;
  }

  cpu.direction = chooseCpuDirection(state, random);

  const head = cpu.body[0]!;
  const next = { x: head.x + cpu.direction.x, y: head.y + cpu.direction.y };

  if (isBlockedForCpu(state, next)) {
    const trappedByPlayer = state.snake.some((segment) => samePoint(segment, next));
    const remains = cpu.body.slice(0, 3);

    cpu.alive = false;
    cpu.respawnAt = now + rules.cpuRespawnMs;
    cpu.body = [];

    if (trappedByPlayer) {
      state.kos += 1;
      state.growth += rules.cpuKoGrowth;
      bumpCombo(state, now);

      for (const drop of remains) {
        const taken =
          state.snake.some((segment) => samePoint(segment, drop)) ||
          samePoint(state.food, drop) ||
          state.drops.some((existing) => samePoint(existing, drop));

        if (!taken) {
          state.drops.push({ ...drop });
        }
      }

      events.push({ type: 'ko', at: head, combo: state.combo });
    }

    return;
  }

  cpu.body.unshift(next);

  if (samePoint(next, state.food)) {
    cpu.growth += rules.beanGrowth;
    state.food = pickFreeCell(state.cols, state.rows, occupied(state), random);
    events.push({ type: 'cpu-ate', at: next });
  } else if (state.special && samePoint(next, state.special.point)) {
    cpu.growth += 3;
    state.special = null;
    events.push({ type: 'cpu-ate', at: next });
  }

  if (cpu.growth > 0) {
    cpu.growth -= 1;
  } else {
    cpu.body.pop();
  }

  cpu.best = Math.max(cpu.best, cpu.body.length);
}

/** Advances the round by one step and reports what happened, for the renderer to answer. */
export function step(state: GameState, random: () => number, now: number): GameEvent[] {
  const events: GameEvent[] = [];

  if (state.phase !== 'playing') {
    return events;
  }

  if (state.special && now >= state.special.expiresAt) {
    state.special = null;
  }

  if (state.combo > 0 && now > state.comboExpiresAt) {
    state.combo = 0;
  }

  const next = state.turns.shift();

  if (next) {
    state.direction = next;
  }

  const head = state.snake[0]!;
  const nextHead = { x: head.x + state.direction.x, y: head.y + state.direction.y };
  // The tail leaves its cell on this same step unless the snake is growing.
  const body = state.growth > 0 ? state.snake : state.snake.slice(0, -1);

  if (
    !inside(state, nextHead) ||
    body.some((segment) => samePoint(segment, nextHead)) ||
    (state.cpu.alive && state.cpu.body.some((segment) => samePoint(segment, nextHead)))
  ) {
    state.phase = 'over';
    state.deathAt = nextHead;
    events.push({ type: 'death', at: nextHead });
    return events;
  }

  state.snake.unshift(nextHead);

  if (samePoint(nextHead, state.food)) {
    bumpCombo(state, now);
    state.growth += beanGrowth(state.combo);
    state.foodsEaten += 1;
    state.food = pickFreeCell(state.cols, state.rows, occupied(state), random);
    events.push({ type: 'bean', at: nextHead, combo: state.combo });

    if (state.foodsEaten % rules.specialSpawnEvery === 0 && !state.special) {
      const kind: SpecialKind =
        (state.foodsEaten / rules.specialSpawnEvery) % 2 === 1 ? 'espresso' : 'coldbrew';
      state.special = {
        point: pickFreeCell(state.cols, state.rows, occupied(state), random),
        kind,
        bornAt: now,
        expiresAt: now + rules.specialDurationMs,
      };
    }
  } else if (state.special && samePoint(nextHead, state.special.point)) {
    const kind = state.special.kind;
    state.special = null;

    if (kind === 'espresso') {
      state.growth += rules.espressoGrowth;
      bumpCombo(state, now, 2);
    } else {
      state.growth += rules.coldbrewGrowth;
      bumpCombo(state, now);
      state.cpu.slowUntil = now + rules.cpuSlowMs;
    }

    events.push({ type: 'special', at: nextHead, kind, combo: state.combo });
  } else {
    const dropIndex = state.drops.findIndex((drop) => samePoint(drop, nextHead));

    if (dropIndex !== -1) {
      state.drops.splice(dropIndex, 1);
      state.growth += rules.dropGrowth;
      bumpCombo(state, now);
      events.push({ type: 'drop', at: nextHead, combo: state.combo });
    }
  }

  if (state.growth > 0) {
    state.growth -= 1;
  } else {
    state.snake.pop();
  }

  stepCpu(state, random, now, events);
  return events;
}

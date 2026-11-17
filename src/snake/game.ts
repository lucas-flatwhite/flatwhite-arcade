/**
 * The rules of Snake with no DOM and no clock of its own: every function takes the
 * world time it should act at, so a test can play a whole round step by step.
 */

export type Point = { x: number; y: number };
export type Direction = Point;
export type Phase = 'ready' | 'playing' | 'draft' | 'paused' | 'over';
export type SpecialKind = 'espresso' | 'coldbrew';
export type CardCategory = 'roast' | 'ice' | 'crema' | 'blend';
export type CardId =
  | 'ristretto'
  | 'paper-filter'
  | 'crema-rim'
  | 'velvet-foam'
  | 'cold-infusion'
  | 'decaf-pace'
  | 'affogato-pull'
  | 'double-shot'
  | 'house-blend';

export type UpgradeableCardId = Exclude<CardId, 'house-blend'>;

export type CardDef = {
  id: CardId;
  title: string;
  category: CardCategory;
  tag: string;
  maxLevel: number;
  minLength: number;
  descriptions: readonly [string, string, string];
};

export const UPGRADEABLE_CARD_IDS: readonly UpgradeableCardId[] = [
  'ristretto',
  'paper-filter',
  'crema-rim',
  'velvet-foam',
  'cold-infusion',
  'decaf-pace',
  'affogato-pull',
  'double-shot',
] as const;

export const CARD_IDS: readonly CardId[] = [...UPGRADEABLE_CARD_IDS, 'house-blend'] as const;

export const CARDS: Record<CardId, CardDef> = {
  ristretto: {
    id: 'ristretto',
    title: 'Ristretto',
    category: 'roast',
    tag: 'Body',
    maxLevel: 3,
    minLength: 15,
    descriptions: [
      'Compress body by 25% into crema drops, peak +3',
      'Compress body by 30% into crema drops, peak +3',
      'Compress body by 35% into crema drops, peak +3',
    ],
  },
  'paper-filter': {
    id: 'paper-filter',
    title: 'Paper Filter',
    category: 'roast',
    tag: 'Tail',
    maxLevel: 3,
    minLength: 8,
    descriptions: [
      'Last 4 tail cells become ghost: cross to cut and leave 1 drop',
      'Last 7 tail cells become ghost: cross to cut and leave 1 drop',
      'Last 10 tail cells become ghost: cross to cut and leave 1 drop',
    ],
  },
  'crema-rim': {
    id: 'crema-rim',
    title: 'Crema Rim',
    category: 'roast',
    tag: 'Wall',
    maxLevel: 3,
    minLength: 0,
    descriptions: [
      'Auto-turn at a wall toward wider space (6s cooldown)',
      'Auto-turn at a wall toward wider space (4s cooldown)',
      'Auto-turn at a wall toward wider space (2.5s cooldown)',
    ],
  },
  'velvet-foam': {
    id: 'velvet-foam',
    title: 'Velvet Foam',
    category: 'ice',
    tag: 'Shield',
    maxLevel: 3,
    minLength: 0,
    descriptions: [
      'Gain a crema shield that stalls on crash; recharges every 6 beans',
      'Gain a crema shield that stalls on crash; recharges every 5 beans',
      'Gain a crema shield that stalls on crash; recharges every 4 beans',
    ],
  },
  'cold-infusion': {
    id: 'cold-infusion',
    title: 'Cold Infusion',
    category: 'ice',
    tag: 'Pace',
    maxLevel: 3,
    minLength: 0,
    descriptions: [
      'Cold brew calms your speed by 25% for 4.5s (2:1 cold brew ratio)',
      'Special cups spawn every 2 beans; cold brew calms you for 6s',
      'Cold brew calms you for 7.5s and chills the rival for 5.5s',
    ],
  },
  'decaf-pace': {
    id: 'decaf-pace',
    title: 'Decaf Pace',
    category: 'ice',
    tag: 'Tempo',
    maxLevel: 3,
    minLength: 0,
    descriptions: [
      'Run as if 8 cells shorter (-1 speed tier)',
      'Run as if 16 cells shorter (-2 speed tiers)',
      'Run as if 24 cells shorter (-3 speed tiers)',
    ],
  },
  'affogato-pull': {
    id: 'affogato-pull',
    title: 'Affogato Pull',
    category: 'crema',
    tag: 'Magnet',
    maxLevel: 3,
    minLength: 0,
    descriptions: [
      'Pull beans and drops in a 3x3 ring around the head',
      'Pull beans and drops within 2 Manhattan steps',
      'Pull beans and drops in a 5x5 aura around the head',
    ],
  },
  'double-shot': {
    id: 'double-shot',
    title: 'Double Shot',
    category: 'crema',
    tag: 'Combo',
    maxLevel: 3,
    minLength: 0,
    descriptions: [
      'Keep 2 beans on the board; combo window +1.5s',
      'Keep 2 beans on the board; combo window +3s',
      'Keep 3 beans on the board; combo window +4.5s',
    ],
  },
  'house-blend': {
    id: 'house-blend',
    title: 'House Blend',
    category: 'blend',
    tag: 'Blend',
    maxLevel: 0,
    minLength: 0,
    descriptions: [
      'Add +3 directly to your peak length record',
      'Add +3 directly to your peak length record',
      'Add +3 directly to your peak length record',
    ],
  },
};

export const rules = {
  /** The short side of the board always holds this many cells, so a phone and a desktop play the same game. */
  shortSideCells: 18,
  minCellPx: 18,
  maxCellPx: 56,
  boardMarginPx: 8,
  baseSpeed: 6.5,
  maxSpeed: 11.5,
  speedRampEvery: 8,
  beanGrowth: 1,
  dropGrowth: 2,
  espressoGrowth: 4,
  coldbrewGrowth: 2,
  cpuSpecialGrowth: 3,
  maxComboBonus: 2,
  comboWindowMs: 4200,
  specialSpawnEvery: 3,
  specialDurationMs: 7500,
  cpuRespawnMs: 2600,
  cpuSlowMs: 4000,
  cpuKoGrowth: 3,
  cpuWanderChance: 0.12,
  maxQueuedTurns: 2,
  draftSteps: [4, 5, 6, 7, 8] as const,
  draftChoices: 3,
  maxCardLevel: 3,
  graceMs: 1200,
  playerChillFactor: 0.75,
  stallMs: 600,
  shieldCost: 3,
  tailCutCooldownMs: 2000,
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
  foods: Point[];
  special: Special | null;
  drops: Point[];
  foodsEaten: number;
  combo: number;
  maxCombo: number;
  comboExpiresAt: number;
  kos: number;
  cpu: Cpu;
  deathAt: Point | null;
  /** Longest length reached this round, preserved even when cards compress or spend body segments. */
  peakLength: number;
  cards: Partial<Record<CardId, number>>;
  draft: readonly CardId[] | null;
  draftIndex: number;
  lastDraftAt: number;
  nextDraftAt: number;
  pendingDrafts: number;
  nextSpecialAt: number;
  specialsSpawned: number;
  specialQueued: boolean;
  shield: boolean;
  shieldBeans: number;
  stallUntil: number;
  graceUntil: number;
  playerSlowUntil: number;
  rimReadyAt: number;
  tailCutReadyAt: number;
};

export type GameEvent =
  | { type: 'bean'; at: Point; combo: number }
  | { type: 'special'; at: Point; kind: SpecialKind; combo: number }
  | { type: 'drop'; at: Point; combo: number }
  | { type: 'ko'; at: Point; combo: number }
  | { type: 'cpu-ate'; at: Point }
  | { type: 'draft'; at: Point; cards: readonly CardId[] }
  | { type: 'compress'; at: Point }
  | { type: 'shield-break'; at: Point }
  | { type: 'tail-cut'; at: Point; combo: number }
  | { type: 'wall-turn'; at: Point }
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

export function cardLevel(state: Pick<GameState, 'cards'>, id: CardId): number {
  return state.cards[id] ?? 0;
}

export function decafOffset(state: Pick<GameState, 'cards'>): number {
  return cardLevel(state, 'decaf-pace') * 8;
}

/** Number of tail segments that Paper Filter turns into passable ghost cells. */
export function ghostTailCount(state: Pick<GameState, 'snake' | 'cards'>): number {
  const level = cardLevel(state, 'paper-filter');

  if (level <= 0) {
    return 0;
  }

  const raw = level === 1 ? 4 : level === 2 ? 7 : 10;
  return Math.max(0, Math.min(raw, state.snake.length - 4));
}

/** How long one step lasts at this length: 6.5 steps a second, one faster every 8 cells, up to 11.5. */
export function stepMs(length: number): number {
  const speed = Math.min(
    rules.maxSpeed,
    rules.baseSpeed + Math.floor(Math.max(0, length - 3) / rules.speedRampEvery),
  );

  return 1000 / speed;
}

/** Full step interval accounting for Decaf Pace, Cold Infusion chill and soft-start grace. */
export function stepIntervalMs(state: GameState, now: number): number {
  const effectiveLength = Math.max(3, state.snake.length - decafOffset(state));
  const grace =
    now < state.graceUntil
      ? 0.65 + 0.35 * (1 - Math.min(1, Math.max(0, (state.graceUntil - now) / rules.graceMs)))
      : 1;
  const chill = now < state.playerSlowUntil ? rules.playerChillFactor : 1;
  return stepMs(effectiveLength) / (grace * chill);
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
  const cells = [...state.snake, ...state.cpu.body, ...state.foods, ...state.drops];

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
  const firstBean = pickFreeCell(cols, rows, [...snake, ...cpu.body], random);

  return {
    cols,
    rows,
    phase: 'ready',
    snake,
    direction: DIRECTIONS.right,
    turns: [],
    growth: 0,
    foods: [firstBean],
    special: null,
    drops: [],
    foodsEaten: 0,
    combo: 0,
    maxCombo: 0,
    comboExpiresAt: 0,
    kos: 0,
    cpu,
    deathAt: null,
    peakLength: snake.length,
    cards: {},
    draft: null,
    draftIndex: 0,
    lastDraftAt: 0,
    nextDraftAt: rules.draftSteps[0],
    pendingDrafts: 0,
    nextSpecialAt: rules.specialSpawnEvery,
    specialsSpawned: 0,
    specialQueued: false,
    shield: false,
    shieldBeans: 0,
    stallUntil: 0,
    graceUntil: 0,
    playerSlowUntil: 0,
    rimReadyAt: 0,
    tailCutReadyAt: 0,
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
    state.stallUntil = 0;
  } else if (state.stallUntil > 0 && samePoint(next, reference)) {
    state.stallUntil = 0;
  }
}

export function resume(state: GameState, now = 0): void {
  if (state.phase === 'paused') {
    state.phase = 'playing';
    if (now > 0) {
      state.graceUntil = now + rules.graceMs;
    }
  } else if (state.phase === 'ready') {
    state.phase = 'playing';
  }
}

export function togglePause(state: GameState, now = 0): void {
  if (state.phase === 'playing') {
    state.phase = 'paused';
  } else if (state.phase === 'paused' || state.phase === 'ready') {
    resume(state, now);
  }
}

/** A bean grows the snake one cell, plus one more for every two links of combo, up to two more. */
export function beanGrowth(combo: number): number {
  return rules.beanGrowth + Math.min(rules.maxComboBonus, Math.floor(combo / 2));
}

function comboWindow(state: GameState): number {
  return rules.comboWindowMs + cardLevel(state, 'double-shot') * 1500;
}

function bumpCombo(state: GameState, now: number, by = 1): void {
  const alive = state.combo > 0 && now <= state.comboExpiresAt;
  state.combo = (alive ? state.combo : 0) + by;
  state.comboExpiresAt = now + comboWindow(state);
  state.maxCombo = Math.max(state.maxCombo, state.combo);
}

export function allCardsMaxed(state: Pick<GameState, 'cards'>): boolean {
  return UPGRADEABLE_CARD_IDS.every((id) => cardLevel(state, id) >= rules.maxCardLevel);
}

function isCardEligible(state: Pick<GameState, 'snake' | 'cards'>, id: UpgradeableCardId): boolean {
  const def = CARDS[id];
  return cardLevel(state, id) < def.maxLevel && state.snake.length >= def.minLength;
}

/**
 * Picks three draft choices. The first draft offers one card from each category
 * (roast, ice, crema) when eligible; later drafts draw uniformly without replacement,
 * filling any shortfall with House Blend.
 */
export function drawDraftCards(state: GameState, random: () => number): CardId[] {
  if (allCardsMaxed(state)) {
    return [];
  }

  const eligible = UPGRADEABLE_CARD_IDS.filter((id) => isCardEligible(state, id));
  const picked: CardId[] = [];

  if (state.draftIndex === 0) {
    const groups: readonly CardCategory[] = ['roast', 'ice', 'crema'];

    for (const category of groups) {
      const groupPool = eligible.filter(
        (id) => CARDS[id].category === category && !picked.includes(id),
      );

      if (groupPool.length > 0) {
        const chosen = groupPool[Math.floor(random() * groupPool.length)]!;
        picked.push(chosen);
      }
    }
  }

  const remaining = eligible.filter((id) => !picked.includes(id));

  while (remaining.length > 0 && picked.length < rules.draftChoices) {
    const index = Math.floor(random() * remaining.length);
    const [card] = remaining.splice(index, 1);

    if (card) {
      picked.push(card);
    }
  }

  while (picked.length < rules.draftChoices) {
    picked.push('house-blend');
  }

  return picked;
}

function targetBeanCount(state: Pick<GameState, 'cards'>): number {
  const level = cardLevel(state, 'double-shot');
  return level >= 3 ? 3 : level >= 1 ? 2 : 1;
}

function syncFoods(state: GameState, random: () => number): void {
  const target = targetBeanCount(state);

  while (state.foods.length < target) {
    state.foods.push(pickFreeCell(state.cols, state.rows, occupied(state), random));
  }
}

function placeDropsFromTail(state: GameState, removed: readonly Point[], maxDrops: number): void {
  let placed = 0;

  for (let index = removed.length - 1; index >= 0 && placed < maxDrops; index -= 1) {
    const cell = removed[index]!;
    const taken =
      state.snake.some((part) => samePoint(part, cell)) ||
      state.cpu.body.some((part) => samePoint(part, cell)) ||
      state.foods.some((part) => samePoint(part, cell)) ||
      (state.special !== null && samePoint(state.special.point, cell)) ||
      state.drops.some((existing) => samePoint(existing, cell));

    if (!taken && inside(state, cell)) {
      state.drops.push({ ...cell });
      placed += 1;
    }
  }
}

/**
 * Applies a chosen card from the active draft (or directly in tests), triggering any
 * immediate effect and either opening the next queued draft or resuming with grace.
 */
export function pickCard(
  state: GameState,
  id: CardId,
  now = 0,
  random: () => number = Math.random,
): boolean {
  if (state.draft && !state.draft.includes(id)) {
    return false;
  }

  const wasDraft = state.draft !== null;

  if (id === 'house-blend') {
    state.peakLength = Math.max(state.peakLength, state.snake.length) + 3;
  } else {
    const nextLevel = Math.min(rules.maxCardLevel, cardLevel(state, id) + 1);
    state.cards[id] = nextLevel;

    if (id === 'ristretto') {
      const ratio = nextLevel === 1 ? 0.25 : nextLevel === 2 ? 0.3 : 0.35;
      const prePeak = Math.max(state.peakLength, state.snake.length);

      if (state.snake.length > 4) {
        const cut = Math.max(
          1,
          Math.min(state.snake.length - 4, Math.round(state.snake.length * ratio)),
        );
        const removed = state.snake.splice(state.snake.length - cut, cut);
        const dropCount = Math.min(4, Math.floor(cut / 3));
        placeDropsFromTail(state, removed, dropCount);
      }

      state.peakLength = prePeak + 3;
    } else if (id === 'velvet-foam') {
      state.shield = true;
      state.shieldBeans = 0;
    } else if (id === 'double-shot') {
      syncFoods(state, random);
      if (state.combo > 0 && now <= state.comboExpiresAt) {
        state.comboExpiresAt += 1500;
      }
    } else if (id === 'cold-infusion' && nextLevel >= 2) {
      if (state.nextSpecialAt - state.foodsEaten > 2) {
        state.nextSpecialAt = state.foodsEaten + 2;
      }
    }
  }

  if (wasDraft) {
    state.draftIndex += 1;
  }

  if (allCardsMaxed(state)) {
    state.nextDraftAt = Number.POSITIVE_INFINITY;
    state.pendingDrafts = 0;
    state.draft = null;
    if (state.phase === 'draft') {
      state.phase = 'playing';
    }
    state.graceUntil = now + rules.graceMs;
    return true;
  }

  if (state.pendingDrafts > 0) {
    state.pendingDrafts -= 1;
    const nextChoices = drawDraftCards(state, random);

    if (nextChoices.length > 0) {
      state.draft = nextChoices;
      state.phase = 'draft';
      return true;
    }
  }

  state.draft = null;
  if (state.phase === 'draft') {
    state.phase = 'playing';
  }
  state.graceUntil = now + rules.graceMs;
  return true;
}

export function nearestBean(from: Point, foods: readonly Point[]): Point {
  let best = foods[0] ?? { x: 0, y: 0 };
  let bestDist = Number.POSITIVE_INFINITY;

  for (const bean of foods) {
    const dist = Math.abs(from.x - bean.x) + Math.abs(from.y - bean.y);

    if (dist < bestDist) {
      bestDist = dist;
      best = bean;
    }
  }

  return best;
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

  const target = state.special ? state.special.point : nearestBean(head, state.foods);
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
      state.cpu = createCpu(
        state.cols,
        state.rows,
        [...state.snake, ...state.foods, ...state.drops],
        random,
      );
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
          state.foods.some((bean) => samePoint(bean, drop)) ||
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

  const beanIndex = state.foods.findIndex((bean) => samePoint(bean, next));

  if (beanIndex !== -1) {
    cpu.growth += rules.beanGrowth;
    state.foods[beanIndex] = pickFreeCell(state.cols, state.rows, occupied(state), random);
    events.push({ type: 'cpu-ate', at: next });
  } else if (state.special && samePoint(next, state.special.point)) {
    cpu.growth += rules.cpuSpecialGrowth;
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

function isSafeCell(state: GameState, body: readonly Point[], point: Point): boolean {
  return (
    inside(state, point) &&
    !body.some((segment) => samePoint(segment, point)) &&
    !(state.cpu.alive && state.cpu.body.some((segment) => samePoint(segment, point)))
  );
}

function countReachableCells(state: GameState, body: readonly Point[], start: Point): number {
  const limit = state.cols * state.rows;
  const seen = new Set<number>([start.y * state.cols + start.x]);
  const queue: Point[] = [start];

  while (queue.length > 0 && seen.size < limit) {
    const current = queue.shift()!;

    for (const dir of Object.values(DIRECTIONS)) {
      const next = { x: current.x + dir.x, y: current.y + dir.y };
      const key = next.y * state.cols + next.x;

      if (!seen.has(key) && isSafeCell(state, body, next)) {
        seen.add(key);
        queue.push(next);
      }
    }
  }

  return seen.size;
}

function tryCremaRimTurn(state: GameState, body: readonly Point[], now: number): Direction | null {
  const level = cardLevel(state, 'crema-rim');

  if (level <= 0 || now < state.rimReadyAt) {
    return null;
  }

  const head = state.snake[0]!;
  const candidates: Direction[] =
    state.direction.x !== 0
      ? [DIRECTIONS.up, DIRECTIONS.down]
      : [DIRECTIONS.left, DIRECTIONS.right];

  const open = candidates.filter((dir) =>
    isSafeCell(state, body, { x: head.x + dir.x, y: head.y + dir.y }),
  );

  if (open.length === 0) {
    return null;
  }

  let chosen = open[0]!;

  if (open.length > 1) {
    let bestRoom = -1;
    let bestClearance = -1;

    for (const dir of open) {
      const start = { x: head.x + dir.x, y: head.y + dir.y };
      const room = countReachableCells(state, body, start);
      let clearance = 0;
      let probe = start;

      while (isSafeCell(state, body, probe)) {
        clearance += 1;
        probe = { x: probe.x + dir.x, y: probe.y + dir.y };
      }

      if (room > bestRoom || (room === bestRoom && clearance > bestClearance)) {
        bestRoom = room;
        bestClearance = clearance;
        chosen = dir;
      }
    }
  }

  const cooldown = level === 1 ? 6000 : level === 2 ? 4000 : 2500;
  state.rimReadyAt = now + cooldown;
  return chosen;
}

function nextSpecialKind(state: GameState): SpecialKind {
  const infusion = cardLevel(state, 'cold-infusion');

  if (infusion >= 1) {
    return state.specialsSpawned % 3 === 0 ? 'espresso' : 'coldbrew';
  }

  return state.specialsSpawned % 2 === 0 ? 'espresso' : 'coldbrew';
}

function draftIntervalFor(index: number): number {
  const steps = rules.draftSteps;
  return steps[Math.min(index, steps.length - 1)]!;
}

function spawnSpecialCup(state: GameState, now: number, random: () => number): void {
  const kind = nextSpecialKind(state);
  state.specialsSpawned += 1;
  state.special = {
    point: pickFreeCell(state.cols, state.rows, occupied(state), random),
    kind,
    bornAt: now,
    expiresAt: now + rules.specialDurationMs,
  };
}

function onBeanEaten(
  state: GameState,
  at: Point,
  now: number,
  random: () => number,
  events: GameEvent[],
): void {
  bumpCombo(state, now);
  state.growth += beanGrowth(state.combo);
  state.foodsEaten += 1;
  events.push({ type: 'bean', at, combo: state.combo });

  const foamLevel = cardLevel(state, 'velvet-foam');

  if (foamLevel > 0 && !state.shield) {
    const needed = foamLevel === 1 ? 6 : foamLevel === 2 ? 5 : 4;
    state.shieldBeans += 1;

    if (state.shieldBeans >= needed) {
      state.shield = true;
      state.shieldBeans = 0;
    }
  }

  if (state.foodsEaten >= state.nextSpecialAt) {
    const period = cardLevel(state, 'cold-infusion') >= 2 ? 2 : rules.specialSpawnEvery;

    while (state.foodsEaten >= state.nextSpecialAt) {
      state.nextSpecialAt += period;
    }

    if (!state.special) {
      spawnSpecialCup(state, now, random);
    } else if (state.special.bornAt === now) {
      // A second threshold crossed on the same step as a fresh spawn queues one follow-up cup.
      state.specialQueued = true;
    }
  }

  if (allCardsMaxed(state)) {
    state.nextDraftAt = Number.POSITIVE_INFINITY;
    return;
  }

  while (state.foodsEaten >= state.nextDraftAt) {
    const milestoneIndex = state.draftIndex + state.pendingDrafts + (state.draft ? 1 : 0);
    state.lastDraftAt = state.nextDraftAt;
    state.nextDraftAt += draftIntervalFor(milestoneIndex + 1);

    if (state.draft === null) {
      const cards = drawDraftCards(state, random);

      if (cards.length > 0) {
        state.draft = cards;
        state.phase = 'draft';
        events.push({ type: 'draft', at, cards });
      }
    } else {
      state.pendingDrafts += 1;
    }
  }
}

function inMagnetRange(head: Point, target: Point, level: number): boolean {
  const dx = Math.abs(head.x - target.x);
  const dy = Math.abs(head.y - target.y);

  if (level === 1) {
    return Math.max(dx, dy) <= 1;
  }

  if (level === 2) {
    return dx + dy <= 2;
  }

  return Math.max(dx, dy) <= 2;
}

function applyAffogatoPull(
  state: GameState,
  head: Point,
  now: number,
  random: () => number,
  events: GameEvent[],
): void {
  const level = cardLevel(state, 'affogato-pull');

  if (level <= 0) {
    return;
  }

  for (let index = state.drops.length - 1; index >= 0; index -= 1) {
    const drop = state.drops[index]!;

    if (inMagnetRange(head, drop, level)) {
      state.drops.splice(index, 1);
      state.growth += rules.dropGrowth;
      bumpCombo(state, now);
      events.push({ type: 'drop', at: drop, combo: state.combo });
    }
  }

  for (let index = 0; index < state.foods.length; index += 1) {
    const bean = state.foods[index]!;

    if (!samePoint(head, bean) && inMagnetRange(head, bean, level)) {
      state.foods[index] = pickFreeCell(state.cols, state.rows, occupied(state), random);
      onBeanEaten(state, bean, now, random, events);
    }
  }
}

/** Advances the round by one step and reports what happened, for the renderer to answer. */
export function step(state: GameState, random: () => number, now: number): GameEvent[] {
  const events: GameEvent[] = [];

  if (state.phase !== 'playing') {
    return events;
  }

  let specialClearedThisStep = false;

  if (state.special && now >= state.special.expiresAt) {
    state.special = null;
    specialClearedThisStep = true;
  }

  if (state.combo > 0 && now > state.comboExpiresAt) {
    state.combo = 0;
  }

  const next = state.turns.shift();

  if (next) {
    state.direction = next;
    state.stallUntil = 0;
  }

  if (now < state.stallUntil) {
    stepCpu(state, random, now, events);
    return events;
  }

  const head = state.snake[0]!;
  let nextHead = { x: head.x + state.direction.x, y: head.y + state.direction.y };
  // The tail leaves its cell on this same step unless the snake is growing.
  const body = state.growth > 0 ? state.snake : state.snake.slice(0, -1);

  // 1. Paper Filter: crossing a ghost tail cell cuts from that segment to the tip and leaves 1 drop.
  const ghostCount = ghostTailCount(state);
  const ghostStartIndex = state.snake.length - ghostCount;
  const bodyHitIndex = body.findIndex((segment) => samePoint(segment, nextHead));
  const hitGhostTail =
    bodyHitIndex !== -1 &&
    ghostCount > 0 &&
    now >= state.tailCutReadyAt &&
    bodyHitIndex >= ghostStartIndex;

  if (hitGhostTail) {
    const removed = state.snake.splice(bodyHitIndex);
    state.tailCutReadyAt = now + rules.tailCutCooldownMs;
    placeDropsFromTail(state, removed, 1);
    events.push({ type: 'tail-cut', at: nextHead, combo: state.combo });
  }

  // 2. Crema Rim: auto-turn before hitting a wall.
  if (!inside(state, nextHead)) {
    const rimDir = tryCremaRimTurn(state, body, now);

    if (rimDir) {
      state.direction = rimDir;
      state.turns = [];
      nextHead = { x: head.x + rimDir.x, y: head.y + rimDir.y };
      events.push({ type: 'wall-turn', at: head });
    }
  }

  const postTurnHitIndex = hitGhostTail
    ? -1
    : body.findIndex((segment) => samePoint(segment, nextHead));
  const fatalWall = !inside(state, nextHead);
  const fatalBody = postTurnHitIndex !== -1;
  const fatalCpu = state.cpu.alive && state.cpu.body.some((segment) => samePoint(segment, nextHead));

  // 3. Velvet Foam: absorb the crash, spend up to 3 tail cells (keep at least 4), and stall in place.
  if (fatalWall || fatalBody || fatalCpu) {
    if (state.shield) {
      state.shield = false;
      state.shieldBeans = 0;
      state.stallUntil = now + rules.stallMs;

      if (state.snake.length > 4) {
        const keep = Math.max(4, state.snake.length - rules.shieldCost);
        state.snake.splice(keep);
      }

      events.push({ type: 'shield-break', at: head });
      stepCpu(state, random, now, events);
      return events;
    }

    state.phase = 'over';
    state.deathAt = nextHead;
    events.push({ type: 'death', at: nextHead });
    return events;
  }

  state.snake.unshift(nextHead);

  const eatenBeanIndex = state.foods.findIndex((bean) => samePoint(bean, nextHead));

  if (eatenBeanIndex !== -1) {
    state.foods[eatenBeanIndex] = pickFreeCell(state.cols, state.rows, occupied(state), random);
    syncFoods(state, random);
    onBeanEaten(state, nextHead, now, random, events);
  } else if (state.special && samePoint(nextHead, state.special.point)) {
    const kind = state.special.kind;
    state.special = null;
    specialClearedThisStep = true;

    if (kind === 'espresso') {
      state.growth += rules.espressoGrowth;
      bumpCombo(state, now, 2);
    } else {
      state.growth += rules.coldbrewGrowth;
      bumpCombo(state, now);
      const infusion = cardLevel(state, 'cold-infusion');
      state.cpu.slowUntil = now + (infusion >= 3 ? 5500 : rules.cpuSlowMs);

      if (infusion >= 1) {
        const chillMs = infusion === 1 ? 4500 : infusion === 2 ? 6000 : 7500;
        state.playerSlowUntil = now + chillMs;
      }
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

  applyAffogatoPull(state, nextHead, now, random, events);

  if (!state.special && !specialClearedThisStep && state.specialQueued) {
    state.specialQueued = false;
    spawnSpecialCup(state, now, random);
  }

  if (state.growth > 0) {
    state.growth -= 1;
  } else if (!hitGhostTail) {
    state.snake.pop();
  }

  state.peakLength = Math.max(state.peakLength, state.snake.length);

  stepCpu(state, random, now, events);
  return events;
}

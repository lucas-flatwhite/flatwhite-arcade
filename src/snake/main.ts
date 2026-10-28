import '../shared/base.css';
import '../shared/fonts.css';
import './snake.css';
import { effectsFor, liveEffects, type Effect } from './effects';
import {
  DIRECTIONS,
  createGame,
  createRandom,
  fitGrid,
  refitGrid,
  step,
  stepMs,
  togglePause,
  turn,
  type Direction,
  type GameEvent,
  type GameState,
  type Grid,
} from './game';
import { drawItem, drawScene, paintBoardLayer, type ItemKind } from './render';
import { beginSwipe, isTap, moveSwipe, type SwipeTracker } from './swipe';

const BEST_KEY = 'lucas-flatwhite:best-length';
const MAX_RATIO = 2;
/** The crash plays out on the board before the result card covers it. */
const OVER_CARD_DELAY_MS = 420;
const MAX_FRAME_MS = 100;

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: DIRECTIONS.up,
  ArrowDown: DIRECTIONS.down,
  ArrowLeft: DIRECTIONS.left,
  ArrowRight: DIRECTIONS.right,
  w: DIRECTIONS.up,
  s: DIRECTIONS.down,
  a: DIRECTIONS.left,
  d: DIRECTIONS.right,
};

function loadBest(): number {
  try {
    const stored = Number(window.localStorage.getItem(BEST_KEY));
    return Number.isFinite(stored) && stored > 0 ? Math.floor(stored) : 0;
  } catch {
    return 0;
  }
}

function saveBest(best: number): void {
  try {
    window.localStorage.setItem(BEST_KEY, String(best));
  } catch {
    // Private mode or blocked storage: the best length stays in memory for this visit.
  }
}

function buzz(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Vibration is a nicety; a browser that refuses it changes nothing.
  }
}

function hapticFor(event: GameEvent): number | number[] | null {
  switch (event.type) {
    case 'bean':
    case 'drop':
      return 8;
    case 'special':
      return 16;
    case 'ko':
      return [12, 40, 12];
    case 'death':
      return 40;
    case 'cpu-ate':
      return null;
  }
}

function query<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Snake page is missing ${selector}`);
  }

  return element;
}

function paintLegendIcons(root: ParentNode): void {
  const ratio = Math.min(window.devicePixelRatio || 1, MAX_RATIO);

  for (const icon of root.querySelectorAll<HTMLCanvasElement>('[data-icon]')) {
    const size = 28;
    icon.width = size * ratio;
    icon.height = size * ratio;
    const ctx = icon.getContext('2d');

    if (ctx) {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      drawItem(ctx, icon.dataset.icon as ItemKind, 0, 0, size);
    }
  }
}

export function mountSnake(): void {
  const stage = query<HTMLElement>(document, '[data-stage]');
  const canvas = query<HTMLCanvasElement>(stage, '[data-canvas]');
  const scoreText = query<HTMLElement>(document, '[data-score]');
  const pauseButton = query<HTMLButtonElement>(document, '[data-pause]');
  const status = query<HTMLElement>(stage, '[data-status]');
  const overlays = {
    ready: query<HTMLElement>(stage, '[data-overlay="ready"]'),
    paused: query<HTMLElement>(stage, '[data-overlay="paused"]'),
    over: query<HTMLElement>(stage, '[data-overlay="over"]'),
  };
  const overScore = query<HTMLElement>(stage, '[data-over-score]');
  const overDuel = query<HTMLElement>(stage, '[data-over-duel]');
  const overBest = query<HTMLElement>(stage, '[data-over-best]');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return;
  }

  const boardLayer = document.createElement('canvas');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const random = createRandom((Date.now() ^ Math.floor(Math.random() * 2 ** 32)) >>> 0);

  let width = 0;
  let height = 0;
  let ratio = 1;
  let grid: Grid = fitGrid(320, 320);
  let state: GameState = createGame(grid.cols, grid.rows, random);
  let effects: Effect[] = [];
  let world = 0;
  let lastFrameAt = 0;
  let lastStepAt = 0;
  let overAt: number | null = null;
  let frame = 0;
  let best = loadBest();
  let swipe: SwipeTracker | null = null;
  let swipeFromButton = false;
  let ignoreClicksUntil = 0;
  let lastScore = '';

  const show = (name: keyof typeof overlays | null): void => {
    for (const [key, element] of Object.entries(overlays)) {
      element.hidden = key !== name;
    }
  };

  const syncChrome = (): void => {
    const text =
      state.phase === 'over'
        ? `length ${state.snake.length}`
        : [
            `length ${state.snake.length}`,
            state.combo >= 2 && world <= state.comboExpiresAt ? `${state.combo}x` : '',
            `cpu ${state.cpu.alive ? state.cpu.body.length : 0}`,
          ]
            .filter(Boolean)
            .join(' · ');

    if (text !== lastScore) {
      lastScore = text;
      scoreText.textContent = text;
    }

    const live = state.phase === 'playing' || state.phase === 'paused';
    pauseButton.disabled = !live;
    pauseButton.setAttribute('aria-pressed', String(state.phase === 'paused'));
    pauseButton.textContent = state.phase === 'paused' ? 'Resume' : 'Pause';
  };

  const draw = (): void => {
    drawScene(ctx, boardLayer, ratio, {
      state,
      grid,
      effects,
      now: world,
      overAt,
      reducedMotion: reducedMotion.matches,
    });
    syncChrome();
  };

  const finishRound = (): void => {
    const length = state.snake.length;
    const rival = state.cpu.best;
    const isNewBest = length > best;

    if (isNewBest) {
      best = length;
      saveBest(best);
    }

    const verdict = length > rival ? '승' : length < rival ? '패' : '무';
    const extras = [
      state.maxCombo >= 2 ? `max ${state.maxCombo}x` : '',
      state.kos > 0 ? `ko ${state.kos}` : '',
    ].filter(Boolean);

    overScore.textContent = String(length);
    overDuel.textContent = [`vs cpu best ${rival} · ${verdict}`, ...extras].join(' · ');
    overBest.textContent = isNewBest ? `new record! best ${best}` : `best ${best}`;
    overBest.classList.toggle('is-new', isNewBest);
    status.textContent = `퇴근. Length ${length}, ${verdict} against the rival.`;
  };

  const handleEvents = (events: GameEvent[]): void => {
    for (const event of events) {
      effects.push(...effectsFor(event, world, state.snake.length, state.direction));
      const pattern = hapticFor(event);

      if (pattern !== null) {
        buzz(pattern);
      }

      if (event.type === 'death') {
        overAt = world;
        finishRound();
      }
    }
  };

  // World time stands still while paused, so a paused board has nothing left to animate.
  const animating = (): boolean =>
    state.phase !== 'paused' &&
    (state.phase === 'playing' ||
      effects.length > 0 ||
      (overAt !== null && world - overAt < Math.max(OVER_CARD_DELAY_MS, state.snake.length * 22 + 200)));

  const tick = (time: number): void => {
    frame = 0;
    const delta = lastFrameAt === 0 ? 0 : Math.min(MAX_FRAME_MS, time - lastFrameAt);
    lastFrameAt = time;

    if (state.phase !== 'paused') {
      world += delta;
    }

    if (state.phase === 'playing') {
      let ms = stepMs(state.snake.length);

      // After a stall (a slow frame, a hidden tab), drop the backlog instead of jumping ahead.
      if (world - lastStepAt > ms * 3) {
        lastStepAt = world - ms;
      }

      while (state.phase === 'playing' && world - lastStepAt >= ms) {
        lastStepAt += ms;
        handleEvents(step(state, random, lastStepAt));
        ms = stepMs(state.snake.length);
      }
    }

    effects = liveEffects(effects, world);

    if (overAt !== null && overlays.over.hidden && world - overAt >= OVER_CARD_DELAY_MS) {
      show('over');
    }

    draw();

    if (animating()) {
      frame = window.requestAnimationFrame(tick);
    } else {
      lastFrameAt = 0;
    }
  };

  // The loop sleeps whenever nothing on the board moves, and every input wakes it.
  const wake = (): void => {
    if (frame === 0) {
      frame = window.requestAnimationFrame(tick);
    }
  };

  const newRound = (): void => {
    grid = fitGrid(width, height);
    state = createGame(grid.cols, grid.rows, random);
    effects = [];
    overAt = null;
    paintBoardLayer(boardLayer, width, height, ratio, grid);
    show('ready');
    draw();
  };

  const resize = (): void => {
    const rect = stage.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    ratio = Math.min(window.devicePixelRatio || 1, MAX_RATIO);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);

    if (state.phase === 'ready' && overAt === null) {
      newRound();
      return;
    }

    // Keep a round in play: same cells, resized to the new field.
    grid = refitGrid(width, height, state.cols, state.rows);
    paintBoardLayer(boardLayer, width, height, ratio, grid);
    draw();
  };

  const begin = (): void => {
    lastStepAt = world;
    overlays.ready.classList.add('is-compact');
    show(null);
    status.textContent = '';
    wake();
  };

  const restart = (): void => {
    if (state.phase === 'over' && !overlays.over.hidden) {
      newRound();
    }
  };

  const steer = (direction: Direction): void => {
    const wasReady = state.phase === 'ready';
    turn(state, direction);

    if (wasReady && state.phase === 'playing') {
      begin();
    }
  };

  const pause = (): void => {
    const was = state.phase;
    togglePause(state);

    if (was === 'ready') {
      begin();
    } else if (state.phase === 'paused') {
      show('paused');
      status.textContent = 'Paused';
      draw();
    } else if (was === 'paused') {
      show(null);
      status.textContent = '';
      wake();
    }
  };

  const pauseIfPlaying = (): void => {
    if (state.phase === 'playing') {
      pause();
    }
  };

  window.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    // A focused button answers Enter and Space itself.
    if (event.target instanceof HTMLButtonElement && (event.key === 'Enter' || event.key === ' ')) {
      return;
    }

    const direction = KEY_DIRECTIONS[event.key.length === 1 ? event.key.toLowerCase() : event.key];

    if (direction) {
      event.preventDefault();

      if (state.phase === 'ready' || state.phase === 'playing') {
        steer(direction);
      }

      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();

      if (state.phase === 'over') {
        restart();
      } else {
        pause();
      }
    } else if (event.key === 'Escape' || event.key.toLowerCase() === 'p') {
      if (state.phase === 'playing' || state.phase === 'paused') {
        pause();
      }
    }
  });

  stage.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary) {
      return;
    }

    swipe = beginSwipe(event.clientX, event.clientY);
    swipeFromButton = event.target instanceof Element && event.target.closest('button') !== null;
  });

  stage.addEventListener('pointermove', (event) => {
    if (!swipe || !event.isPrimary || event.pointerType === 'mouse') {
      return;
    }

    const direction = moveSwipe(swipe, event.clientX, event.clientY, Math.max(14, grid.cell * 0.6));

    if (direction && (state.phase === 'ready' || state.phase === 'playing')) {
      // A swipe that began on a card's button steers; the click it may still fire must not.
      ignoreClicksUntil = performance.now() + 400;
      steer(direction);
    }
  });

  stage.addEventListener('pointerup', (event) => {
    if (!swipe || !event.isPrimary) {
      return;
    }

    const tapped = isTap(swipe, event.clientX, event.clientY, Math.max(14, grid.cell * 0.6));
    swipe = null;

    // A tap on a button is the button's own click.
    if (!tapped || swipeFromButton) {
      return;
    }

    if (state.phase === 'over') {
      restart();
    } else if (state.phase === 'ready' || state.phase === 'paused') {
      pause();
    }
  });

  stage.addEventListener('pointercancel', () => {
    swipe = null;
  });

  pauseButton.addEventListener('click', () => {
    if (state.phase === 'playing' || state.phase === 'paused') {
      pause();
    }
  });

  for (const button of stage.querySelectorAll<HTMLButtonElement>('[data-action]')) {
    button.addEventListener('click', () => {
      if (performance.now() < ignoreClicksUntil) {
        return;
      }

      const action = button.dataset.action;

      if (action === 'start' || action === 'resume') {
        pause();
      } else if (action === 'restart') {
        restart();
      }
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseIfPlaying();
    }
  });
  // Leaving the page pauses the round; coming back from the back-forward cache shows it again.
  window.addEventListener('pagehide', pauseIfPlaying);
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      lastFrameAt = 0;
      draw();
    }
  });
  reducedMotion.addEventListener('change', draw);

  new ResizeObserver(resize).observe(stage);
  paintLegendIcons(stage);

  // Labels on the board are drawn in Roboto Mono; wait for it so the first one is not a fallback face.
  void document.fonts?.load('16px "Roboto Mono"').then(draw, draw);
}

mountSnake();

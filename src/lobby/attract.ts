import { effectsFor, liveEffects, type Effect } from '../snake/effects';
import {
  DIRECTIONS,
  createGame,
  createRandom,
  refitGrid,
  step,
  stepMs,
  turn,
  type GameState,
  type Grid,
} from '../snake/game';
import { drawScene, paintBoardLayer } from '../snake/render';
import { autopilot } from './autopilot';

const COLS = 16;
const ROWS = 12;
const MAX_RATIO = 2;
/** How long a crashed demo lies on the board before the next one starts. */
const RESTART_MS = 1400;
/** A demo shown without motion is a still from a round already under way. */
const STILL_STEPS = 48;

export type Attract = {
  /** Shows the demo, or hides it when the slot is empty. */
  setPower(on: boolean): void;
};

/**
 * Plays Snake by itself on the handheld's screen, with the real rules and renderer. It
 * runs only while the screen is on, in view and in a visible tab; with reduced motion
 * it shows a single still.
 */
export function mountAttract(
  canvas: HTMLCanvasElement,
  hud: { left: HTMLElement; right: HTMLElement },
): Attract {
  const ctx = canvas.getContext('2d');
  const boardLayer = document.createElement('canvas');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const random = createRandom((Date.now() ^ Math.floor(Math.random() * 2 ** 32)) >>> 0);

  let state: GameState = createGame(COLS, ROWS, random);
  let grid: Grid = refitGrid(canvas.clientWidth || 260, canvas.clientHeight || 200, COLS, ROWS);
  let ratio = 1;
  let effects: Effect[] = [];
  let world = 0;
  let lastStepAt = 0;
  let lastFrameAt = 0;
  let overAt: number | null = null;
  let frame = 0;
  let powered = true;
  let inView = true;

  const newRound = (): void => {
    state = createGame(COLS, ROWS, random);
    turn(state, DIRECTIONS.right);
    effects = [];
    overAt = null;
    lastStepAt = world;
  };

  const advance = (): void => {
    const next = autopilot(state);

    if (next) {
      turn(state, next);
    }

    for (const event of step(state, random, lastStepAt)) {
      effects.push(...effectsFor(event, world, state.snake.length, state.direction));

      if (event.type === 'death') {
        overAt = world;
      }
    }
  };

  const writeHud = (): void => {
    const combo = state.combo >= 2 && world <= state.comboExpiresAt ? ` · ${state.combo}x` : '';
    hud.left.textContent = `Len ${String(state.snake.length).padStart(2, '0')}${combo}`;
    hud.right.textContent = `CPU ${String(state.cpu.alive ? state.cpu.body.length : 0).padStart(2, '0')}`;
  };

  const draw = (): void => {
    if (!ctx) {
      return;
    }

    drawScene(ctx, boardLayer, ratio, {
      state,
      grid,
      effects,
      now: world,
      overAt,
      reducedMotion: reducedMotion.matches,
    });
    writeHud();
  };

  const running = (): boolean => powered && inView && !document.hidden && !reducedMotion.matches;

  const tick = (time: number): void => {
    frame = 0;
    world += lastFrameAt === 0 ? 0 : Math.min(100, time - lastFrameAt);
    lastFrameAt = time;

    if (overAt !== null) {
      if (world - overAt >= RESTART_MS) {
        newRound();
      }
    } else {
      let ms = stepMs(state.snake.length);

      if (world - lastStepAt > ms * 3) {
        lastStepAt = world - ms;
      }

      while (overAt === null && world - lastStepAt >= ms) {
        lastStepAt += ms;
        advance();
        ms = stepMs(state.snake.length);
      }
    }

    effects = liveEffects(effects, world);
    draw();

    if (running()) {
      frame = window.requestAnimationFrame(tick);
    } else {
      lastFrameAt = 0;
    }
  };

  const sync = (): void => {
    if (running() && frame === 0) {
      frame = window.requestAnimationFrame(tick);
    } else if (!running() && frame !== 0) {
      window.cancelAnimationFrame(frame);
      frame = 0;
      lastFrameAt = 0;
    }
  };

  const showStill = (): void => {
    newRound();

    for (let index = 0; index < STILL_STEPS && overAt === null; index += 1) {
      lastStepAt += stepMs(state.snake.length);
      advance();
    }

    effects = [];

    if (overAt !== null) {
      newRound();
    }

    draw();
  };

  const resize = (): void => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (width === 0 || height === 0) {
      return;
    }

    // The handheld is drawn with CSS zoom, so the screen's real pixel size is its box on the page.
    const zoom = canvas.getBoundingClientRect().width / width || 1;
    ratio = Math.min(MAX_RATIO, (window.devicePixelRatio || 1) * zoom);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    grid = refitGrid(width, height, COLS, ROWS);
    paintBoardLayer(boardLayer, width, height, ratio, grid);
    draw();
  };

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver((entries) => {
    inView = entries.some((entry) => entry.isIntersecting);
    sync();
  }).observe(canvas);
  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      showStill();
    }

    sync();
  });

  if (reducedMotion.matches) {
    showStill();
  } else {
    newRound();
  }

  sync();

  return {
    setPower(on) {
      powered = on;
      sync();
    },
  };
}

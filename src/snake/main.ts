import '../shared/base.css';
import '../shared/fonts.css';
import '../shared/fonts-ko.css';
import '../shared/arcade-chip.css';
import './snake.css';
import { effectsFor, liveEffects, type Effect } from './effects';
import {
  CARDS,
  CARD_IDS,
  DIRECTIONS,
  cardLevel,
  createGame,
  createRandom,
  fitGrid,
  pickCard,
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
    case 'wall-turn':
      return 8;
    case 'special':
    case 'draft':
    case 'tail-cut':
      return 16;
    case 'ko':
    case 'shield-break':
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
    draft: query<HTMLElement>(stage, '[data-overlay="draft"]'),
    paused: query<HTMLElement>(stage, '[data-overlay="paused"]'),
    over: query<HTMLElement>(stage, '[data-overlay="over"]'),
  };
  const draftKicker = query<HTMLElement>(overlays.draft, '[data-draft-kicker]');
  const draftButtons = Array.from(
    overlays.draft.querySelectorAll<HTMLButtonElement>('[data-draft-card]'),
  );
  const overScore = query<HTMLElement>(stage, '[data-over-score]');
  const overDuel = query<HTMLElement>(stage, '[data-over-duel]');
  const overCards = query<HTMLElement>(stage, '[data-over-cards]');
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
  let lastPhaseKey = '';
  let draftFocus = 0;

  const show = (name: keyof typeof overlays | null): void => {
    for (const [key, element] of Object.entries(overlays)) {
      element.hidden = key !== name;
    }
  };

  const syncDraftSelection = (): void => {
    for (let index = 0; index < draftButtons.length; index += 1) {
      draftButtons[index]?.classList.toggle('is-selected', index === draftFocus);
    }
  };

  const openDraft = (): void => {
    const choices = state.draft;

    if (!choices || choices.length === 0) {
      return;
    }

    draftFocus = 0;
    draftKicker.textContent = `Tasting Note #${state.draftsTaken}`;

    for (let index = 0; index < draftButtons.length; index += 1) {
      const button = draftButtons[index]!;
      const cardId = choices[index];

      if (!cardId) {
        button.hidden = true;
        continue;
      }

      const def = CARDS[cardId];
      const current = cardLevel(state, cardId);
      const next = Math.min(3, current + 1) as 1 | 2 | 3;

      button.hidden = false;
      query<HTMLElement>(button, '[data-card-name]').textContent = def.title;
      query<HTMLElement>(button, '[data-card-level]').textContent =
        current > 0 ? `Lv.${current} -> Lv.${next}` : `${def.tag} · Lv.1`;
      query<HTMLElement>(button, '[data-card-desc]').textContent = def.descriptions[next - 1];
    }

    syncDraftSelection();
    show('draft');
    status.textContent = 'Tasting Note. Pick one of three cards.';
  };

  const syncChrome = (): void => {
    const peak = Math.max(state.snake.length, state.peakLength);
    const lenLabel =
      peak > state.snake.length
        ? `length ${state.snake.length} (${peak})`
        : `length ${state.snake.length}`;
    const beanSpan = Math.max(1, state.nextDraftAt - state.lastDraftAt);
    const beanProgress = Math.max(0, Math.min(beanSpan, state.foodsEaten - state.lastDraftAt));
    const text =
      state.phase === 'over'
        ? lenLabel
        : [
            lenLabel,
            `bean ${beanProgress}/${beanSpan}`,
            state.shield ? 'shield' : '',
            state.combo >= 2 && world <= state.comboExpiresAt ? `${state.combo}x` : '',
            `cpu ${state.cpu.alive ? state.cpu.body.length : 0}`,
          ]
            .filter(Boolean)
            .join(' · ');

    if (text !== lastScore) {
      lastScore = text;
      scoreText.textContent = text;
    }

    const phaseKey = `${state.phase}:${state.draft ? 'draft' : 'live'}`;

    // Touch the DOM only when something changed: a write every frame costs a style and layout pass.
    if (phaseKey === lastPhaseKey) {
      return;
    }

    lastPhaseKey = phaseKey;
    const live = (state.phase === 'playing' || state.phase === 'paused') && state.draft === null;
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
    const length = Math.max(state.snake.length, state.peakLength);
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
    const activeCards = CARD_IDS.filter((id) => cardLevel(state, id) > 0).map((id) => {
      const lv = cardLevel(state, id);
      return lv > 1 ? `${CARDS[id].title} Lv.${lv}` : CARDS[id].title;
    });

    overScore.textContent = String(length);
    overDuel.textContent = [`vs cpu best ${rival} · ${verdict}`, ...extras].join(' · ');
    overCards.textContent = activeCards.join(' · ');
    overCards.hidden = activeCards.length === 0;
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
      } else if (event.type === 'draft') {
        openDraft();
      }
    }
  };

  // World time stands still while paused or picking a card, so timers never tick down mid-choice.
  const animating = (): boolean =>
    state.phase !== 'paused' &&
    state.draft === null &&
    (state.phase === 'playing' ||
      effects.length > 0 ||
      (overAt !== null && world - overAt < Math.max(OVER_CARD_DELAY_MS, state.snake.length * 22 + 200)));

  const tick = (time: number): void => {
    frame = 0;
    const delta = lastFrameAt === 0 ? 0 : Math.min(MAX_FRAME_MS, time - lastFrameAt);
    lastFrameAt = time;

    if (state.phase !== 'paused' && state.draft === null) {
      world += delta;
    }

    if (state.phase === 'playing' && state.draft === null) {
      let ms = stepMs(state, world);

      // After a stall (a slow frame, a hidden tab), drop the backlog instead of jumping ahead.
      if (world - lastStepAt > ms * 3) {
        lastStepAt = world - ms;
      }

      while (state.phase === 'playing' && state.draft === null && world - lastStepAt >= ms) {
        lastStepAt += ms;
        handleEvents(step(state, random, lastStepAt));
        ms = stepMs(state, world);
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

  const chooseDraftCard = (index: number): void => {
    const choices = state.draft;

    if (!choices || index < 0 || index >= choices.length) {
      return;
    }

    const chosen = choices[index]!;
    pickCard(state, chosen, world, random);
    lastStepAt = world;
    show(null);
    status.textContent = `${CARDS[chosen].title} blended.`;
    draw();
    wake();
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
    if (state.draft !== null) {
      return;
    }

    const wasReady = state.phase === 'ready';
    turn(state, direction);

    if (wasReady && state.phase === 'playing') {
      begin();
    }
  };

  const pause = (): void => {
    if (state.draft !== null) {
      return;
    }

    const was = state.phase;
    togglePause(state, world);

    if (was === 'ready') {
      begin();
    } else if (state.phase === 'paused') {
      show('paused');
      status.textContent = 'Paused';
      draw();
    } else if (was === 'paused') {
      lastStepAt = world;
      show(null);
      status.textContent = '';
      wake();
    }
  };

  const pauseIfPlaying = (): void => {
    if (state.phase === 'playing' && state.draft === null) {
      pause();
    }
  };

  window.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    // A focused navigation link keeps native keyboard activation in every phase.
    if (event.target instanceof Element && event.target.closest('a[href]')) {
      return;
    }

    if (state.draft !== null) {
      const count = state.draft.length;

      if (event.key === '1' || event.key === '2' || event.key === '3') {
        const idx = Number(event.key) - 1;
        if (idx < count) {
          event.preventDefault();
          chooseDraftCard(idx);
        }
        return;
      }

      if (
        event.key === 'ArrowUp' ||
        event.key === 'ArrowLeft' ||
        event.key.toLowerCase() === 'w' ||
        event.key.toLowerCase() === 'a'
      ) {
        event.preventDefault();
        draftFocus = (draftFocus - 1 + count) % count;
        syncDraftSelection();
        return;
      }

      if (
        event.key === 'ArrowDown' ||
        event.key === 'ArrowRight' ||
        event.key.toLowerCase() === 's' ||
        event.key.toLowerCase() === 'd'
      ) {
        event.preventDefault();
        draftFocus = (draftFocus + 1) % count;
        syncDraftSelection();
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        chooseDraftCard(draftFocus);
        return;
      }

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
    if (!swipe || !event.isPrimary || event.pointerType === 'mouse' || state.draft !== null) {
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
    if (!tapped || swipeFromButton || state.draft !== null) {
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
    if ((state.phase === 'playing' || state.phase === 'paused') && state.draft === null) {
      pause();
    }
  });

  for (const button of draftButtons) {
    button.addEventListener('click', () => {
      if (performance.now() < ignoreClicksUntil) {
        return;
      }

      const index = Number(button.dataset.draftCard);
      chooseDraftCard(index);
    });
  }

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

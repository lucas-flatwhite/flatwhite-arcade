import { easeOut, progressOf, type Effect, type Tone } from './effects';
import type { Cpu, Direction, GameState, Grid, Point, Special } from './game';

/** Paper, ink and one crema accent: the same three colours as the lucasflatwhite.com board. */
export const palette = {
  page: '#fafafa',
  board: '#ffffff',
  line: '#ebebeb',
  dot: '#e2e2e2',
  ink: '#171717',
  inkDim: '#4d4d4d',
  crema: '#ffc457',
  cremaDeep: '#c98a1c',
  bean: '#6b4526',
  cold: '#4a78c2',
} as const;

const toneColor: Record<Tone, string> = {
  crema: palette.cremaDeep,
  ink: palette.ink,
  cold: palette.cold,
  rival: palette.inkDim,
};

export type Scene = {
  state: GameState;
  grid: Grid;
  effects: readonly Effect[];
  now: number;
  /** When the round ended, for the body to fade from the head back. */
  overAt: number | null;
  reducedMotion: boolean;
};

export type ItemKind = 'bean' | 'espresso' | 'coldbrew' | 'drop' | 'rival';

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();

  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.rect(x, y, width, height);
  }
}

/**
 * Paints everything that never moves (the page, the board card and its dot grid) once
 * per resize. Each frame starts by copying this layer instead of redrawing it.
 */
export function paintBoardLayer(
  layer: HTMLCanvasElement,
  width: number,
  height: number,
  ratio: number,
  grid: Grid,
): void {
  layer.width = Math.floor(width * ratio);
  layer.height = Math.floor(height * ratio);

  const ctx = layer.getContext('2d');

  if (!ctx) {
    return;
  }

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.fillStyle = palette.page;
  ctx.fillRect(0, 0, width, height);

  const boardWidth = grid.cols * grid.cell;
  const boardHeight = grid.rows * grid.cell;
  const radius = Math.min(14, grid.cell * 0.5);

  roundedRect(ctx, grid.x - 0.5, grid.y - 0.5, boardWidth + 1, boardHeight + 1, radius);
  ctx.fillStyle = palette.board;
  ctx.fill();
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 1;
  ctx.stroke();

  const dot = Math.max(1, Math.round(grid.cell * 0.06));
  ctx.fillStyle = palette.dot;

  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      ctx.fillRect(
        grid.x + (col + 0.5) * grid.cell - dot / 2,
        grid.y + (row + 0.5) * grid.cell - dot / 2,
        dot,
        dot,
      );
    }
  }
}

function drawBean(ctx: CanvasRenderingContext2D, cx: number, cy: number, cell: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.55);
  ctx.beginPath();
  ctx.ellipse(0, 0, cell * 0.25, cell * 0.33, 0, 0, Math.PI * 2);
  ctx.fillStyle = palette.bean;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -cell * 0.26);
  ctx.bezierCurveTo(cell * 0.1, -cell * 0.08, -cell * 0.1, cell * 0.08, 0, cell * 0.26);
  ctx.strokeStyle = palette.crema;
  ctx.lineWidth = Math.max(1, cell * 0.05);
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

function drawEspresso(ctx: CanvasRenderingContext2D, cx: number, cy: number, cell: number): void {
  const top = cy - cell * 0.16;
  const bottom = cy + cell * 0.2;
  const half = cell * 0.22;

  ctx.save();
  ctx.lineWidth = Math.max(1.2, cell * 0.06);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = palette.ink;

  // Handle, then the cup over it.
  ctx.beginPath();
  ctx.arc(cx + half * 0.95, cy + cell * 0.01, cell * 0.09, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - half, top);
  ctx.lineTo(cx + half, top);
  ctx.lineTo(cx + half * 0.72, bottom);
  ctx.lineTo(cx - half * 0.72, bottom);
  ctx.closePath();
  ctx.fillStyle = palette.crema;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - half * 1.3, bottom + cell * 0.08);
  ctx.lineTo(cx + half * 1.3, bottom + cell * 0.08);
  ctx.stroke();
  ctx.restore();
}

function drawColdbrew(ctx: CanvasRenderingContext2D, cx: number, cy: number, cell: number): void {
  const top = cy - cell * 0.26;
  const bottom = cy + cell * 0.26;
  const half = cell * 0.17;
  const cube = cell * 0.12;

  ctx.save();
  ctx.lineWidth = Math.max(1.2, cell * 0.06);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = palette.cold;

  ctx.fillStyle = 'rgba(74, 120, 194, 0.18)';
  ctx.fillRect(cx - half * 0.85, cy - cell * 0.06, half * 1.7, bottom - cy + cell * 0.04);
  ctx.fillStyle = palette.board;
  ctx.fillRect(cx - cube * 1.1, cy - cell * 0.02, cube, cube);
  ctx.strokeRect(cx - cube * 1.1, cy - cell * 0.02, cube, cube);
  ctx.fillRect(cx + cube * 0.1, cy + cube * 0.4, cube, cube);
  ctx.strokeRect(cx + cube * 0.1, cy + cube * 0.4, cube, cube);

  ctx.beginPath();
  ctx.moveTo(cx - half, top);
  ctx.lineTo(cx - half * 0.82, bottom);
  ctx.lineTo(cx + half * 0.82, bottom);
  ctx.lineTo(cx + half, top);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + half * 0.3, top + cell * 0.1);
  ctx.lineTo(cx + half * 0.9, top - cell * 0.12);
  ctx.stroke();
  ctx.restore();
}

function drawDrop(ctx: CanvasRenderingContext2D, cx: number, cy: number, cell: number): void {
  ctx.beginPath();
  ctx.arc(cx, cy, cell * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = palette.crema;
  ctx.fill();
  ctx.lineWidth = Math.max(1, cell * 0.05);
  ctx.strokeStyle = palette.cremaDeep;
  ctx.stroke();
}

function drawRivalCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cell: number,
  head: boolean,
  chilled: boolean,
): void {
  const inset = Math.max(2, cell * 0.12);
  const size = cell - inset * 2;
  const color = chilled ? palette.cold : palette.inkDim;

  roundedRect(ctx, x + inset, y + inset, size, size, Math.min(5, cell * 0.18));

  if (head) {
    ctx.fillStyle = color;
    ctx.fill();
    return;
  }

  ctx.strokeStyle = color;
  ctx.stroke();
}

/** Draws one item centred in a cell-sized box, for the board and for the legend. */
export function drawItem(
  ctx: CanvasRenderingContext2D,
  kind: ItemKind,
  x: number,
  y: number,
  cell: number,
): void {
  const cx = x + cell / 2;
  const cy = y + cell / 2;

  switch (kind) {
    case 'bean':
      drawBean(ctx, cx, cy, cell);
      return;
    case 'espresso':
      drawEspresso(ctx, cx, cy, cell);
      return;
    case 'coldbrew':
      drawColdbrew(ctx, cx, cy, cell);
      return;
    case 'drop':
      drawDrop(ctx, cx, cy, cell);
      return;
    case 'rival':
      ctx.save();
      ctx.lineWidth = Math.max(1.5, cell * 0.07);
      drawRivalCell(ctx, x, y, cell, true, false);
      ctx.restore();
  }
}

function drawSpecial(ctx: CanvasRenderingContext2D, special: Special, cell: number, now: number): void {
  const x = special.point.x * cell;
  const y = special.point.y * cell;
  const life = Math.max(0, (special.expiresAt - now) / (special.expiresAt - special.bornAt));

  drawItem(ctx, special.kind, x, y, cell);

  // How long the cup stays warm (or cold), as a ring that runs out.
  ctx.beginPath();
  ctx.arc(x + cell / 2, y + cell / 2, cell * 0.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * life);
  ctx.lineWidth = Math.max(1.5, cell * 0.06);
  ctx.lineCap = 'round';
  ctx.strokeStyle = special.kind === 'espresso' ? palette.cremaDeep : palette.cold;
  ctx.stroke();
}

function drawRival(ctx: CanvasRenderingContext2D, cpu: Cpu, cell: number, now: number): void {
  if (!cpu.alive) {
    return;
  }

  const chilled = now < cpu.slowUntil;

  ctx.save();
  ctx.lineWidth = Math.max(1.5, cell * 0.07);

  if (chilled) {
    ctx.setLineDash([Math.max(2, cell * 0.12), Math.max(2, cell * 0.1)]);
  }

  for (let index = cpu.body.length - 1; index >= 0; index -= 1) {
    const segment = cpu.body[index]!;
    drawRivalCell(ctx, segment.x * cell, segment.y * cell, cell, index === 0, chilled);
  }

  ctx.restore();
}

function gulpOffset(effects: readonly Effect[], now: number): number | null {
  const gulp = effects.find((effect) => effect.kind === 'gulp');
  return gulp ? progressOf(gulp, now) : null;
}

function drawPlayer(ctx: CanvasRenderingContext2D, scene: Scene, cell: number): void {
  const { state, now, overAt, reducedMotion } = scene;
  const length = state.snake.length;
  const gulp = reducedMotion ? null : gulpOffset(scene.effects, now);
  const inset = Math.max(1.5, cell * 0.08);
  const radius = Math.min(6, cell * 0.22);

  for (let index = length - 1; index >= 0; index -= 1) {
    const segment = state.snake[index]!;
    let alpha = 1 - (index / Math.max(1, length)) * 0.45;
    let grow = 0;

    // A bulge runs from the head to the tail as the snake swallows.
    if (gulp !== null) {
      grow = Math.max(0, 1 - Math.abs(index - gulp * (length - 1))) * cell * 0.12;
    }

    // After a crash the body fades from the head back, then stays as a ghost.
    if (overAt !== null) {
      const fade = reducedMotion ? 1 : Math.min(1, Math.max(0, (now - overAt - index * 22) / 180));
      alpha *= 1 - fade * 0.72;
      grow -= fade * cell * 0.08;
    }

    const size = cell - inset * 2 + grow * 2;
    ctx.globalAlpha = alpha;
    roundedRect(
      ctx,
      segment.x * cell + inset - grow,
      segment.y * cell + inset - grow,
      size,
      size,
      radius,
    );
    ctx.fillStyle = palette.ink;
    ctx.fill();
  }

  ctx.globalAlpha = 1;

  const head = state.snake[0];

  if (head && overAt === null) {
    drawEye(ctx, head, state.direction, cell);
  }
}

function drawEye(ctx: CanvasRenderingContext2D, head: Point, direction: Direction, cell: number): void {
  ctx.beginPath();
  ctx.arc(
    (head.x + 0.5 + direction.x * 0.18) * cell,
    (head.y + 0.5 + direction.y * 0.18) * cell,
    Math.max(1.5, cell * 0.11),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = palette.crema;
  ctx.fill();
}

function drawEffects(
  ctx: CanvasRenderingContext2D,
  effects: readonly Effect[],
  cell: number,
  cols: number,
  now: number,
  reducedMotion: boolean,
): void {
  const labelSize = Math.max(11, Math.round(cell * 0.42));

  for (const effect of effects) {
    const t = progressOf(effect, now);

    if (effect.kind === 'ring') {
      const reach = effect.tone === 'rival' ? 0.7 : 1.25;
      const radius = reducedMotion ? cell * 0.6 : cell * (0.35 + reach * easeOut(t));
      ctx.beginPath();
      ctx.arc((effect.at.x + 0.5) * cell, (effect.at.y + 0.5) * cell, radius, 0, Math.PI * 2);
      ctx.globalAlpha = 1 - t;
      ctx.lineWidth = Math.max(1, cell * 0.12 * (1 - t));
      ctx.strokeStyle = toneColor[effect.tone];
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (effect.kind === 'label') {
      const rise = reducedMotion ? 0 : easeOut(t) * cell * 0.8;
      ctx.globalAlpha = t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35;
      ctx.font = `${labelSize}px "Roboto Mono", monospace`;
      ctx.textBaseline = 'bottom';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 4;
      ctx.strokeStyle = palette.board;
      let x = (effect.at.x + 0.5) * cell;
      let y = effect.at.y * cell - cell * 0.15 - rise;
      ctx.textAlign = 'center';

      if (effect.beside) {
        // Beside the cell, on whichever side has room for the text.
        const room = (cols - effect.at.x - 1) * cell;
        const right = room >= ctx.measureText(effect.text).width + cell * 0.3;
        ctx.textAlign = right ? 'left' : 'right';
        x = right ? (effect.at.x + 1.15) * cell : (effect.at.x - 0.15) * cell;
        y = (effect.at.y + 0.85) * cell - rise;
      }

      ctx.strokeText(effect.text, x, y);
      ctx.fillStyle = toneColor[effect.tone];
      ctx.fillText(effect.text, x, y);
      ctx.globalAlpha = 1;
    }
  }
}

function shakeOffset(effects: readonly Effect[], now: number, reducedMotion: boolean): Point {
  const shake = reducedMotion ? undefined : effects.find((effect) => effect.kind === 'shake');

  if (!shake) {
    return { x: 0, y: 0 };
  }

  const strength = (1 - progressOf(shake, now)) * 4;
  return { x: Math.sin(now * 0.09) * strength, y: Math.cos(now * 0.11) * strength * 0.6 };
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  boardLayer: HTMLCanvasElement,
  ratio: number,
  scene: Scene,
): void {
  const { state, grid, effects, now, reducedMotion } = scene;
  const cell = grid.cell;
  const shake = shakeOffset(effects, now, reducedMotion);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(boardLayer, 0, 0);
  ctx.setTransform(ratio, 0, 0, ratio, (grid.x + shake.x) * ratio, (grid.y + shake.y) * ratio);

  for (const drop of state.drops) {
    drawDrop(ctx, (drop.x + 0.5) * cell, (drop.y + 0.5) * cell, cell);
  }

  drawBean(ctx, (state.food.x + 0.5) * cell, (state.food.y + 0.5) * cell, cell);

  if (state.special) {
    drawSpecial(ctx, state.special, cell, now);
  }

  drawRival(ctx, state.cpu, cell, now);
  drawPlayer(ctx, scene, cell);
  drawEffects(ctx, effects, cell, grid.cols, now, reducedMotion);
}

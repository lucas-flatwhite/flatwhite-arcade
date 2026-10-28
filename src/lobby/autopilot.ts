import { DIRECTIONS, samePoint, type Direction, type GameState, type Point } from '../snake/game';

/**
 * Steers the attract-mode snake: head for the nearest cup or bean, never into a wall or
 * a body, and never into a pocket too small to fit the snake. It plays well enough to
 * look like someone is at the controls, and badly enough to crash now and then.
 */
export function autopilot(state: GameState): Direction | null {
  const head = state.snake[0];

  if (!head) {
    return null;
  }

  const target = state.special?.point ?? state.food;
  const blocked = (point: Point): boolean =>
    point.x < 0 ||
    point.y < 0 ||
    point.x >= state.cols ||
    point.y >= state.rows ||
    state.snake.some((segment) => samePoint(segment, point)) ||
    (state.cpu.alive && state.cpu.body.some((segment) => samePoint(segment, point)));

  // How many cells can be reached from here, counted up to a little more than the snake needs.
  const room = (start: Point): number => {
    const limit = state.snake.length + 8;
    const seen = new Set([`${start.x},${start.y}`]);
    const queue = [start];

    while (queue.length > 0 && seen.size < limit) {
      const cell = queue.pop()!;

      for (const step of Object.values(DIRECTIONS)) {
        const next = { x: cell.x + step.x, y: cell.y + step.y };
        const key = `${next.x},${next.y}`;

        if (!seen.has(key) && !blocked(next)) {
          seen.add(key);
          queue.push(next);
        }
      }
    }

    return seen.size;
  };

  let best: Direction | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const direction of Object.values(DIRECTIONS)) {
    if (direction.x === -state.direction.x && direction.y === -state.direction.y) {
      continue;
    }

    const next = { x: head.x + direction.x, y: head.y + direction.y };

    if (blocked(next)) {
      continue;
    }

    const trapped = room(next) < state.snake.length + 4 ? 1000 : 0;
    const score = Math.abs(next.x - target.x) + Math.abs(next.y - target.y) + trapped;

    if (score < bestScore) {
      bestScore = score;
      best = direction;
    }
  }

  return best;
}

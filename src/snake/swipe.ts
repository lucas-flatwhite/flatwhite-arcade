import { DIRECTIONS, type Direction } from './game';

/**
 * Reads a finger as a stream of turns. A turn fires as soon as the finger has moved
 * far enough, not when it lifts, and the next turn is measured from there, so one
 * gesture can steer around a corner and back.
 */
export type SwipeTracker = {
  originX: number;
  originY: number;
  startX: number;
  startY: number;
  turned: boolean;
};

export function beginSwipe(x: number, y: number): SwipeTracker {
  return { originX: x, originY: y, startX: x, startY: y, turned: false };
}

export function moveSwipe(tracker: SwipeTracker, x: number, y: number, threshold: number): Direction | null {
  const dx = x - tracker.originX;
  const dy = y - tracker.originY;

  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
    return null;
  }

  tracker.originX = x;
  tracker.originY = y;
  tracker.turned = true;

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? DIRECTIONS.right : DIRECTIONS.left;
  }

  return dy > 0 ? DIRECTIONS.down : DIRECTIONS.up;
}

/** A tap is a touch that never turned and barely moved. */
export function isTap(tracker: SwipeTracker, x: number, y: number, threshold: number): boolean {
  return !tracker.turned && Math.hypot(x - tracker.startX, y - tracker.startY) < threshold;
}

import { describe, expect, it } from 'vitest';
import { DIRECTIONS } from '../src/snake/game';
import { beginSwipe, isTap, moveSwipe } from '../src/snake/swipe';

describe('swipe', () => {
  it('turns as soon as the finger passes the threshold, before it lifts', () => {
    const swipe = beginSwipe(100, 100);

    expect(moveSwipe(swipe, 110, 102, 16)).toBeNull();
    expect(moveSwipe(swipe, 120, 103, 16)).toEqual(DIRECTIONS.right);
  });

  it('steers around a corner in one gesture', () => {
    const swipe = beginSwipe(0, 0);

    expect(moveSwipe(swipe, 20, 0, 16)).toEqual(DIRECTIONS.right);
    expect(moveSwipe(swipe, 22, 4, 16)).toBeNull();
    expect(moveSwipe(swipe, 22, -20, 16)).toEqual(DIRECTIONS.up);
  });

  it('tells a tap from a swipe', () => {
    const tap = beginSwipe(50, 50);
    expect(isTap(tap, 53, 52, 16)).toBe(true);

    const swipe = beginSwipe(50, 50);
    moveSwipe(swipe, 80, 50, 16);
    expect(isTap(swipe, 50, 50, 16)).toBe(false);
  });
});

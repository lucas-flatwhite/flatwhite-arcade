import { describe, expect, it } from 'vitest';
import { autopilot } from '../src/lobby/autopilot';
import { DIRECTIONS, createGame, createRandom, pickCard, step, turn, type GameState } from '../src/snake/game';

function quietGame(): GameState {
  const state = createGame(16, 12, createRandom(3));
  state.cpu.alive = false;
  state.cpu.body = [];
  state.cpu.respawnAt = Number.POSITIVE_INFINITY;
  return state;
}

describe('attract-mode autopilot', () => {
  it('heads for the nearest bean', () => {
    const state = quietGame();
    state.snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
    state.foods = [{ x: 5, y: 1 }, { x: 14, y: 10 }];

    expect(autopilot(state)).toEqual(DIRECTIONS.up);
  });

  it('prefers a waiting cup over the bean', () => {
    const state = quietGame();
    state.snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
    state.foods = [{ x: 5, y: 1 }];
    state.special = { point: { x: 5, y: 10 }, kind: 'espresso', bornAt: 0, expiresAt: 9999 };

    expect(autopilot(state)).toEqual(DIRECTIONS.down);
  });

  it('turns away from the wall instead of running into it', () => {
    const state = quietGame();
    state.snake = [{ x: 15, y: 5 }, { x: 14, y: 5 }, { x: 13, y: 5 }];
    state.foods = [{ x: 15, y: 0 }];

    expect(autopilot(state)).toEqual(DIRECTIONS.up);
  });

  it('keeps a demo round alive for a good while, picking cards when drafts open', () => {
    const state = quietGame();
    const random = createRandom(11);
    turn(state, DIRECTIONS.right);

    let steps = 0;

    while (state.phase !== 'over' && steps < 300) {
      while (state.phase === 'draft' && state.draft && state.draft.length > 0) {
        pickCard(state, state.draft[0]!, steps * 100, random);
      }

      const next = autopilot(state);

      if (next) {
        turn(state, next);
      }

      step(state, random, steps * 100);
      steps += 1;
    }

    expect(steps).toBeGreaterThan(60);
    expect(state.peakLength).toBeGreaterThan(5);
  });
});

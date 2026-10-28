import { describe, expect, it } from 'vitest';
import { effectsFor, liveEffects, progressOf, type Effect } from '../src/snake/effects';
import type { GameEvent } from '../src/snake/game';

const at = { x: 3, y: 4 };
const events: GameEvent[] = [
  { type: 'bean', at, combo: 1 },
  { type: 'bean', at, combo: 4 },
  { type: 'drop', at, combo: 2 },
  { type: 'special', at, kind: 'espresso', combo: 3 },
  { type: 'special', at, kind: 'coldbrew', combo: 1 },
  { type: 'ko', at, combo: 1 },
  { type: 'cpu-ate', at },
  { type: 'death', at },
];

describe('effects', () => {
  it('keeps every effect short, even on a long snake', () => {
    for (const event of events) {
      for (const effect of effectsFor(event, 0, 400)) {
        expect(effect.duration).toBeGreaterThan(0);
        expect(effect.duration).toBeLessThanOrEqual(720);
      }
    }
  });

  it('answers a step with at most three effects', () => {
    for (const event of events) {
      expect(effectsFor(event, 0, 10).length).toBeLessThanOrEqual(3);
    }
  });

  it('labels what a pickup gave, including the combo bonus', () => {
    const label = (event: GameEvent) =>
      effectsFor(event, 0, 10).find((effect): effect is Extract<Effect, { kind: 'label' }> => effect.kind === 'label')?.text;

    expect(label({ type: 'bean', at, combo: 1 })).toBe('+2');
    expect(label({ type: 'bean', at, combo: 4 })).toBe('+4 · 4x');
    expect(label({ type: 'special', at, kind: 'espresso', combo: 3 })).toBe('espresso +4 · 3x');
    expect(label({ type: 'ko', at, combo: 1 })).toBe('KO +3');
  });

  it('floats a label beside a snake heading up or down, so the head never runs into it', () => {
    const label = (heading: { x: number; y: number }) =>
      effectsFor({ type: 'bean', at, combo: 1 }, 0, 10, heading).find((effect) => effect.kind === 'label');

    expect(label({ x: 0, y: -1 })).toMatchObject({ beside: true });
    expect(label({ x: 1, y: 0 })).toMatchObject({ beside: false });
  });

  it('drops effects once they have played out', () => {
    const effects = effectsFor({ type: 'bean', at, combo: 1 }, 100, 10);

    expect(liveEffects(effects, 150)).toHaveLength(3);
    expect(liveEffects(effects, 2000)).toHaveLength(0);
    expect(progressOf(effects[0]!, 100 + effects[0]!.duration / 2)).toBeCloseTo(0.5);
  });
});

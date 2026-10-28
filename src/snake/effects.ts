import { beanGrowth, type Direction, type GameEvent, type Point } from './game';

/**
 * Every effect lives on a few cells for a few hundred milliseconds. None of them lays
 * out text per frame or touches more than a handful of cells, so their cost stays flat
 * on any device.
 */
export type Effect =
  | { kind: 'ring'; at: Point; bornAt: number; duration: number; tone: Tone }
  | { kind: 'label'; at: Point; bornAt: number; duration: number; text: string; tone: Tone; beside: boolean }
  | { kind: 'gulp'; bornAt: number; duration: number }
  | { kind: 'shake'; bornAt: number; duration: number };

export type Tone = 'crema' | 'ink' | 'cold' | 'rival';

export const effectTiming = {
  ringMs: 340,
  labelMs: 720,
  gulpMsPerCell: 34,
  gulpMaxMs: 520,
  shakeMs: 220,
} as const;

/**
 * Turns what the rules reported this step into the effects that answer it. A label
 * floats above a snake running sideways and beside one running up or down, so the
 * head never runs into its own score.
 */
export function effectsFor(
  event: GameEvent,
  now: number,
  length: number,
  heading: Direction = { x: 1, y: 0 },
): Effect[] {
  const ring = (tone: Tone): Effect => ({
    kind: 'ring',
    at: event.at,
    bornAt: now,
    duration: effectTiming.ringMs,
    tone,
  });
  const label = (text: string, tone: Tone): Effect => ({
    kind: 'label',
    at: event.at,
    bornAt: now,
    duration: effectTiming.labelMs,
    text,
    tone,
    beside: heading.y !== 0,
  });
  const gulp: Effect = {
    kind: 'gulp',
    bornAt: now,
    duration: Math.min(effectTiming.gulpMaxMs, length * effectTiming.gulpMsPerCell),
  };
  const combo = (count: number): string => (count >= 2 ? ` · ${count}x` : '');

  switch (event.type) {
    case 'bean':
      return [ring('crema'), gulp, label(`+${beanGrowth(event.combo)}${combo(event.combo)}`, 'ink')];
    case 'drop':
      return [ring('crema'), gulp, label(`+2${combo(event.combo)}`, 'ink')];
    case 'special':
      return event.kind === 'espresso'
        ? [ring('crema'), gulp, label(`espresso +4${combo(event.combo)}`, 'crema')]
        : [ring('cold'), gulp, label('cold brew · rival slows', 'cold')];
    case 'ko':
      return [ring('ink'), label(`KO +3${combo(event.combo)}`, 'ink')];
    case 'cpu-ate':
      return [ring('rival')];
    case 'death':
      return [ring('ink'), { kind: 'shake', bornAt: now, duration: effectTiming.shakeMs }];
  }
}

export function liveEffects(effects: readonly Effect[], now: number): Effect[] {
  return effects.filter((effect) => now - effect.bornAt < effect.duration);
}

export function progressOf(effect: Effect, now: number): number {
  return Math.min(1, Math.max(0, (now - effect.bornAt) / effect.duration));
}

/** Eases out quickly, the way a ring of crema spreads and settles. */
export function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const chip = readFileSync(resolve(process.cwd(), 'src/shared/arcade-chip.css'), 'utf8');

describe('arcade chip', () => {
  it('marks the block suika-balls copies', () => {
    expect(chip.indexOf('/* arcade-chip:start */')).toBeLessThan(chip.indexOf('/* arcade-chip:end */'));
  });

  it('is 36px tall with a 44px touch target', () => {
    expect(chip).toContain('height: 36px;');
    expect(chip).toContain('inset: -4px 0;');
  });

  it('shows the word above 480px and only the arrow below', () => {
    expect(chip).toContain('width: 96px;');
    expect(chip).toMatch(/@media \(max-width: 479\.98px\) \{\s+\.arcade-chip \{\s+width: 44px;/);
    expect(chip).toMatch(/\.arcade-chip-label \{\s+display: none;/);
  });

  it('carries no repository tokens, so the copy works on its own', () => {
    expect(chip).not.toContain('var(--');
  });
});

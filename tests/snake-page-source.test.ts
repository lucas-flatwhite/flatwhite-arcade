import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const page = read('snake/index.html');
const styles = read('src/snake/snake.css');
const pkg = JSON.parse(read('package.json'));

describe('snake page', () => {
  it('has a ready card, a pause card and a result card over the board', () => {
    expect(page).toContain('data-overlay="ready"');
    expect(page).toContain('data-overlay="paused" aria-labelledby="paused-title" hidden');
    expect(page).toContain('data-overlay="over" aria-labelledby="over-title" hidden');
    expect(page).toContain('role="status" data-status');
  });

  it('explains every item on the board before the first round', () => {
    for (const icon of ['bean', 'espresso', 'coldbrew', 'rival']) {
      expect(page).toContain(`data-icon="${icon}"`);
    }
  });

  it('gives touch players a pause button and a way back to the lobby', () => {
    expect(page).toContain('<button class="game-pause" type="button" data-pause');
    expect(page).toContain(
      '<a class="arcade-chip" href="https://www.lucasflatwhite.com/arcade/" aria-label="Back to Arcade">',
    );
    expect(page).toContain('<span class="arcade-chip-label">Arcade</span>');
  });

  it('puts the Arcade chip where every game puts it', () => {
    expect(read('src/snake/main.ts')).toContain("import '../shared/arcade-chip.css';");
    expect(styles).toContain('8px max(12px, env(safe-area-inset-left));');
  });

  it('keeps the board still under a finger and the page from scrolling', () => {
    expect(styles).toContain('touch-action: none;');
    expect(styles).toContain('body.play {\n  overflow: hidden;');
  });

  it('no longer ships the word field or its layout engine', () => {
    expect(pkg.dependencies).not.toHaveProperty('@chenglou/pretext');
    expect(page).not.toContain('data-experience');
  });
});

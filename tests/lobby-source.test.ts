import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const lobby = read('index.html');
const styles = read('src/lobby/lobby.css');
const vite = read('vite.config.ts');

describe('lobby', () => {
  it('starts the selected game from a real link, so it works before any script runs', () => {
    expect(lobby).toContain('<a class="start" href="/arcade/snake/" data-start>');
  });

  it('links every playable cartridge by its full /arcade/ path', () => {
    const hrefs = [...lobby.matchAll(/data-href="([^"]+)"/g)].map((match) => match[1]);

    expect(hrefs).toEqual(['/arcade/snake/', '/arcade/suika/']);
  });

  it('lists the lineup under Start, in a box that scrolls on its own as it grows', () => {
    expect(lobby.indexOf('data-start')).toBeLessThan(lobby.indexOf('class="lineup"'));
    expect(styles).toMatch(/\.lineup-list \{[^}]*overflow-y: auto;/);
  });

  it('describes the live demo to screen readers as one picture', () => {
    expect(lobby).toContain('role="img" aria-label="A handheld playing a live demo of Snake"');
  });

  it('builds the lobby and Snake locally while Suika is served independently', () => {
    expect(vite).toContain("base: '/arcade/'");
    expect(vite).toContain("outDir: 'dist/arcade'");
    expect(vite).toContain("'snake/index.html'");
  });
});

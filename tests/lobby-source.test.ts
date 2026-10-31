import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const lobby = read('index.html');
const styles = read('src/lobby/lobby.css');
const vite = read('vite.config.ts');
const shareImage = read('scripts/og-image.html');

describe('lobby', () => {
  it('starts the selected game from a real link, so it works before any script runs', () => {
    expect(lobby).toContain('<a class="start" href="/arcade/snake/" data-start>');
  });

  it('links every playable cartridge by its full /arcade/ path', () => {
    const hrefs = [...lobby.matchAll(/data-href="([^"]+)"/g)].map((match) => match[1]);

    expect(hrefs).toEqual(['/arcade/snake/', '/arcade/suika/']);
  });

  it('puts the lineup first, in a box that scrolls on its own as it grows', () => {
    expect(lobby.indexOf('class="lineup"')).toBeLessThan(lobby.indexOf('class="pitch"'));
    expect(lobby.indexOf('class="pitch"')).toBeLessThan(lobby.indexOf('class="device-stage"'));
    expect(styles).toMatch(/\.lineup-list \{[^}]*overflow-y: auto;/);
  });

  it('links each cartridge to its own repository, beside its row rather than inside the button', () => {
    const sources = [...lobby.matchAll(/class="cart-source"\s+href="([^"]+)"/g)].map((match) => match[1]);

    expect(sources).toEqual([
      'https://github.com/lucas-flatwhite/flatwhite-arcade',
      'https://github.com/lucas-flatwhite/suika-balls',
    ]);
    expect(lobby).not.toMatch(/<button[^>]*>(?:(?!<\/button>)[\s\S])*<a /);
  });

  it('gives the device its own column, so a longer pitch never moves it', () => {
    expect(styles).toContain("grid-template-areas: 'lineup pitch device';");
    expect(styles).toMatch(/'lineup device'\s+'pitch {2}device';/);
    expect(styles).toMatch(/grid-template-areas:\s+'lineup'\s+'device'\s+'pitch';/);
  });

  it('sets the A and B buttons side by side without overlap', () => {
    const px = (pattern: RegExp) => Number(styles.match(pattern)?.[1]);
    const size = px(/\.ab-button \{[^}]*width: (\d+)px;/);
    const b = px(/\.ab-button\.is-b \{[^}]*left: (\d+)px;/);
    const a = px(/\.ab-button\.is-a \{[^}]*left: (\d+)px;/);

    expect(a - b).toBeGreaterThan(size);
  });

  it('shows no model codes or status tags', () => {
    expect(lobby).not.toMatch(/FA-\d/);
    expect(shareImage).not.toMatch(/FA-\d/);
    expect(lobby).not.toContain('data-status');
  });

  it('keeps the share image copy true as games are added, naming none of them', () => {
    expect(shareImage).toContain('<p class="line">Small games, one cartridge at a time.</p>');
    expect(shareImage).not.toContain('class="tags"');
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

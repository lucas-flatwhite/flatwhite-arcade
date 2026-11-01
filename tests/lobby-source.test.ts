import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { homeCommand, matches, readSiteCommands } from '../src/shared/palette';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const lobby = read('index.html');
const styles = read('src/lobby/lobby.css');
const vite = read('vite.config.ts');
const shareImage = read('scripts/og-image.html');
const main = read('src/lobby/main.ts');

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

  it('keeps the three columns in one stage, so no gap opens in the middle of a wide screen', () => {
    expect(styles).toMatch(/\.site-bar,\s+\.floor \{[^}]*max-width: 1440px;/);
    expect(styles).toMatch(/\.floor \{[^}]*grid-template-columns: 248px minmax\(0, \d+px\) auto;[^}]*justify-content: space-between;/);
  });

  it('shows the way back as a breadcrumb under the homepage, not as a link off to the side', () => {
    expect(lobby).toContain('<nav class="crumbs" aria-label="Breadcrumb">');
    expect(lobby).toMatch(/<a class="crumb-home" href="https:\/\/www\.lucasflatwhite\.com\/">/);
    expect(lobby).toContain('aria-current="page">Flatwhite Arcade</a>');
    expect(lobby).not.toContain('site-nav');
  });

  it('opens the same Cmd/Ctrl+K menu as the homepage, from a button that waits for script', () => {
    expect(lobby).toMatch(/<button\s+class="palette-trigger"[^>]*data-palette-open[^>]*hidden\s*>/);
    expect(main).toContain('mountPalette([...gameCommands(rows), homeCommand], loadSiteCommands());');
    // Arrows and Enter typed into the menu must not also move or start the lineup.
    expect(main).toContain('event.defaultPrevented');
  });

  it('takes the homepage links from its /commands.json instead of keeping a copy', () => {
    const palette = read('src/shared/palette.ts');

    expect(palette).toContain("`${SITE}commands.json`");
    expect(palette).not.toMatch(/github\.com\/lucas-flatwhite|x\.com|gmail/);
  });

  it('reads /commands.json, skipping the Arcade entry and anything it cannot trust', () => {
    const command = (id: string, href: string, extra: object = {}) => ({
      id,
      label: id,
      hint: `${id} hint`,
      icon: ['M0,0Z'],
      href,
      external: false,
      copy: null,
      ...extra,
    });
    const read = readSiteCommands({
      version: 1,
      commands: [
        command('work', 'https://lucasflatwhite.com/#work'),
        command('arcade', 'https://lucasflatwhite.com/arcade/'),
        command('github', 'https://github.com/lucas-flatwhite', { external: true }),
        command('email', 'mailto:someone@example.com', { copy: 'someone@example.com' }),
        command('script', 'javascript:alert(1)'),
        command('plain', 'http://example.com/'),
        { id: 'broken' },
        null,
      ],
    });

    expect(read.map((entry) => entry.id)).toEqual(['site-work', 'site-github', 'site-email']);
    expect(read.find((entry) => entry.id === 'site-github')?.external).toBe(true);
    expect(read.find((entry) => entry.id === 'site-email')?.copy).toBe('someone@example.com');
    expect(readSiteCommands({ version: 2, commands: [command('work', 'https://lucasflatwhite.com/')] })).toEqual([]);
    expect(readSiteCommands('nope')).toEqual([]);
  });

  it('keeps the way home in the menu even when the homepage list cannot load', () => {
    expect(homeCommand.href).toBe('https://www.lucasflatwhite.com/');
    expect(matches(homeCommand, 'HOMEPAGE')).toBe(true);
    expect(matches(homeCommand, 'snake')).toBe(false);
    expect(matches(homeCommand, '  ')).toBe(true);
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

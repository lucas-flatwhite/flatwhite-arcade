import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const page = read('snake/index.html');
const styles = read('src/snake/snake.css');
const fonts = read('src/shared/fonts.css');
const base = read('src/shared/base.css');

describe('snake page source contract', () => {
  it('keeps only the compact top strip and removes the left intro panel', () => {
    expect(page).toContain('<a class="identity-label" href="https://lucasflatwhite.com/">/lucas-flatwhite</a>');
    expect(page).toContain('class="identity-strip"');
    expect(page).toContain('class="identity-score" data-experience-score');
    expect(page).toContain('<a href="/arcade/">Arcade</a>');
    expect(page).toContain('<body class="play">');
    expect(page).toContain('<meta name="theme-color" content="#06070f" />');
    expect(page).not.toContain('class="experience-copy"');
    expect(page).not.toContain('data-experience-restart');
    expect(page).not.toContain('class="experience-overlay"');
    expect(page).not.toContain('class="experience-hud"');
  });

  it('opens every outside link in a new tab', () => {
    const outside = [...page.matchAll(/<a href="(https:[^"]+)"([^>]*)>/g)];

    expect(outside.length).toBeGreaterThan(0);
    for (const [, , attributes] of outside) {
      expect(attributes).toContain('target="_blank"');
      expect(attributes).toContain('rel="noreferrer"');
    }
  });
});

describe('snake styles source contract', () => {
  it('defines the one-screen game surface and identity overlay hooks', () => {
    expect(styles).toContain('.experience-shell');
    expect(styles).toContain('.game-panel');
    expect(styles).toContain('.identity-strip');
    expect(styles).toContain('.experience-stage');
    expect(styles).toContain('touch-action: none;');
    expect(styles).toContain('height: 100dvh;');
    expect(styles).toContain('border-radius: 0;');
    expect(styles).toContain("grid-template-areas: 'label score links';");
    expect(styles).toContain("grid-template-areas:\n      'label links'\n      'score score';");
    expect(styles).not.toContain('.experience-copy');
    expect(styles).not.toContain('.experience-hud');
  });

  it('locks scrolling only on the game page and loads fonts through the bundler', () => {
    expect(styles).toContain('body.play {\n  overflow: hidden;');
    expect(base).not.toMatch(/body\s*\{[^}]*overflow:\s*hidden/);
    expect(fonts).toContain("url('../assets/fonts/roboto-mono-400.ttf')");
    expect(fonts).not.toContain("url('/assets/");
  });
});

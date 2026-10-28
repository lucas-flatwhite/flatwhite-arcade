import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const lobby = read('index.html');
const vite = read('vite.config.ts');

describe('lobby source contract', () => {
  it('links every cabinet by its full /arcade/ path', () => {
    const cabinets = [...lobby.matchAll(/class="cabinet-link" href="([^"]+)"/g)].map((match) => match[1]);

    expect(cabinets).toEqual(['/arcade/snake/']);
  });

  it('builds every page it links to', () => {
    expect(vite).toContain("base: '/arcade/'");
    expect(vite).toContain("outDir: 'dist/arcade'");
    expect(vite).toContain("'snake/index.html'");
  });
});

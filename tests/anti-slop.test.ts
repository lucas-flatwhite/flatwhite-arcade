import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// The same type rules lucasflatwhite.com holds its own source to.
const TEXT_EXTENSIONS = new Set(['.html', '.ts', '.css', '.md']);

function collect(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    if (statSync(path).isDirectory()) {
      return collect(path);
    }

    return TEXT_EXTENSIONS.has(extname(name)) ? [path] : [];
  });
}

const root = process.cwd();
const files = [...collect(resolve(root, 'src')), ...collect(resolve(root, 'snake')), resolve(root, 'index.html')].map(
  (path) => ({ path, source: readFileSync(path, 'utf8') }),
);

describe('anti-slop contract', () => {
  it('ships no em or en dashes anywhere in the source', () => {
    const offenders = files.filter((file) => /[–—]/.test(file.source)).map((file) => file.path);
    expect(offenders).toEqual([]);
  });

  it('never reaches for the training-data default faces', () => {
    const banned = /(Inter|Space Grotesk|Space Mono|IBM Plex|Fraunces|Playfair|Instrument|DM Sans|DM Serif|Outfit)['",]/;
    const offenders = files.filter((file) => banned.test(file.source)).map((file) => file.path);
    expect(offenders).toEqual([]);
  });
});

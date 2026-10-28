# flatwhite-arcade

Small games from [lucasflatwhite.com](https://lucasflatwhite.com), served at [lucasflatwhite.com/arcade](https://lucasflatwhite.com/arcade/).

| Cabinet | Path | What it is |
|---|---|---|
| 01 Snake | `/arcade/snake/` | Snake in a dense field of Korean and English words. Race a CPU rival to the same food and set off typographic bursts laid out with [pretext](https://github.com/chenglou/pretext). |

## Run it

```sh
npm install
npm run dev      # http://localhost:5173/arcade/
npm test         # vitest
npm run build    # typecheck, then build into dist/arcade/
npm run preview  # http://localhost:4173/arcade/
```

## How it is served

- Vite builds every page under `dist/arcade/` with `base: '/arcade/'`, so the files sit at the same paths here and on lucasflatwhite.com.
- This repository deploys as its own Vercel project (`flatwhite-arcade.vercel.app`). `vercel.json` sends `/` to `/arcade/` and adds trailing slashes.
- lucasflatwhite.com rewrites `/arcade/*` to this project, the same way it serves `/ai-timeline-log/`. The old `/play` address redirects to `/arcade/snake/`.
- Pages run on the same origin as the site, so the snake's best score in `localStorage` (`lucas-flatwhite:best-length`) carries over from the old `/play` page.

## Layout

```
index.html            # Lobby: one cabinet per game
snake/index.html      # Snake page shell and identity strip
src/
  shared/             # Resets and the Roboto Slab / Roboto Mono faces every page uses
  lobby/              # Lobby styles
  snake/
    experience.ts     # Engine: rules, CPU rival, word field, bursts, input, rendering
    data.ts           # Tuning (playfieldConfig), word pool, burst phrases
    snake.css         # Full-screen game surface and top strip
  assets/fonts/
public/               # Favicon and share image, served under /arcade/
tests/                # Source contracts for the engine, pages, styles and type rules
```

## Adding a cabinet

1. Put the page at `<game>/index.html` and its code in `src/<game>/`.
2. Add the page to `build.rollupOptions.input` in `vite.config.ts`.
3. Add a `cabinet-link` to `index.html` with its full `/arcade/<game>/` path.

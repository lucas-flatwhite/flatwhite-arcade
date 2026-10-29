# flatwhite-arcade

Small games from [lucasflatwhite.com](https://lucasflatwhite.com), served at [lucasflatwhite.com/arcade](https://lucasflatwhite.com/arcade/).

| Cabinet | Path | What it is |
|---|---|---|
| 01 Snake | `/arcade/snake/` | Snake on a paper board. Race a CPU rival to the beans, drink espresso for a combo, chill the rival with cold brew, and trap it with your own body for a KO. |

## Run it

```sh
npm install
npm run dev      # http://localhost:5173/arcade/
npm test         # vitest
npm run build    # typecheck, then build into dist/arcade/
npm run preview  # http://localhost:4173/arcade/
```

## How it is served

- `public/og-image.png` is the share image for every page. Its source is `scripts/og-image.html`, drawn with the same handheld as the arcade card on lucasflatwhite.com.
- Vite builds every page under `dist/arcade/` with `base: '/arcade/'`, so the files sit at the same paths here and on lucasflatwhite.com.
- This repository deploys as its own Vercel project (`flatwhite-arcade.vercel.app`). `vercel.json` sends `/` to `/arcade/` and adds trailing slashes.
- lucasflatwhite.com rewrites `/arcade/*` to this project, the same way it serves `/ai-timeline-log/`. The homepage's arcade card links to the lobby, and the old `/play` address is gone.
- Pages run on the same origin as the site, so the snake's best score in `localStorage` (`lucas-flatwhite:best-length`) carries over from the old `/play` page.

## Lobby

- **Layout** (`index.html`, `src/lobby/lobby.css`): The selected game's pitch on the left (model, status, title, copy, Start) with the lineup under it, and a paper handheld on the right. On a phone they stack, with the handheld between the title and the copy. The handheld is plain HTML and CSS and shrinks as a whole with `zoom` on shorter or narrower screens.
- **Live demo** (`src/lobby/attract.ts`): The handheld's screen plays Snake by itself with the real rules and renderer, steered by `src/lobby/autopilot.ts`. It runs only while the screen is in view, the tab is visible and the slot holds a game; with reduced motion it shows one still.
- **Lineup**: Each cartridge is a row whose `data-*` attributes carry its pitch. Choosing a row swaps the pitch and lifts the cartridge out and back in. ↑ ↓ choose, Enter starts. Start is a real link, so it works before any script runs. The list scrolls inside its own box, so the page stays one screen as games are added.

## Snake

- **Board**: The short side always holds 18 cells, so a phone (18×38) and a desktop (30×18) play the same game at a size a thumb can follow. A round in play keeps its cells when the field resizes, as it does when a phone's URL bar folds away.
- **Rules** (`src/snake/game.ts`): No DOM and no clock. `step` takes the world time and returns what happened (`bean`, `special`, `drop`, `ko`, `cpu-ate`, `death`), so `tests/snake-game.test.ts` plays rounds cell by cell.
- **Effects** (`src/snake/effects.ts`): Each event gets at most three effects, none longer than 720 ms: a crema ring, a gulp that runs down the body, a label beside the head, and a short shake on a crash. None lays out text per frame, so the cost per frame stays flat on any device. With reduced motion, rings stay still and the gulp and shake are off.
- **Drawing** (`src/snake/render.ts`): The page, board and dot grid are painted once per resize into a layer. Each frame copies that layer and draws the pieces on top.
- **Loop and input** (`src/snake/main.ts`): The loop sleeps whenever nothing moves: on the ready, pause and result cards. A swipe turns as soon as the finger has moved about half a cell and can chain turns without lifting (`src/snake/swipe.ts`). The round waits for the first turn, pauses with Space, Enter, P, Escape or the Pause button, and pauses itself when the tab is hidden.

## Return to the lobby

Every game should keep a top-level HTML link to `https://lucasflatwhite.com/arcade/`, outside its board and overlays. Snake keeps this link visible on the ready, playing, paused and result screens, with a 44px touch target and native keyboard activation. The canonical URL also works when the game is opened directly on its independent deployment.

## Layout

```
index.html            # Lobby: pitch, lineup and the handheld
snake/index.html      # Snake page: top bar, board, and the ready, pause and result cards
src/
  shared/             # Paper, ink and crema tokens; Anybody and Roboto Mono, plus Noto Sans KR for Korean pages
  lobby/              # Selection and keys, the live demo and its autopilot, styles
  snake/
    game.ts           # Rules: board size, steps, rival, combo, events
    effects.ts        # Short effects that answer each event
    render.ts         # Board layer, pieces and effects on canvas
    swipe.ts          # Finger to turns
    main.ts           # Loop, keys, pointer, cards, best length
    snake.css
  assets/fonts/
public/               # Favicon and share image, served under /arcade/
tests/                # Rules, effects and swipe behaviour; page and type checks
```

## Adding a cartridge

1. Put the page at `<game>/index.html` and its code in `src/<game>/`.
2. Add the page to `build.rollupOptions.input` in `vite.config.ts`.
3. Add a `cart-row` button to the lineup in `index.html` with its `data-model`, `data-status`, `data-title`, `data-description`, `data-meta`, `data-label` and `data-href="/arcade/<game>/"`, and update the slot count.

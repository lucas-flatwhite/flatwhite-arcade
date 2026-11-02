# Flatwhite Arcade

English | [한국어](README.ko.md)

Small games for a short break, made for the browser. Pick a cartridge and play, with a paper handheld as the lobby and a way back from every game.

[Play at lucasflatwhite.com/arcade](https://www.lucasflatwhite.com/arcade/)

## Games

| Game | What you play |
| --- | --- |
| [Snake](https://www.lucasflatwhite.com/arcade/snake/) | Race a CPU rival for coffee beans. Espresso builds your combo, cold brew slows your rival, and your body can trap it. Play with arrow keys, WASD or swipes. |
| [Beach Ball Merge](https://www.lucasflatwhite.com/arcade/suika/) | Drop sports balls and merge matching pairs into a beach ball. Play solo or with a friend in local two-player mode on one desktop. |

The lobby runs a live Snake demo and lets you browse with the keyboard. Both games keep your best score in the browser.

This repository contains the lobby and Snake, built with TypeScript, Canvas and Vite. Beach Ball Merge has its own Godot code and deployment in [suika-balls](https://github.com/lucas-flatwhite/suika-balls). They share one arcade address, so each game can use the tools that suit it.

## Run locally

```sh
npm install
npm run dev          # http://localhost:5173/arcade/
```

```sh
npm test -- --run
npm run build
npm run preview      # http://localhost:4173/arcade/
```

To play Beach Ball Merge, use the live site; its code is not part of the local build. See [development notes](docs/development.md) for routing, game internals and adding a cartridge.

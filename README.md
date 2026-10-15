# Carom

**A little motion. A different trajectory.**

Carom is a browser-only, top-down paddle duel. Moving your paddle at contact adds spin to the ball; two swaying, rotating obstacles turn every rally into a bank-shot puzzle. Play against the machine in **Solo**, or share a keyboard in **Versus**. First to 11 wins, with a two-point lead.

Everything is drawn on canvas and every sound is synthesized. There are no external assets, runtime requests, accounts, or backend services.

## Run locally

Requires Node.js compatible with Vite 8 (Node 22.12+ recommended).

```sh
npm ci
npm run dev
```

Open the URL printed by Vite.

## Production

```sh
npm ci
npm run build
```

The complete static site is emitted to `dist/`, with `dist/index.html` as its entry point. Serve that directory at the root of any static host. Use `npm run preview` to check the production build locally.

## Controls

| Action | Keyboard |
| --- | --- |
| Left paddle | W / S |
| Right paddle in Versus | ↑ / ↓ |
| Solo paddle | W / S or ↑ / ↓ |
| Navigate menus | W / S or ↑ / ↓ |
| Confirm | Enter / Space |
| Pause / resume | P / Escape |
| Back | Escape |
| Toggle sound | M |
| Debug overlay | Backtick |

Menus also support mouse and touch. On a touchscreen, the engine supplies two vertical paddle sliders and menu controls. Move the paddle as the ball makes contact to bend its flight. Edge hits send sharper angles; blue obstacle faces and the top and bottom walls reflect the ball.

## Development

```sh
npm run typecheck
npm run lint
npm run format
npm test
```

The game uses the supplied Simple 2D runtime for timing, input, audio, canvas fitting, diagnostics, and draw-command recording. `src/game.ts` exports the state contract and game. Simulation, collision, menus, drawing, initialization, and debug operations live in separate modules beside it. Transitions build new state values; rendering never advances the simulation.

Tests stand up real engine instances with native in-memory canvases and counted clocks. They exercise menu transitions, pointer gestures, paddle integration, collisions, spin, AI, serving, win-by-two scoring, muted cue events, recording, and debug poses. The debug surface is available only from an engine's `debug` property; no game API is installed on the browser page.

The player-facing presentation, screenshots, and a four-second engine-recorded rally are in `showcase/`.

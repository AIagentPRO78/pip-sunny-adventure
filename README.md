# Pip's Sunny Adventure 🦖

A cute side-scrolling T-rex platformer for kids. Runs in any modern browser with
no build step and no internet connection — just open `index.html`.

## How to play

- **Move:** Arrow keys / `A` `D` (or the on-screen ◀ ▶ buttons on phones)
- **Jump / double-jump:** `Space` / `↑` / `W` — or tap the **JUMP** button, or tap the screen
- **Roar & ground-stomp:** `R` / `X` — or the **ROAR** button
- **Goal:** collect apples, eggs and stars, then reach the flag

## Things to do

- Hop on friendly critters for a happy bounce (nobody gets hurt)
- Head-bump a mystery box `?` — a **steak** pops out; eat it to grow **bigger**
- Roar to pop boxes, scatter butterflies and cheer the critters
- Fall in a pit? No game over — Pip just hops back to safe ground

## Run locally

Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Project layout

| File | Purpose |
|------|---------|
| `index.html` | Page, HUD, start/win screens, touch controls |
| `style.css` | Layout, screens, kid-friendly touch buttons |
| `audio.js` | Procedural Web Audio sound effects (no asset files) |
| `sprites.js` | All cartoon art drawn with canvas vectors |
| `game.js` | Engine: input, physics, level, camera, game loop |

No dependencies. No tracking. Everything is self-contained.

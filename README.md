# Pixel Runner (Phaser 3 + Vite)

A small pixel-art platformer built with Phaser 3 and Vite. Run, jump, collect coins, and reach the flag.

## Local run

```bash
npm i
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`).

## Build

```bash
npm run build
```

The static build is generated in `dist/`.

## Deployment

### Option A: GitHub Pages (Vite)

1) The project already has a GitHub Actions workflow at `.github/workflows/pages.yml`.
2) The workflow sets `BASE_PATH` to `/${{ github.event.repository.name }}/` so asset paths work on Pages.
3) Push to `main`, then enable Pages in your repo settings to serve from GitHub Actions.

If you rename the repo, update `BASE_PATH` or keep using the automatic workflow env.

### Option B: itch.io (HTML5)

1) Run `npm run build`.
2) Zip the contents of `dist/` (not the folder itself).
3) Upload the zip as an HTML5 project on itch.io and mark it as playable in browser.

## Controls

- Move: A/D or Arrow Keys
- Jump: W, Space, or Up Arrow
- Autoplay (testing): P

## AI usage

This codebase was generated in this session by an AI assistant. Prompts for generating pixel-art assets are in `ASSETS_PROMPTS.md`.

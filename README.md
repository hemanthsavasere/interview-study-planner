# Interview Study Planner

Tracks interview prep progress across 475 problems with auto-scheduling, spaced repetition, and local file sync.

## Setup
```bash
npm install
npm run dev
```

## Scripts
- `npm run dev` — Vite dev server (filesystem plugin active)
- `npm run test` — Vitest unit tests
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`
- `npm run build` — production build (no filesystem plugin)

## Git sync workflow
1. Work in the app; state persists to localStorage.
2. Settings → "Sync to Files" writes `progress.json` and `notes/` to disk.
3. `git add . && git commit -m "update progress" && git push`

## Known limitations
- Desktop-first (no mobile layout).
- Single-user, no auth, no backend.
- Filesystem plugin is dev-only.

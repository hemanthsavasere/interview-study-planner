# Interview Study Planner Implementation Plan

## Overview

Build a Vite + React + TypeScript + shadcn/ui single-page application that auto-schedules 475 interview problems across a user-defined deadline, tracks per-problem mastery with notes, and auto-requeues not-confident problems using spaced repetition — all synced to a local folder for manual git push. Implementation follows the approved design spec at `docs/superpowers/specs/2026-07-08-interview-study-planner-design.md`.

## Current State Analysis

The repository is greenfield. Only two assets exist:

- `codeintuition_problems.csv` — 476 lines (475 problems + header). Columns: `Learning Path,Topic,Section,Problem Name,Difficulty,URL`. Difficulties observed: Easy (first rows). Full difficulty distribution to be confirmed during scaffold phase.
- `docs/superpowers/specs/2026-07-08-interview-study-planner-design.md` — the approved, detailed design spec (293 lines).

No `package.json`, no `src/`, no tooling. Everything is built from scratch.

### Key Discoveries:
- CSV has exactly 475 data rows matching the spec's "475 problems" statement.
- CSV header uses `Problem Name` (not `name`) and `Learning Path` (not `learningPath`) — the parser must map these.
- Difficulty values in the spec (`Fundamental | Easy | Medium | Hard`) need verification against actual CSV values during scaffold.
- The spec mandates Vitest unit tests for logic modules with specific edge cases — TDD is the right approach for those modules.
- Filesystem sync plugin is dev-only (~40 lines) and must not ship in production builds.

## Desired End State

A working desktop-first single-page app where a user can:

1. Open the app, configure a deadline + hours/day in Settings, and generate a schedule across 475 problems.
2. See today's assigned problems in the Today view, update their status (not-started → attempted → solved → confident), and write notes inline.
3. See solved-but-not-confident problems automatically requeued to the next weekend for review, appearing in a "Due for Review" section.
4. Browse the schedule on a Calendar, drill into topics with mastery scores, and search/filter all notes.
5. Sync progress to `progress.json` + `notes/` files on disk via the dev-server plugin, then `git commit && git push` manually.

### Verification of end state:
- `npm run dev` launches the app with filesystem plugin active; all five views render and are interactive.
- `npm run test` passes all Vitest unit tests for scheduler, requeue, and storage.
- `npm run typecheck` and `npm run lint` pass clean.
- `npm run build` produces a production bundle without the filesystem plugin.
- Manual smoke test: configure a deadline, generate a schedule, mark problems solved/not-confident, verify requeue appears on the next weekend, sync to files, confirm `progress.json` + `notes/` written correctly.

## What We're NOT Doing

- No backend server, no database, no auth.
- No mobile-specific layout (desktop-first).
- No E2E tests (spec explicitly says YAGNI; manual smoke testing only).
- No multi-user support.
- No production deployment of the filesystem plugin (dev-only).
- No client-side router (single-page, tab state in component state).
- No ascending spaced-repetition intervals (fixed 7-day, weekend-aligned).
- No CSV editing UI (CSV is a static build-time import).

## Implementation Approach

**Strategy:** Vertical-slice-first, fine-grained phases. Deliver a usable Today view as early as possible (Phase 4), then layer in the remaining views and systems. Logic modules (scheduler, storage, requeue) use strict TDD: write failing Vitest tests covering the spec's listed edge cases, then implement until green.

**Tech decisions:**
- Vite for build + dev server (the filesystem plugin hooks into Vite's dev server middleware).
- shadcn/ui via the standard `@shadcn` registry; add components per-view as needed (card, button, tabs, dialog, input, select, progress, toast/sonner, calendar).
- CSV imported at build time via `?raw` query or a Vite plugin; parsed in a `parseProblems` utility.
- `useStore` is a central hook backed by localStorage with a schema-version field.
- Markdown rendering for notes via a lightweight renderer (e.g. `react-markdown`) — to be confirmed in Notes phase.

**Why this order:**
- Phases 1-3 lay the foundation (scaffold + two core logic modules with tests).
- Phase 4 delivers the first usable slice (Today view) so the app is interactive ASAP.
- Phase 5 (Settings) completes the end-to-end loop: configure → generate → work.
- Phases 6-9 add the remaining features in dependency order (requeue before Calendar since Calendar surfaces requeue badges).
- Phase 10 adds filesystem sync last since it's a dev-only convenience layer on top of working localStorage state.
- Phase 11 is final polish and the manual smoke-test pass.

---

## Phase 1: Project Scaffold

### Overview
Stand up the Vite + React + TS project, configure shadcn/ui, ESLint, Vitest, all npm scripts, import and parse the CSV, and define all TypeScript types. After this phase, `npm run dev` shows a placeholder app and `npm run test/typecheck/lint/build` all work.

### Changes Required:

#### 1. Initialize Vite + React + TS
**Files**: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx` (placeholder)

Scaffold via `npm create vite@latest . -- --template react-ts` (or manual files if the interactive prompt is problematic). Configure `vite.config.ts` with the React plugin and a placeholder for the filesystem plugin (added in Phase 10). Enable Vitest config inline in `vite.config.ts` (`test: { globals: true, environment: 'jsdom' }`).

#### 2. Configure shadcn/ui
**Files**: `components.json`, `tailwind.config.js`, `src/index.css`, `postcss.config.js`

Run `npx shadcn@latest init` (default `@shadcn` registry, New York style, CSS variables). Add the base components used across all phases now to avoid context-switching later:

```
npx shadcn@latest add button card tabs dialog input label select progress sonner
```

(Components only added as needed per phase are deferred; these are the universal ones.)

#### 3. Configure ESLint + scripts
**Files**: `.eslintrc.cjs` (or `eslint.config.js`), `package.json` scripts

ESLint with React + TS rules. Add scripts:

```json
{
  "dev": "vite",
  "test": "vitest run",
  "test:watch": "vitest",
  "lint": "eslint src --ext .ts,.tsx",
  "typecheck": "tsc --noEmit",
  "build": "tsc && vite build"
}
```

#### 4. CSV import + parser
**Files**: `src/data/problems.csv` (copy of root CSV, or reference), `src/lib/parseProblems.ts`

The CSV is imported as a raw string (Vite `?raw` suffix) and parsed by a `parseProblems(csv: string): Problem[]` function. The parser:
- Splits on newlines, handles quoted fields (commas inside quotes).
- Maps columns: `Learning Path → learningPath`, `Topic → topic`, `Section → section`, `Problem Name → name`, `Difficulty → difficulty`, `URL → url`.
- Derives `id` as a slug from `name` (kebab-case, deduplicated by appending `-2`, `-3` if collisions).
- Validates `difficulty` is one of `Fundamental | Easy | Medium | Hard`; logs a warning and skips rows with unknown difficulty.
- Returns the full `Problem[]`.

**Important:** Verify the actual difficulty values present in the CSV during this phase and confirm the slug-collision strategy works (475 names — collisions likely).

#### 5. Type definitions
**File**: `src/types.ts`

Define exactly as the spec (lines 73-108): `Difficulty`, `Problem`, `Status`, `ProblemProgress`, `ScheduleConfig`, `AppState`. Add a `SCHEMA_VERSION` constant exported from here or `storage.ts` (Phase 3).

#### 6. Placeholder App shell
**File**: `src/App.tsx`

A minimal shell rendering a heading and the parsed problem count, so `npm run dev` confirms the CSV pipeline works end-to-end.

### Success Criteria:

#### Automated Verification:
- [ ] `npm run dev` starts Vite and shows the placeholder app with the correct problem count (475).
- [ ] `npm run typecheck` passes with zero errors.
- [ ] `npm run lint` passes with zero errors.
- [ ] `npm run build` produces a `dist/` bundle.
- [ ] `npm run test` runs (zero tests is acceptable this phase; Vitest config confirmed working via a trivial sanity test).

#### Manual Verification:
- [ ] CSV difficulty distribution matches spec expectations (Fundamental/Easy/Medium/Hard all present).
- [ ] No slug collisions in the parsed `Problem[]` (or deduplication handles them).
- [ ] shadcn components render with correct theming (button visible in placeholder).

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 2.

---

## Phase 2: Scheduler (TDD)

### Overview
Implement `src/lib/scheduler.ts` — the auto-scheduling algorithm that distributes problems across days from today to the deadline, respecting hours/day budgets and difficulty time weights. Strict TDD: write failing tests first covering all spec edge cases, then implement.

### Changes Required:

#### 1. Write failing Vitest tests
**File**: `src/lib/scheduler.test.ts`

Tests covering (per spec lines 137-165):
- Total time calculation sums difficulty weights correctly (F=24, E=30, M=48, H=69 min).
- Distribution fills each day's budget (e.g., 2hrs=120min) without exceeding it; leftover minutes roll to next day.
- Problem ordering: Easy → Medium → Hard → Fundamental, with same-section problems kept on same/adjacent days.
- Every problem gets a `scheduledDate`.
- Deadline in the past → throws/blocks with "deadline must be future".
- Hours/day = 0 → throws with "must be at least 0.5".
- Over-capacity (total time > available days × hours/day) → returns a warning + option flag, not a silent bad schedule.
- Regeneration: when given existing progress, preserves statuses/notes and only reassigns `scheduledDate` for unsolved problems.

#### 2. Implement scheduler
**File**: `src/lib/scheduler.ts`

```typescript
export interface ScheduleResult {
  assignments: Record<string, string>; // problemId → ISO date
  warnings: string[];
}

export function generateSchedule(
  problems: Problem[],
  config: ScheduleConfig,
  existingProgress?: Record<string, ProblemProgress>
): ScheduleResult;

// Helper exports for testing
export const DIFFICULTY_MINUTES: Record<Difficulty, number>;
export function totalStudyMinutes(problems: Problem[]): number;
```

Algorithm (spec lines 148-153):
1. Validate config (deadline future, hours/day ≥ 0.5).
2. Compute total minutes via `DIFFICULTY_MINUTES`.
3. Compute available days = deadline − today (inclusive).
4. If total > available × hours/day × 60 → push warning (caller decides whether to auto-extend).
5. Sort problems: Easy first, then Medium, Hard, Fundamental; within each difficulty, group by `section` for continuity.
6. Greedy-fill each day: accumulate minutes until day budget reached, carry remainder to next day.
7. Assign `scheduledDate` to each problem.
8. If `existingProgress` provided: only schedule problems whose status is `not-started` or `attempted` (unsolved); preserve solved/confident dates.

### Success Criteria:

#### Automated Verification:
- [ ] All `scheduler.test.ts` tests pass: `npm run test src/lib/scheduler.test.ts`
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.

#### Manual Verification:
- [ ] Inspect a sample schedule output (e.g., 30-day deadline, 2hrs/day) — confirm reasonable distribution and same-section clustering.
- [ ] Confirm over-capacity warning triggers for a tight deadline.

**Implementation Note**: Pause for manual confirmation before Phase 3.

---

## Phase 3: Storage + useStore (TDD)

### Overview
Implement localStorage-backed state management with schema versioning and corruption recovery. Strict TDD.

### Changes Required:

#### 1. Write failing Vitest tests
**File**: `src/lib/storage.test.ts`

Tests covering (spec lines 254-258, 266-271):
- `loadState()` reads and parses localStorage; returns fresh state if absent.
- `saveState()` serializes and writes localStorage.
- Schema version mismatch on load → falls back to fresh state.
- On corruption (unparseable JSON) → falls back to fresh state.
- `useStore` hook: initializes from storage, updates persist on every state change, exposes `setState`/`updateProgress`/`setConfig`.

#### 2. Implement storage
**File**: `src/lib/storage.ts`

```typescript
export const SCHEMA_VERSION = 1;

export function loadState(): AppState;        // fresh if absent/corrupt/mismatched
export function saveState(state: AppState): void;
export function freshState(): AppState;
```

Schema-version field in `AppState` (add `schemaVersion: number` to the type, or wrap in an envelope `{ schemaVersion, state }` in localStorage — confirm during implementation).

#### 3. Implement useStore hook
**File**: `src/hooks/useStore.ts`

```typescript
export function useStore(): {
  state: AppState;
  updateProgress: (problemId: string, patch: Partial<ProblemProgress>) => void;
  setConfig: (config: ScheduleConfig) => void;
  regenerateSchedule: (assignments: Record<string, string>) => void;
  resetAll: () => void;
  loadFromImport: (imported: AppState) => void;
};
```

Loads from storage on mount; persists on every mutation. Central source of truth for all views.

### Success Criteria:

#### Automated Verification:
- [ ] All `storage.test.ts` tests pass: `npm run test src/lib/storage.test.ts`
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.

#### Manual Verification:
- [ ] In `npm run dev`, mutate state (via a debug control) and confirm it survives a full page reload.
- [ ] Manually corrupt localStorage → confirm app falls back to fresh state without crashing.

**Implementation Note**: Pause for manual confirmation before Phase 4.

---

## Phase 4: Today View + Sidebar

### Overview
Deliver the first usable vertical slice: the app shell with sidebar navigation, the Today view showing today's scheduled problems with status selectors and inline notes, and the sidebar progress footer. After this phase the app is visually usable (though schedule generation comes in Phase 5 — for testing, manually seed a schedule).

### Changes Required:

#### 1. App shell + tab state
**File**: `src/App.tsx`

Layout: left sidebar (240px) + top bar (current date + Sync button placeholder) + main content area. Tab state held in `useState` (no router). Renders one of five views based on active tab; non-built views show a "Coming soon" placeholder.

#### 2. Sidebar
**File**: `src/components/Sidebar.tsx`

App title, nav tabs (Today / Calendar / Topics / Notes / Settings) with icons + labels, footer showing "X/475 solved (Y%)". Active tab highlighted. Progress count derived from `useStore`.

#### 3. ProblemCard
**File**: `src/components/ProblemCard.tsx`

Props: `problem: Problem`, `progress: ProblemProgress`, `onStatusChange`, `onNotesChange`. Shows:
- Name, difficulty (color-coded badge), topic/pattern.
- Link button to open `problem.url` (new tab).
- Status selector: not-started → attempted → solved → confident (segmented control or select).
- Inline-expandable notes textarea (markdown plain input; rendering deferred to Notes phase).

#### 4. TodayView
**File**: `src/components/TodayView.tsx`

- Today's date + horizontal progress bar (overall % solved) — use shadcn `Progress`.
- "Due for Review" section at top (renders requeued problems — empty until Phase 6; section always present but shows "No reviews due" placeholder).
- Lists today's scheduled problems as `ProblemCard`s (filter `progress` by `scheduledDate === today`).

#### 5. Seed helper for manual testing
**File**: `src/lib/seed.ts` (dev-only)

A temporary helper to seed a fake schedule into localStorage so the Today view can be tested before Settings exists. Removed or gated behind `import.meta.env.DEV` after Phase 5.

### Success Criteria:

#### Automated Verification:
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` succeeds.

#### Manual Verification:
- [ ] Sidebar renders with all 5 tabs; switching tabs changes the main content area.
- [ ] Progress footer shows correct count (0/475 with no progress).
- [ ] With seeded schedule, Today view shows today's problems as cards.
- [ ] Changing a card's status persists across reload (localStorage).
- [ ] Notes entered inline persist across reload.
- [ ] Problem URL link opens correctly in a new tab.

**Implementation Note**: Pause for manual confirmation before Phase 5.

---

## Phase 5: Settings View + Regeneration

### Overview
Implement the Settings view: config form (deadline, hours/day, weekdays-only toggle), Generate Schedule, Regenerate Schedule (unsolved only), and Reset All Progress. After this phase, the app is functionally usable end-to-end — the user can configure, generate, and work problems in Today view.

### Changes Required:

#### 1. SettingsView
**File**: `src/components/SettingsView.tsx`

- Form: deadline date picker (`<input type="date">` or shadcn date component), hours/day number input (min 0.5), weekdays-only toggle (switch).
- Validation: deadline must be future, hours/day ≥ 0.5 — show inline errors, block submission.
- "Generate Schedule" button → calls `generateSchedule(allProblems, config)`, assigns `scheduledDate` to all problems, updates `useStore`. If warnings (over-capacity) → show a dialog with options: auto-extend deadline or increase hours.
- "Regenerate Schedule" button → calls `generateSchedule(unsolvedOnly, config, existingProgress)`, preserves solved/confident.
- "Sync to Files" button → placeholder until Phase 10 (disabled or shows "coming soon").
- Danger zone: "Reset All Progress" with confirmation dialog → `useStore.resetAll()`.

#### 2. Wire scheduler into useStore
**File**: `src/hooks/useStore.ts`

Add `generateSchedule` and `regenerateSchedule` methods that call `lib/scheduler.ts` and merge results into state, preserving existing progress where required.

### Success Criteria:

#### Automated Verification:
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] Existing scheduler/storage tests still pass: `npm run test`.

#### Manual Verification:
- [ ] Set a deadline 30 days out, 2hrs/day → Generate → Today view populates with problems.
- [ ] Set deadline in the past → form blocks with error.
- [ ] Set hours/day = 0 → form blocks with error.
- [ ] Tight deadline (over-capacity) → warning dialog appears with extend/increase options.
- [ ] Mark a few problems solved → Regenerate → solved problems keep their dates, unsolved redistributed.
- [ ] Reset All Progress → confirmation → state clears, schedule empty.

**Implementation Note**: Pause for manual confirmation before Phase 6.

---

## Phase 6: Requeue (TDD)

### Overview
Implement spaced repetition logic in `src/lib/requeue.ts`. Strict TDD. Solved-but-not-confident problems get requeued to the next weekend (7+ days out), with daily fallback when the deadline has passed or no unsolved problems remain.

### Changes Required:

#### 1. Write failing Vitest tests
**File**: `src/lib/requeue.test.ts`

Tests covering (spec lines 207-233):
- Solved (not confident) problem with no `requeueDate` → scheduled to next Saturday (or Sunday if Saturday unavailable), ≥7 days from `lastUpdated`. `requeueCount` increments.
- Solved (not confident) with past `requeueDate` → rescheduled another 7+ days out, `requeueCount` increments.
- Confident problem → excluded from requeue.
- Not-started/attempted → excluded from requeue.
- Deadline passed AND zero unsolved problems → requeue falls back to 1-day-daily scheduling.
- Zero unsolved problems (regardless of deadline) → requeue falls back to next-day scheduling.
- `processRequeue(progress, problems, config, today)` returns updated progress entries.

#### 2. Implement requeue
**File**: `src/lib/requeue.ts`

```typescript
export function processRequeue(
  progress: Record<string, ProblemProgress>,
  problems: Problem[],
  config: ScheduleConfig,
  today: string
): Record<string, ProblemProgress>;
```

Logic (spec lines 213-221):
1. Scan for `status === 'solved'` with no future `requeueDate` or past `requeueDate`.
2. Determine if daily fallback applies (deadline passed + no unsolved, OR no unsolved at all).
3. If fallback: `requeueDate = today + 1 day`.
4. Else: `requeueDate = next weekend day ≥ lastUpdated + 7 days` (Saturday preferred, Sunday fallback). Respect `weekdaysOnly`.
5. Increment `requeueCount`.
6. After user re-attempts: if marked confident → no new requeue; if still solved → next requeue 7+ days out.

#### 3. Wire into useStore + Today view
**Files**: `src/hooks/useStore.ts`, `src/components/TodayView.tsx`

`useStore` runs `processRequeue` on load and after any status change. Today view's "Due for Review" section now populates from requeued problems (`requeueDate === today`).

### Success Criteria:

#### Automated Verification:
- [ ] All `requeue.test.ts` tests pass: `npm run test src/lib/requeue.test.ts`
- [ ] Full test suite passes: `npm run test`.
- [ ] `npm run typecheck` and `npm run lint` pass.

#### Manual Verification:
- [ ] Mark a solved problem (not confident) → after 7+ days, it appears in "Due for Review" on the next weekend.
- [ ] Mark a problem confident → it never appears in requeue.
- [ ] With all problems solved and deadline passed → requeued problems appear next day (daily fallback).

**Implementation Note**: Pause for manual confirmation before Phase 7.

---

## Phase 7: Calendar View

### Overview
Month grid showing per-day problem counts, difficulty color dots, solved checkmarks, and requeue badges. Clicking a day reveals its problems.

### Changes Required:

#### 1. CalendarView
**File**: `src/components/CalendarView.tsx`

- Month grid (use shadcn `Calendar` as base or build a simple grid — confirm during implementation; shadcn Calendar may be single-date-picker oriented, a custom grid may be simpler).
- Each day cell: number of problems scheduled, color dots per difficulty present, checkmark when all that day's problems are solved.
- Requeue days (weekends with reviews due) → distinct badge "X reviews due".
- Click a day → side panel or modal (shadcn `Dialog`) listing that day's problems as compact `ProblemCard`s or a read-only list with links.
- Month navigation (prev/next).

### Success Criteria:

#### Automated Verification:
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` succeeds.

#### Manual Verification:
- [ ] Current month renders with correct day cells.
- [ ] Days with scheduled problems show counts + difficulty dots.
- [ ] Fully-solved days show a checkmark.
- [ ] Weekend days with requeued reviews show the badge.
- [ ] Clicking a day opens its problem list; links work.
- [ ] Month navigation works without losing state.

**Implementation Note**: Pause for manual confirmation before Phase 8.

---

## Phase 8: Topics View

### Overview
Collapsible tree (Learning Path → Topic → Section/Pattern → Problems) with per-node progress summaries and per-pattern mastery scores.

### Changes Required:

#### 1. TopicsView
**File**: `src/components/TopicsView.tsx`

- Build a tree from the static `Problem[]` grouped by `learningPath → topic → section`.
- Each node shows progress summary: "Two Pointers (Direct) — 4/6 solved".
- Expanding a pattern reveals its problems with status badges (color-coded by status).
- Mastery score per pattern: % confident. Color-coded: red <40%, amber 40-75%, green >75%.
- Use shadcn `Collapsible` or custom expand/collapse with chevron icons.

### Success Criteria:

#### Automated Verification:
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` succeeds.

#### Manual Verification:
- [ ] Tree renders with all learning paths/topics/sections from the CSV.
- [ ] Expanding/collapsing nodes works.
- [ ] Progress counts update when statuses change in Today view (shared state via useStore).
- [ ] Mastery colors render correctly at the thresholds.

**Implementation Note**: Pause for manual confirmation before Phase 9.

---

## Phase 9: Notes View

### Overview
Searchable, filterable list of all problems that have notes, with inline markdown editing.

### Changes Required:

#### 1. NotesView
**File**: `src/components/NotesView.tsx`

- List of problems with non-empty notes, each showing problem name, last-updated date, and rendered markdown.
- Filters: by topic (select), by status (select), by difficulty (select).
- Search box: filters by problem name or notes content (case-insensitive).
- Each entry editable inline — toggle between rendered markdown and a textarea editor. On save, persists via `useStore.updateProgress`.
- Markdown rendering: use `react-markdown` (add dependency). Confirm availability/preference during implementation.

### Success Criteria:

#### Automated Verification:
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` succeeds.

#### Manual Verification:
- [ ] Problems with notes appear; those without don't.
- [ ] Search filters correctly by name and notes content.
- [ ] All three filters (topic, status, difficulty) work independently and combined.
- [ ] Inline edit → save → rendered markdown updates; persists across reload.
- [ ] Markdown renders headings, lists, code blocks correctly.

**Implementation Note**: Pause for manual confirmation before Phase 10.

---

## Phase 10: Filesystem Sync

### Overview
Implement the Vite dev-server plugin (`/save`, `/load` endpoints) and the client-side `sync.ts`. Enable the "Sync to Files" button in Settings.

### Changes Required:

#### 1. Vite filesystem plugin
**File**: `src/plugins/filesystem.ts`

~40-line Vite plugin that hooks into the dev server middleware (only in dev mode):

```typescript
export function filesystemPlugin(): Plugin {
  return {
    name: 'filesystem-sync',
    configureServer(server) {
      // POST /save → write progress.json + notes/<learningPath>/<topic>/<slug>.md
      // GET /load → read progress.json, return JSON or 404
    }
  };
}
```

- `POST /save` body: `{ progress: AppState, notes: Record<string, string> }`. Writes `progress.json` and `notes/<learningPath>/<topic>/<slug>.md` to the project root. Sanitizes path segments. Returns `{ ok: true }` or `{ ok: false, error }`.
- `GET /load` → reads `progress.json`, returns it or 404 if absent.
- Registered in `vite.config.ts` only when `command === 'serve'`.

#### 2. Client sync module
**File**: `src/lib/sync.ts`

```typescript
export async function syncToFiles(state: AppState): Promise<{ ok: boolean; error?: string }>;
export async function loadFromFiles(): Promise<AppState | null>;
```

- `syncToFiles` collects notes from all `ProblemProgress` with non-empty notes, POSTs to `/save`.
- `loadFromFiles` GETs `/load`, returns parsed state or null.
- Errors → toast via `sonner`.

#### 3. Wire into Settings
**File**: `src/components/SettingsView.tsx`

- "Sync to Files" button → `syncToFiles(state)` → success/error toast.
- "Import from Files" button → `loadFromFiles()` → confirmation dialog → `useStore.loadFromImport()`.

#### 4. Register plugin in vite config
**File**: `vite.config.ts`

Add `filesystemPlugin()` to the plugins array.

### Success Criteria:

#### Automated Verification:
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` succeeds (plugin excluded from production build).

#### Manual Verification:
- [ ] With `npm run dev`, click "Sync to Files" → `progress.json` and `notes/` appear on disk with correct structure.
- [ ] Notes files land at `notes/<learningPath>/<topic>/<slug>.md`.
- [ ] Click "Import from Files" → confirmation dialog → state loads from `progress.json`.
- [ ] Sync failure (e.g., kill dev server) → error toast; app keeps working from localStorage.
- [ ] `npm run build` does not include the plugin (no `/save` route in production).

**Implementation Note**: Pause for manual confirmation before Phase 11.

---

## Phase 11: Polish & Smoke Test

### Overview
Final error-handling pass, CSV robustness, and a full manual smoke test of the complete app. Add a README documenting usage and the git sync workflow.

### Changes Required:

#### 1. Error handling pass
**Files**: various views + `src/lib/parseProblems.ts`

- CSV malformed rows: skipped with console warning; UI toast on load if any rows failed (`sonner`).
- All user-facing errors surface as toasts (schedule generation, sync, import).
- localStorage corruption: confirm backup-to-`progress.backup.json` via sync works (spec line 257) — if not implemented in Phase 3, add here.

#### 2. README
**File**: `README.md`

Document: setup (`npm install`), dev (`npm run dev`), scripts, the git sync workflow (spec lines 281-285), and known limitations (out-of-scope items).

### Success Criteria:

#### Automated Verification:
- [ ] Full test suite passes: `npm run test`.
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` succeeds.

#### Manual Verification:
- [ ] Full smoke test: install → dev → configure deadline 30d/2hr → generate → Today view works → mark 5 problems solved (not confident) → advance clock / wait → requeue appears on weekend → Calendar shows dots + checkmarks + requeue badges → Topics tree shows progress + mastery colors → Notes view shows entries, search/filter/edit works → Sync to Files → verify `progress.json` + `notes/` on disk → Reload → Import from Files → state restored → Regenerate (preserves solved) → Reset All (with confirmation).
- [ ] Malformed CSV handling: inject a bad row → toast appears, app loads remaining problems.
- [ ] No console errors during normal use.
- [ ] README is accurate and complete.

---

## Testing Strategy

### Unit Tests (Vitest):
- **scheduler.ts**: total time calc, day distribution, ordering, rollover, over-capacity warning, deadline/hours validation, regeneration preserving progress.
- **storage.ts**: load/save round-trip, schema version mismatch, corruption recovery, fresh-state fallback.
- **requeue.ts**: 7-day weekend scheduling, Saturday/Sunday fallback, daily post-deadline fallback, no-unsolved fallback, increment logic, confident exclusion.

### Integration Tests:
- None (spec says YAGNI; manual smoke testing only).

### Manual Testing Steps:
1. Configure and generate a schedule; verify Today view populates.
2. Mark problems across all four statuses; verify persistence and progress counts.
3. Trigger requeue by marking solved-not-confident; verify weekend scheduling.
4. Browse Calendar, Topics, Notes; verify shared state consistency.
5. Sync to Files; inspect on-disk output; Import from Files; verify restore.
6. Regenerate schedule mid-progress; verify preservation.
7. Reset All Progress; verify clean state.

## Performance Considerations

- 475 problems is small — no performance concerns for scheduling, rendering, or storage.
- localStorage has a ~5MB limit; 475 `ProblemProgress` entries with notes should be well under this. Monitor if notes grow large.
- CSV parsed once at build time (static import) — no runtime cost.
- Calendar renders one month at a time — no virtualization needed.
- Topics tree has ~475 leaf nodes — collapsible, so only expanded branches render fully. Consider `react-window` only if expansion lag is observed (likely unnecessary).

## Migration Notes

- Greenfield project — no existing data to migrate.
- `AppState.schemaVersion` field future-proofs localStorage against breaking changes (bump + migration logic added when needed).

## References

- Design spec: `docs/superpowers/specs/2026-07-08-interview-study-planner-design.md`
- Problem data: `codeintuition_problems.csv` (475 rows)
- shadcn registry: `@shadcn` (default)

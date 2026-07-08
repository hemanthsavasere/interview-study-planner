# Interview Study Planner — Design Spec

**Date:** 2026-07-08
**Status:** Approved
**Topic:** Interactive UI for tracking interview preparation progress

## Goal

A Vite + React + TypeScript + shadcn/ui single-page application that auto-schedules 475 interview problems (from `codeintuition_problems.csv`) across a user-defined deadline, tracks per-problem mastery with notes, and auto-requeues not-confident problems using spaced repetition — all synced to a local folder for manual git push to GitHub.

## Tech Stack

- **Build tool:** Vite
- **Framework:** React + TypeScript
- **UI:** shadcn/ui (Tailwind CSS)
- **Testing:** Vitest
- **Storage:** Browser localStorage (working copy) + local filesystem (sync target)
- **Filesystem bridge:** Custom Vite dev-server plugin (~40 lines) exposing `/save` and `/load` endpoints

## Architecture (Approach 1: Single-page dashboard with tabbed views)

A single-page app with a left sidebar for navigation and a main content area that renders one of five tabbed views. No client-side router. State held in localStorage; a Vite plugin handles filesystem sync during dev.

### Directory Structure

```
interview-study-planner/
├── index.html
├── package.json
├── vite.config.ts          # (+ filesystem plugin)
├── tsconfig.json
├── components.json         # shadcn config
├── src/
│   ├── main.tsx
│   ├── App.tsx             # layout shell, tab state
│   ├── types.ts            # Problem, ProblemStatus, ScheduleEntry types
│   ├── data/
│   │   └── problems.csv    # imported at build time
│   ├── lib/
│   │   ├── scheduler.ts    # auto-generate schedule from deadline + hours/day
│   │   ├── requeue.ts      # spaced repetition logic (7-day weekend requeue)
│   │   ├── storage.ts      # localStorage read/write
│   │   └── sync.ts         # talks to Vite plugin /save and /load
│   ├── plugins/
│   │   └── filesystem.ts   # Vite dev-server plugin (~40 lines)
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── TodayView.tsx
│   │   ├── CalendarView.tsx
│   │   ├── TopicsView.tsx
│   │   ├── NotesView.tsx
│   │   ├── SettingsView.tsx
│   │   ├── ProblemCard.tsx
│   │   └── ui/             # shadcn components
│   └── hooks/
│       └── useStore.ts     # central state hook (localStorage-backed)
```

### Layout

- **Left sidebar** (240px): app title, nav tabs (Today / Calendar / Topics / Notes / Settings), and a footer progress summary showing "X/475 solved (Y%)".
- **Top bar:** current date and a "Sync" button.
- **Main content area:** renders the active tab.

### Data Flow

CSV imported at build time → parsed into a static `Problem[]` array. User state (statuses, notes, schedule, requeue entries) lives in localStorage via `useStore`. The `sync.ts` module serializes state into `progress.json` + `notes/<topic>/<problem>.md` files via the filesystem plugin.

## Data Model

Defined in `src/types.ts`:

```typescript
type Difficulty = 'Fundamental' | 'Easy' | 'Medium' | 'Hard';

interface Problem {
  id: string;              // slug derived from problem name
  learningPath: string;    // "Data Structures" | "Algorithms"
  topic: string;           // "Array", "Linked List", etc.
  section: string;         // "Pattern: Two Pointers (Direct)", etc.
  name: string;
  difficulty: Difficulty;
  url: string;
}

type Status = 'not-started' | 'attempted' | 'solved' | 'confident';

interface ProblemProgress {
  problemId: string;
  status: Status;
  notes: string;           // markdown
  lastUpdated: string;     // ISO date
  scheduledDate?: string;  // ISO date assigned by scheduler
  requeueDate?: string;    // ISO date for spaced repetition
  requeueCount: number;    // how many times requeued
}

interface ScheduleConfig {
  deadline: string;        // ISO date
  hoursPerDay: number;
  weekdaysOnly: boolean;   // for requeue scheduling
}

interface AppState {
  config: ScheduleConfig;
  progress: Record<string, ProblemProgress>;  // keyed by problemId
  generatedAt: string;     // when schedule was last generated
}
```

### Difficulty Time Weights

Base unit: 1x = 30 minutes (one Easy problem).

| Difficulty | Weight | Minutes |
|---|---|---|
| Fundamental | 0.8x | 24 |
| Easy | 1.0x | 30 |
| Medium | 1.6x | 48 |
| Hard | 2.3x | 69 |

### File Sync Layout

What gets written to disk on sync:

```
progress.json              # AppState serialized
notes/
  Data Structures/
    Array/
      flip-characters.md   # problem notes, one file each
      two-sum.md
    Linked List/
      ...
```

## Scheduler Logic

Implemented in `src/lib/scheduler.ts`.

### Inputs

- Deadline date
- Hours per day
- Full `Problem[]` list from the CSV

### Algorithm

1. **Calculate total study time needed:** Sum all problem minutes using difficulty weights (F=24, E=30, M=48, H=69 min).
2. **Calculate available study days:** From today to deadline. Every day counts toward study capacity (weekdaysOnly only affects requeue scheduling, not main scheduling).
3. **Distribute problems across days:** Greedy-fill each day's time budget (e.g., 2 hrs = 120 min) by adding problems in order: Easy → Medium → Hard → Fundamental (so fundamentals get sprinkled before harder ones are tackled, easier ramp-up). Problems within the same difficulty ordered by topic continuity — keep problems from the same section on the same or adjacent days as much as possible.
4. **Output:** Each problem assigned a `scheduledDate`.

### Edge Cases

- If total time exceeds available days × hours/day → warn user, show option to auto-extend deadline or increase hours.
- If hours/day doesn't evenly divide a day's budget → roll over remaining minutes to next day.
- If user regenerates schedule after progress exists → preserve statuses/notes, only reassign `scheduledDate` for unsolved problems.
- Deadline in the past → block with "deadline must be future" error.
- Hours/day = 0 → block with "must be at least 0.5" error.

### Regeneration

User clicks "Regenerate Schedule" in Settings → scheduler runs on unsolved problems only, redistributing them from today to deadline.

## Views & Components

### 1. Today View (`TodayView.tsx`)

- Shows today's date and a horizontal progress bar (overall % solved).
- Lists today's scheduled problems as `ProblemCard` components — each shows name, difficulty (color-coded), topic/pattern, and a link button to open the problem URL.
- Each card has status selectors (not-started → attempted → solved → confident) and a notes textarea that expands inline.
- Shows requeued problems separately in a "Due for Review" section at the top.

### 2. Calendar View (`CalendarView.tsx`)

- Month grid. Each day cell shows: number of problems scheduled, color dots per difficulty, and a checkmark when all problems for that day are solved.
- Clicking a day reveals its problems in a side panel or modal.
- Requeue days (weekends) highlighted with a distinct badge showing "X reviews due".

### 3. Topics View (`TopicsView.tsx`)

- Collapsible tree: Learning Path → Topic → Section/Pattern → Problems.
- Each node shows progress summary (e.g., "Two Pointers (Direct) — 4/6 solved").
- Expanding a pattern reveals its problems with status badges.
- Mastery score per pattern: % of problems marked "confident". Color-coded (red <40%, amber 40-75%, green >75%).

### 4. Notes View (`NotesView.tsx`)

- Searchable, filterable list of all problems that have notes.
- Filters: by topic, by status, by difficulty.
- Each entry shows problem name, last notes content (markdown rendered), and a link to open in Today/Calendar context.
- Editable inline with a markdown editor.

### 5. Settings View (`SettingsView.tsx`)

- Form: deadline date picker, hours/day input, weekdays-only toggle.
- "Generate Schedule" button → runs scheduler, assigns `scheduledDate` to all unsolved problems.
- "Regenerate Schedule" button → re-runs for unsolved only, preserves progress.
- "Sync to Files" button → exports to progress.json + notes/ directory via filesystem plugin.
- Danger zone: "Reset All Progress" with confirmation.

### Sidebar (`Sidebar.tsx`)

Nav tabs (icons + labels), app title, and a footer showing "X/475 solved (Y%)".

## Spaced Repetition & Requeue Logic

Implemented in `src/lib/requeue.ts`.

### Trigger

When a problem's status is set to "solved" but **not** "confident", it becomes eligible for requeue. "Confident" problems are considered mastered and excluded from the requeue cycle.

### Algorithm

1. **Scan:** On app load and after any status change, scan all `ProblemProgress` entries for status `solved` (not `confident`) with no future `requeueDate` OR a `requeueDate` that has passed.
2. **Schedule requeue:** Set `requeueDate` to the **next weekend day** (Saturday, or Sunday if Saturday unavailable) that is at least 7 days from the `lastUpdated` date. Increment `requeueCount`.
3. **Display:** Requeued problems appear in the Today View under "Due for Review" on their `requeueDate`. They also surface in the Calendar View with a distinct badge on weekend days.
4. **After review:** When user re-attempts a requeued problem, they update its status. If marked "confident" → removed from requeue cycle. If still "solved" but not confident → next requeue scheduled another 7+ days out (incrementing `requeueCount`).

### Intervals

- Base interval: 7 days
- Weekends only: requeue dates always fall on Saturday (or Sunday if Saturday unavailable)
- No ascending interval — every requeue is 7 days out from the last review, not doubling.

### Edge Cases

- If the deadline has passed AND zero unsolved problems remain in the schedule → requeue interval switches from 7-day-weekend to **1-day-daily** for the remaining review queue, ensuring ongoing practice.
- If there are no unsolved problems in the main schedule (regardless of deadline status) → requeue falls back to next-day scheduling for the review queue, so revision isn't delayed waiting for the weekend.
- Requeue conflicts with heavy scheduled days are allowed — requeued problems show in a separate "Due for Review" section, not the main schedule list.

## Filesystem Sync

Implemented in `src/plugins/filesystem.ts` (Vite plugin) and `src/lib/sync.ts` (client side).

### Vite Dev-Server Plugin (~40 lines)

Exposes two endpoints during `npm run dev`:

- `POST /save` — receives JSON body containing `{ progress: AppState, notes: Record<string, string> }`, writes `progress.json` and `notes/<learningPath>/<topic>/<slug>.md` files to the project directory. Returns `{ ok: true }` or `{ ok: false, error: string }`.
- `GET /load` — reads `progress.json` from disk and returns it as JSON. Returns 404 if not present.

Plugin only active in dev mode, not in production builds.

### Client Side (`sync.ts`)

- `syncToFiles()` — collects notes from all `ProblemProgress` entries with non-empty notes, POSTs the full payload to `/save`.
- `loadFromFiles()` — fetches `/load`, returns parsed `AppState` or null if absent.
- On sync failure → toast with error message, app keeps working from localStorage.
- On load (import) → overwrites localStorage only after user confirms a dialog.

## Error Handling

1. **CSV parsing** — malformed rows skipped with a console warning; UI shows a toast if any rows failed to load.
2. **localStorage corruption** — schema version field in `AppState`; if mismatch on load, fall back to fresh state, back up old data to `progress.backup.json` via sync.
3. **Filesystem sync failures** — `/save` endpoint returns error → UI shows a toast with the error message; app keeps working from localStorage. `/load` (import) overwrites localStorage only after user confirms a dialog.
4. **Schedule generation edge cases:**
   - Deadline in the past → block with "deadline must be future" error.
   - Hours/day = 0 → block with "must be at least 0.5" error.
   - Deadline too tight → warn that not all problems fit, show option to auto-extend deadline or increase hours.
5. **Requeue conflicts** — allowed. Requeued problems show in a separate "Due for Review" section, not the main schedule list.

## Testing

- **Vitest** for logic-only modules:
  - `scheduler.ts` — distribution algorithm, edge cases (over-capacity, regeneration preserving progress, deadline/hours validation)
  - `requeue.ts` — 7-day weekend scheduling, daily post-deadline fallback, increment logic, "no problems to solve" fallback
  - `storage.ts` — localStorage read/write, version migration, backup on corruption
- **No end-to-end tests** for now (personal tracker, YAGNI). Manual smoke testing of views.

## Commands

- `npm run dev` — Vite dev server (with filesystem plugin active)
- `npm run test` — runs Vitest unit tests
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`
- `npm run build` — Vite production build

## GitHub Sync Workflow (Manual)

1. Work in the app; state persists to localStorage.
2. Click "Sync to Files" in Settings → app writes `progress.json` and `notes/` to the project directory via `/save`.
3. From the terminal: `git add . && git commit -m "update progress" && git push`.

## Out of Scope (YAGNI)

- No backend server, no database, no auth.
- No mobile-specific layout (desktop-first).
- No E2E tests.
- No multi-user support.
- No production deployment of the filesystem plugin (dev-only).
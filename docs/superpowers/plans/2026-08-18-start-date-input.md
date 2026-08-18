# Start Date Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Start Date input to the Settings page so schedules spread from a chosen date toward the Deadline instead of always from today.

**Architecture:** `ScheduleConfig` gains an optional `startDate` field. The pure `generateSchedule` function resolves `startDate || today`, computes the day span from `(deadline − start)`, and enforces two guards. The Settings UI adds a native date input above the Deadline row, pre-filled with today when empty. No schema bump; the optional field loads from old persisted state unchanged.

**Tech Stack:** React 19, TypeScript, Vitest, sonner toasts, shadcn-style UI primitives.

## Global Constraints

- `startDate` is `string` in local ISO `YYYY-MM-DD` form, or empty/undefined for "today."
- No `schemaVersion` bump. Existing persisted state (no `startDate`) must load without migration.
- Reuse the native `<Input type="date">` — no new date-picker component.
- Tests are date-independent: pass explicit fixed dates, never rely on "today."
- Scheduler helpers consolidate to the shared `date.ts` module (`localISODate`, `addDaysISO`, `todayISO`).

---

## File Structure

- **Modify:** `src/types.ts` — add optional `startDate` to `ScheduleConfig`.
- **Modify:** `src/lib/storage.ts` — `freshState()` initializes `config.startDate = ''`.
- **Modify:** `src/lib/storage.test.ts` — round-trip test covers `startDate`.
- **Modify:** `src/lib/scheduler.ts` — resolve start, new day-span, two guards, use shared helpers.
- **Modify:** `src/lib/scheduler.test.ts` — rewrite existing tests with explicit `startDate`, add new guard/first-date tests.
- **Modify:** `src/components/SettingsView.tsx` — Start Date row above Deadline, pre-fill today, pass into `cfg`.

---

### Task 1: Add `startDate` to the config type and fresh state

**Files:**
- Modify: `src/types.ts:12-14`
- Modify: `src/lib/storage.ts:5-11`
- Test: `src/lib/storage.test.ts`

**Interfaces:**
- Produces: `ScheduleConfig.startDate?: string` (local ISO `YYYY-MM-DD` or empty/undefined). `freshState().config.startDate === ''`.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/storage.test.ts` inside the `describe` block, after the round-trip test:

```ts
it('freshState sets startDate to empty string', () => {
  expect(freshState().config.startDate).toBe('')
})
it('save then load round-trips startDate', () => {
  const s = freshState(); s.config.startDate = '2099-06-01'
  saveState(s)
  expect(loadState().config.startDate).toBe('2099-06-01')
})
it('loadState tolerates persisted state without startDate', () => {
  const legacy = freshState(); delete (legacy.config as { startDate?: string }).startDate
  saveState(legacy)
  const loaded = loadState()
  expect(loaded.config.startDate).toBeUndefined()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: FAIL — `freshState().config.startDate` is `undefined`, not `''`; TS error on `startDate` property.

- [ ] **Step 3: Add the field to the type**

Edit `src/types.ts` lines 12-14:

```ts
export interface ScheduleConfig {
  deadline: string; hoursPerDay: number; weekdaysOnly: boolean
  startDate?: string
}
```

- [ ] **Step 4: Initialize `startDate` in `freshState`**

Edit `src/lib/storage.ts` `freshState()`:

```ts
export function freshState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    config: { deadline: '', hoursPerDay: 2, weekdaysOnly: true, startDate: '' },
    progress: {}, generatedAt: '',
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: PASS (all storage tests).

- [ ] **Step 6: Run full check**

Run: `npm run typecheck && npm test`
Expected: PASS — typecheck clean; all tests pass (scheduler tests still pass because `startDate` is optional).

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/lib/storage.ts src/lib/storage.test.ts
git commit -m "feat: add optional startDate to ScheduleConfig and freshState"
```

---

### Task 2: Spread from Start Date in `generateSchedule` with guards and consolidated helpers

**Files:**
- Modify: `src/lib/scheduler.ts:1-66`
- Test: `src/lib/scheduler.test.ts`

**Interfaces:**
- Consumes: `ScheduleConfig.startDate?: string` from Task 1; `localISODate`, `addDaysISO`, `todayISO` from `src/lib/date.ts`.
- Produces: `generateSchedule` now (a) resolves `start = config.startDate || todayISO()`, (b) computes `days = floor((deadline − start)/86400000) + 1`, (c) throws `Start date cannot be before today` when `start < today`, (d) throws `Start date must be before the deadline` when `deadline <= start`, (e) assigns `addDaysISO(startISO, dayIdx)` to each unsolved problem. First unsolved assignment equals the resolved start ISO.

- [ ] **Step 1: Rewrite the test file with explicit `startDate` and add new tests**

Replace the entire contents of `src/lib/scheduler.test.ts` with:

```ts
import { describe, it, expect } from 'vitest'
import { generateSchedule, totalStudyMinutes, DIFFICULTY_MINUTES } from './scheduler'
import { todayISO } from './date'
import type { Problem, ScheduleConfig, ProblemProgress } from '../types'

const mk = (n: string, d: Problem['difficulty']): Problem => ({
  id: n, learningPath: 'DS', topic: 'T', section: 'S', name: n, difficulty: d, url: 'x',
})
const cfg = (deadline: string, hoursPerDay = 2, startDate = '2099-01-01'): ScheduleConfig => ({
  deadline, hoursPerDay, weekdaysOnly: false, startDate,
})

describe('scheduler', () => {
  it('weights: F=24 E=30 M=48 H=69', () => {
    expect(DIFFICULTY_MINUTES).toEqual({ Fundamental: 24, Easy: 30, Medium: 48, Hard: 69 })
  })
  it('totalStudyMinutes sums weights', () => {
    expect(totalStudyMinutes([mk('a', 'Easy'), mk('b', 'Hard')])).toBe(30 + 69)
  })
  it('assigns every problem a scheduledDate within range', () => {
    const probs = [mk('a', 'Easy'), mk('b', 'Easy')]
    const { assignments } = generateSchedule(probs, cfg('2099-01-31'))
    expect(Object.keys(assignments)).toHaveLength(2)
    expect(assignments.a).toBeTruthy()
    expect(assignments.b).toBeTruthy()
  })
  it('first unsolved assignment equals the chosen startDate', () => {
    const probs = [mk('a', 'Easy'), mk('b', 'Easy')]
    const { assignments } = generateSchedule(probs, cfg('2099-02-28', 2, '2099-02-10'))
    expect(assignments.a).toBe('2099-02-10')
  })
  it('respects day budget; rolls leftover to next day', () => {
    const probs = [mk('a', 'Hard'), mk('b', 'Hard'), mk('c', 'Hard')] // 69*3=207 > 120
    const { assignments } = generateSchedule(probs, cfg('2099-01-31', 2))
    expect(assignments.a === assignments.b).toBe(false)
  })
  it('preserves CSV order (no re-sorting by difficulty)', () => {
    const probs = [mk('h', 'Hard'), mk('e', 'Easy'), mk('f', 'Fundamental'), mk('m', 'Medium')]
    const { assignments } = generateSchedule(probs, cfg('2099-01-31', 0.5))
    expect(assignments.h <= assignments.e).toBe(true)
  })
  it('throws when startDate is before today', () => {
    const yesterday = todayISO()
    const past = new Date(yesterday + 'T00:00:00'); past.setDate(past.getDate() - 1)
    const pastISO = past.toISOString().slice(0, 10)
    expect(() => generateSchedule([mk('a', 'Easy')], cfg('2099-12-31', 2, pastISO)))
      .toThrow(/before today/)
  })
  it('throws when startDate equals deadline', () => {
    expect(() => generateSchedule([mk('a', 'Easy')], cfg('2099-02-10', 2, '2099-02-10')))
      .toThrow(/before the deadline/)
  })
  it('throws when startDate is after deadline', () => {
    expect(() => generateSchedule([mk('a', 'Easy')], cfg('2099-02-10', 2, '2099-03-10')))
      .toThrow(/before the deadline/)
  })
  it('throws when deadline is in the past relative to start', () => {
    expect(() => generateSchedule([mk('a', 'Easy')], cfg('2000-01-01', 2, '2099-01-01')))
      .toThrow(/before the deadline/)
  })
  it('throws when hoursPerDay < 0.5', () => {
    expect(() => generateSchedule([mk('a', 'Easy')], cfg('2099-01-31', 0))).toThrow(/0.5/)
  })
  it('warns when over capacity', () => {
    const probs = Array.from({ length: 100 }, (_, i) => mk('p' + i, 'Hard'))
    const { warnings } = generateSchedule(probs, cfg('2099-01-10', 2))
    expect(warnings.length).toBeGreaterThan(0)
  })
  it('regeneration preserves solved, reschedules unsolved from startDate', () => {
    const probs = [mk('a', 'Easy'), mk('b', 'Easy')]
    const existing: Record<string, ProblemProgress> = {
      a: { problemId: 'a', status: 'solved', notes: '', lastUpdated: '2099-01-01', scheduledDate: '2099-01-05', requeueCount: 0 },
      b: { problemId: 'b', status: 'not-started', notes: '', lastUpdated: '2099-01-01', scheduledDate: '2099-01-05', requeueCount: 0 },
    }
    const { assignments } = generateSchedule(probs, cfg('2099-12-31', 2, '2099-06-01'), existing)
    expect(assignments.a).toBe('2099-01-05') // preserved (historical)
    expect(assignments.b).toBe('2099-06-01') // rescheduled from chosen start
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/scheduler.test.ts`
Expected: FAIL — first-assignment test, guard tests, and regenerate-from-start test fail (scheduler still uses today).

- [ ] **Step 3: Rewrite `generateSchedule` with resolved start, guards, and shared helpers**

Replace the entire contents of `src/lib/scheduler.ts` with:

```ts
import type { Problem, ScheduleConfig, ProblemProgress, Difficulty } from '../types'
import { addDaysISO, todayISO } from './date'

export const DIFFICULTY_MINUTES: Record<Difficulty, number> = {
  Fundamental: 24, Easy: 30, Medium: 48, Hard: 69,
}
export function totalStudyMinutes(problems: Problem[]): number {
  return problems.reduce((s, p) => s + DIFFICULTY_MINUTES[p.difficulty], 0)
}

export interface ScheduleResult {
  assignments: Record<string, string>
  warnings: string[]
}

export function generateSchedule(
  problems: Problem[],
  config: ScheduleConfig,
  existingProgress?: Record<string, ProblemProgress>,
): ScheduleResult {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const startISO = config.startDate || todayISO()
  const start = new Date(startISO + 'T00:00:00')
  if (start < today) throw new Error('Start date cannot be before today')
  const deadline = new Date(config.deadline + 'T00:00:00')
  if (deadline <= start) throw new Error('Start date must be before the deadline')
  if (config.hoursPerDay < 0.5) throw new Error('hoursPerDay must be at least 0.5')

  const dayBudget = config.hoursPerDay * 60
  const days = Math.floor((deadline.getTime() - start.getTime()) / 86400000) + 1

  const warnings: string[] = []
  const solvedOrConfident = new Set(
    Object.entries(existingProgress ?? {})
      .filter(([, p]) => p.status === 'solved' || p.status === 'confident')
      .map(([id]) => id),
  )
  const toSchedule = problems.filter(p => !solvedOrConfident.has(p.id))

  const totalMin = totalStudyMinutes(toSchedule)
  if (totalMin > days * dayBudget) {
    warnings.push(`Not enough time: ${totalMin} min needed, ${days * dayBudget} min available`)
  }

  const problemIds = new Set(problems.map(p => p.id))
  const assignments: Record<string, string> = {}
  if (existingProgress) {
    for (const [id, p] of Object.entries(existingProgress)) {
      if (p.scheduledDate && problemIds.has(id)) assignments[id] = p.scheduledDate
    }
  }

  let dayIdx = 0
  let used = 0
  for (const p of toSchedule) {
    const m = DIFFICULTY_MINUTES[p.difficulty]
    if (used + m > dayBudget && dayIdx + 1 < days) { dayIdx++; used = 0 }
    assignments[p.id] = addDaysISO(startISO, dayIdx)
    used += m
  }
  return { assignments, warnings }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/scheduler.test.ts`
Expected: PASS — all scheduler tests green, including the three new guard tests and the first-assignment test.

- [ ] **Step 5: Run full check**

Run: `npm run typecheck && npm test && npm run lint`
Expected: PASS — no unused imports (the old private `isoDate`/`addDays` are gone; `localISODate` is no longer imported directly since `addDaysISO`/`todayISO` cover all uses).

- [ ] **Step 6: Commit**

```bash
git add src/lib/scheduler.ts src/lib/scheduler.test.ts
git commit -m "feat: spread schedule from configurable start date with validation guards"
```

---

### Task 3: Add the Start Date input to the Settings UI

**Files:**
- Modify: `src/components/SettingsView.tsx:1-142`

**Interfaces:**
- Consumes: `ScheduleConfig.startDate` from Task 1; `generateSchedule` start-date behavior from Task 2; `todayISO` from `src/lib/date.ts`.
- Produces: a "Start date" `<Input type="date">` above the "Deadline" row, pre-filled with today when stored value is empty. `run()` builds `cfg` with `startDate` and persists it via `store.setConfig`.

- [ ] **Step 1: Add the `todayISO` import**

Edit `src/components/SettingsView.tsx`. After the existing scheduler import, add a new import line:

```ts
import { generateSchedule } from '../lib/scheduler'
import { todayISO } from '../lib/date'
```

- [ ] **Step 2: Add `startDate` local state, pre-filled with today when empty**

In the `SettingsView` component, after the `deadline` state, add:

```ts
const [deadline, setDeadline] = useState(store.state.config.deadline)
const [startDate, setStartDate] = useState(store.state.config.startDate || todayISO())
```

- [ ] **Step 3: Pass `startDate` into the config in `run()`**

Edit the `run` function's `cfg` construction so it reads:

```ts
if (!deadline) { setErr('Please set a deadline'); return }
const cfg = { deadline, startDate, hoursPerDay: h, weekdaysOnly: weekdays }
```

- [ ] **Step 4: Add the Start date input row above the Deadline row**

In `CardContent`, insert this block **before** the existing Deadline `<div>`:

```tsx
<div className="grid gap-1.5">
  <Label htmlFor="startDate">Start date</Label>
  <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
</div>
<div className="grid gap-1.5">
  <Label htmlFor="deadline">Deadline</Label>
  <Input id="deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
</div>
```

- [ ] **Step 5: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS — `startDate` is `string` (always set from state), `cfg` matches `ScheduleConfig`.

- [ ] **Step 6: Run the dev server and manually verify**

Run: `npm run dev`
Then in the browser, work through the manual verification checklist from the spec:
- Load → Settings → Start Date shows today's date.
- Change Start Date to a future date → Generate → first problem scheduled to that date.
- Clear the Start Date field → Generate → falls back to today (first problem on today).
- Set Start Date before today → error: "Start date cannot be before today."
- Set Start Date on or after Deadline → error: "Start date must be before the deadline."
- Regenerate (unsolved) → unsolved problems re-spread from the Start Date; solved problems keep their original dates.
- Reload the page → chosen Start Date persists.

- [ ] **Step 7: Commit**

```bash
git add src/components/SettingsView.tsx
git commit -m "feat: add Start Date input to Settings, pre-filled with today"
```

---

## Self-Review

**1. Spec coverage:**
- Stories 1-2 (visible field, today default) → Task 3 Step 4 + Step 2.
- Story 3 (pick future start) → Task 3 input + Task 2 spread.
- Story 4 (spread from start toward deadline) → Task 2 day-span + assignment.
- Story 5 (empty falls back to today) → Task 2 `config.startDate || todayISO()`; Task 3 clearing → `''` → fallback.
- Story 6 (warn before today) → Task 2 guard + test.
- Story 7 (warn on/after deadline) → Task 2 guard + tests (equal, after).
- Story 8 (persist across reloads) → Task 1 type/freshState + Task 3 `store.setConfig(cfg)`.
- Story 9 (Regenerate uses start) → Task 2 regenerate test; Task 3 `run(true)` passes same `cfg`.
- Story 10 (solved keep dates) → Task 2 regenerate test asserts `assignments.a === '2099-01-05'`.
- Story 11 (legacy state loads) → Task 1 `loadState tolerates persisted state without startDate` test.
- Story 12 (start→end labels read naturally) → Task 3 Step 4 places Start date above Deadline.

**2. Placeholder scan:** No TBD/TODO/"handle edge cases" present. All code blocks are complete.

**3. Type consistency:** `ScheduleConfig.startDate?: string` (Task 1) consumed in Task 2 (`config.startDate || todayISO()`) and Task 3 (`startDate` state is `string`, passed as `cfg.startDate`). Guard message strings match test regexes (`/before today/`, `/before the deadline/`). Helper names `addDaysISO`/`todayISO` match `src/lib/date.ts` exactly; `localISODate` is no longer imported into scheduler (not needed directly).

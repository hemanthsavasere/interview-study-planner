# Reviews Tab Implementation Plan

## Overview

Add a dedicated Reviews tab listing all solved-but-not-confident problems in the spaced-repetition loop, grouped by upcoming weekend with day sub-sections. Fix the scheduling bug where missed reviews land on weekdays — now fixing it in **both** cadence branches so reviews always land on a weekend.

## Current State Analysis

The app is a working Vite + React + TS + shadcn SPA. The requeue logic, sidebar, app shell, and Today view all exist. The Reviews tab is a new read-only view; the scheduling fix touches `processRequeue`.

### Key Discoveries:
- `src/lib/requeue.ts:3-7` defines private `addDays`/`dayOf` (NOT imported from shared `src/lib/date.ts` — they are inlined).
- `processRequeue` weekly branch bug at `requeue.ts:31` (`addDays(today, 1)` can land on Mon–Fri).
- The daily branch at `requeue.ts:27` (`addDays(today, 1)`) ALSO lands on weekdays — out of scope per the original spec, but in scope here per user decision ("reviews are done in weekend only").
- `src/types.ts:8-11` `ProblemProgress.requeueDate` is optional; no schema change needed.
- `src/components/Sidebar.tsx:7` `Tab` union; `TABS` array at `:9-15`. New tab goes between `today` and `calendar`.
- `src/App.tsx:17-19` `TITLES`; tab router ternary at `:33-37`; `:24` solved count already includes 'confident'.
- `src/components/TodayView.tsx:27` `reviews` const; "Due for Review" Card at **`:87-104`**; `reviews.length` in "Due today" stat at `:53`.
- `src/components/ProblemCard.tsx:10-13` props reusable verbatim with `makeHandlers` pattern from `TodayView.tsx:16-23`.
- No `makefile`. Scripts: `npm test` (vitest run), `npm run lint`, `npm run typecheck`, `npm run build`. No `fmt`.
- `thoughts/allison/tickets/` does not exist; this plan references the spec directly.
- The spec's `weekendOf` code (spec lines 36–40) walks forward to the next Saturday, so a Sunday input returns **next** weekend — contradicting the spec's own stated test ("on-Sun → same weekend"). The corrected helper anchors Sunday to its own Saturday.

## Desired End State

A functioning Reviews tab that:
1. Shows all `status === 'solved'` progress entries with a truthy `requeueDate`, grouped by weekend (Sat/Sun cards with day sub-sections).
2. Renders past weekend cards (labelled "Past — will roll forward on next open") which self-heal on next app open via `useStore`'s mount-time `processRequeue`.
3. Uses corrected `weekendOf` where Sunday belongs to its own weekend (not next weekend).
4. All scheduled reviews (both daily and weekly cadence) land on a Saturday or Sunday.

### Verification of end state:
- `npm test` passes all requeue tests (including updated daily-fallback tests).
- `npm run typecheck` and `npm run lint` pass clean.
- `npm run build` succeeds.
- Manual: Reviews tab appears between Today and Calendar; weekend cards group correctly; status changes and notes work identically to Today view; past weekends self-heal after reload.

## What We're NOT Doing

- No new fields on `ProblemProgress` or `AppState`.
- No schema migration.
- No missed-count badges or "skip to next" buttons.
- No manual cadence toggle in UI.
- No mobile-specific layout.
- No new shadcn components (reuses Card, CardHeader, CardTitle, CardContent, Badge, Button, ProblemCard).
- No snapshot/component tests for the new view (follow existing convention: unit tests for `lib/*`, typecheck + lint + manual smoke for views).
- No formatting command; there is no `fmt` script in this repo.

## Implementation Approach

**Strategy:** Incremental, test-first for the logic fix; UI last. Phase 1 fixes the scheduling bug with TDD. Phases 2–3 wire the shell and clean up the Today view. Phase 4 adds the new view reusing existing patterns.

**Tech decisions:**
- Export `nextReviewDay` and `weekendOf` from `requeue.ts` so they are unit-testable in isolation (keep the existing private `addDays`/`dayOf` private; only export the two new helpers).
- For `weekendOf`, anchor Sunday to its own Saturday to satisfy "on-Sun → same weekend".
- Reuse `ProblemCard` + `makeHandlers` pattern from TodayView verbatim so status/notes behaviour is identical.
- Phase 2 creates a placeholder `ReviewsView.tsx` so `typecheck` passes before Phase 4 fills it in.

---

## Phase 1: Scheduling Fix in `requeue.ts`

### Overview
Add two exported helpers and fix the weekday-landing bug in **both** the weekly and daily branches of `processRequeue`. Strict TDD for the helpers.

### Changes Required:

#### 1. Add `nextReviewDay` and `weekendOf` helpers
**File**: `src/lib/requeue.ts`

Add after the existing private `dayOf` (line 7):

```ts
export function nextReviewDay(from: string): string {
  let d = addDays(from, 1)
  while (dayOf(d) !== 6 && dayOf(d) !== 0) d = addDays(d, 1)
  return d
}

export function weekendOf(date: string): { sat: string; sun: string } {
  const wd = dayOf(date)
  const offset = wd === 0 ? -1 : 6 - wd
  const sat = addDays(date, offset)
  return { sat, sun: addDays(sat, 1) }
}
```

`weekendOf` behaviour:
- Wed (`wd=3`) → offset +3 → this Sat
- Sat (`wd=6`) → offset 0 → same Sat
- Sun (`wd=0`) → offset -1 → yesterday's Sat (same weekend)
- Mon (`wd=1`) → offset +5 → this coming Sat

#### 2. Fix weekly branch fallback
**File**: `src/lib/requeue.ts:31`

Replace:
```ts
if (date <= today) date = addDays(today, 1)
```
with:
```ts
if (date <= today) date = nextReviewDay(today)
```

#### 3. Fix daily branch (scope expansion)
**File**: `src/lib/requeue.ts:27`

Replace:
```ts
date = addDays(today, 1)
```
with:
```ts
date = nextReviewDay(today)
```

#### 4. Update tests
**File**: `src/lib/requeue.test.ts`

- Add imports: `nextReviewDay, weekendOf` alongside the existing `processRequeue` import.
- New `describe('nextReviewDay', ...)` block:
  - Wed/Fri → next Sat or Sun, strictly > today.
  - Sat → next Sun (or next Sat if no Sun in range — but Sun always follows Sat).
  - Sun → next Sat.
  - Fri → next Sat.
- New `describe('weekendOf', ...)` block:
  - A mid-week date → `{ sat, sun }` with `dayOf(sat) === 6`, `dayOf(sun) === 0`, and `sun === addDays(sat, 1)`.
  - On-Sat → same Sat/Sun.
  - On-Sun → yesterday's Sat / today's Sun (same weekend).
  - On-Mon → this coming Sat/Sun.
- **Update** existing test "deadline passed + no unsolved -> daily fallback" (line ~36) and "no unsolved problems -> daily fallback" (line ~42): `requeueDate` is no longer `today+1` but the next weekend day ≥ today. Replace exact-equality assertions with: `dayOf(requeueDate) === 6 || 0` AND `requeueDate >= today`.
- New regression test: missed review with a past `requeueDate`, `today` = a mid-week date → result is a weekend (Sat/Sun) and `>= today`.

**Note:** The implementer must verify the actual weekdays of the chosen literal dates using `new Date(iso + 'T12:00:00').getDay()` during TDD; pick literal dates representing Fri/Sat/Sun/Mon/Wed explicitly and assert specific weekend dates derived from `weekendOf`.

### Success Criteria:

#### Automated Verification:
- [ ] All `requeue.test.ts` tests pass: `npm test -- src/lib/requeue.test.ts`
- [ ] Full test suite passes: `npm test`
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.

#### Manual Verification:
- [ ] Inspect `nextReviewDay`/`weekendOf` outputs against a calendar for the literal dates chosen.
- [ ] Confirm the daily-fallback tests now assert weekend-landing, not `today+1`.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 2.

---

## Phase 2: Sidebar + App Shell Wiring

### Overview
Add the `'reviews'` tab to the `Tab` union, the `TABS` array (between `today` and `calendar`), `TITLES`, and the tab router ternary. Create a placeholder `ReviewsView` so typecheck passes.

### Changes Required:

#### 1. Sidebar.tsx
**File**: `src/components/Sidebar.tsx`

Line 2 — add `RotateCw` to the lucide-react import:
```ts
import { CalendarDays, CalendarRange, Layers, StickyNote, Settings, Sun, Moon, RotateCw } from 'lucide-react'
```

Line 7 — update `Tab` type:
```ts
export type Tab = 'today' | 'reviews' | 'calendar' | 'topics' | 'notes' | 'settings'
```

Lines 10–11 — insert new entry after `today`:
```ts
  { id: 'today', label: 'Today', icon: CalendarDays },
  { id: 'reviews', label: 'Reviews', icon: RotateCw },
  { id: 'calendar', label: 'Calendar', icon: CalendarRange },
```

#### 2. ReviewsView placeholder
**File**: `src/components/ReviewsView.tsx` (new — placeholder)

```tsx
export function ReviewsView() {
  return <div className="text-sm text-muted-foreground">Reviews — coming soon.</div>
}
```

(Filled in by Phase 4.)

#### 3. App.tsx
**File**: `src/App.tsx`

Add import (after line 6, alongside other views):
```ts
import { ReviewsView } from './components/ReviewsView'
```

Lines 17–19 — update `TITLES`:
```ts
const TITLES: Record<Tab, string> = {
  today: 'Today', reviews: 'Reviews', calendar: 'Calendar', topics: 'Topics', notes: 'Notes', settings: 'Settings',
}
```

Lines 33–37 — insert `reviews` branch in the ternary (between `today` and `calendar`):
```tsx
{tab === 'today' ? <TodayView problems={problems} store={store} />
  : tab === 'reviews' ? <ReviewsView problems={problems} store={store} />
  : tab === 'calendar' ? <CalendarView problems={problems} store={store} />
  : tab === 'topics' ? <TopicsView problems={problems} store={store} />
  : tab === 'notes' ? <NotesView problems={problems} store={store} />
  : <SettingsView problems={problems} store={store} />}
```

**Note:** The placeholder `ReviewsView` takes no props, but `App.tsx` renders `<ReviewsView problems={...} store={...} />`. This is intentional — Phase 4 will add those props. To satisfy typecheck in Phase 2 the placeholder must accept (and ignore) the same props:

```tsx
import type { Problem } from '../types'

export function ReviewsView(_props: { problems: Problem[]; store: unknown }) {
  return <div className="text-sm text-muted-foreground">Reviews — coming soon.</div>
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.

#### Manual Verification:
- [ ] `npm run dev` shows the Reviews tab between Today and Calendar in the sidebar.
- [ ] Clicking Reviews renders the placeholder text and the "Reviews" header title.

**Implementation Note**: Pause for manual confirmation before Phase 3.

---

## Phase 3: Today View Cleanup

### Overview
Remove the "Due for Review" card from TodayView (it's relocating to the Reviews tab) and clean up its derived data.

### Changes Required:

#### 1. Remove "Due for Review" card
**File**: `src/components/TodayView.tsx`

Delete lines 87–104 (the entire `<Card>` block with `CardTitle "Due for Review"`), and the trailing blank line 105.

#### 2. Remove `reviews` const
**File**: `src/components/TodayView.tsx:27`

Delete:
```ts
const reviews = Object.values(store.state.progress).filter(p => p.requeueDate === selectedDate)
```

#### 3. Update "Due today" stat tile
**File**: `src/components/TodayView.tsx:53`

Replace:
```tsx
<div className="text-3xl font-semibold tabular-nums">{scheduled.length + reviews.length}</div>
```
with:
```tsx
<div className="text-3xl font-semibold tabular-nums">{scheduled.length}</div>
```

#### 4. Keep
- Date navigator (`:70-85`).
- Scheduled card (`:106-123`).
- "Solved" stat tile (`:38-47`).
- "Upcoming reviews (next 7d)" stat tile (`:57-67`) — retained as a cross-reference signal per spec.

### Success Criteria:

#### Automated Verification:
- [ ] `npm run typecheck` passes (no unused `reviews` variable, no undefined references).
- [ ] `npm run lint` passes.
- [ ] `npm run build` succeeds.

#### Manual Verification:
- [ ] `npm run dev` → Today view no longer shows a "Due for Review" card.
- [ ] "Due today" stat shows `scheduled.length` only and updates correctly when navigating days.
- [ ] Scheduled card still renders and is editable.
- [ ] "Upcoming reviews (next 7d)" stat still works.

**Implementation Note**: Pause for manual confirmation before Phase 4.

---

## Phase 4: ReviewsView.tsx

### Overview
Implement the new weekend-grouped, read-only Reviews view reusing `ProblemCard` + `makeHandlers`.

### Changes Required:

#### 1. ReviewsView component
**File**: `src/components/ReviewsView.tsx` (replace the Phase 2 placeholder)

```tsx
import { RotateCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { ProblemCard } from './ProblemCard'
import type { Problem, ProblemProgress, Status } from '../types'
import { todayISO } from '../lib/date'
import { weekendOf } from '../lib/requeue'

export function ReviewsView({ problems, store }: {
  problems: Problem[]
  store: ReturnType<typeof import('../hooks/useStore').useStore>
}) {
  const today = todayISO()

  function makeHandlers(problemId: string) {
    return {
      onStatusChange: (s: Status) =>
        store.updateProgress(problemId, { status: s, lastUpdated: new Date().toISOString() }),
      onNotesChange: (n: string) =>
        store.updateProgress(problemId, { notes: n, lastUpdated: new Date().toISOString() }),
    }
  }

  const byId = new Map(problems.map(p => [p.id, p]))
  const reviewItems = Object.values(store.state.progress).filter(
    (p): p is ProblemProgress => p.status === 'solved' && !!p.requeueDate,
  )

  // Group by weekend
  const groups = new Map<string, { sat: string; sun: string; items: ProblemProgress[] }>()
  for (const p of reviewItems) {
    const { sat, sun } = weekendOf(p.requeueDate!)
    const key = sat
    if (!groups.has(key)) groups.set(key, { sat, sun, items: [] })
    groups.get(key)!.items.push(p)
  }

  const sortedWeekends = Array.from(groups.values()).sort((a, b) => a.sat.localeCompare(b.sat))

  // First upcoming weekend: first whose Sunday >= today
  const firstUpcomingIdx = sortedWeekends.findIndex(w => w.sun >= today)

  function labelFor(w: { sat: string; sun: string }, idx: number): string {
    if (idx < firstUpcomingIdx || firstUpcomingIdx === -1) {
      return 'Past — will roll forward on next open'
    }
    if (idx === firstUpcomingIdx) return 'This weekend'
    if (idx === firstUpcomingIdx + 1) return 'Next weekend'
    return ''
  }

  function fmt(iso: string): string {
    const d = new Date(iso + 'T12:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (reviewItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <RotateCw className="size-10 mb-3 text-primary/60" />
        <p className="text-sm max-w-sm">
          Nothing in the review loop yet — mark problems 'Solved' to enroll them for weekly re-attempts.
        </p>
      </div>
    )
  }

  function DaySection({ dayLabel, date, items }: {
    dayLabel: string; date: string; items: ProblemProgress[]
  }) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">{dayLabel} — {fmt(date)}</h4>
          <Badge variant="secondary" className="ml-1">{items.length}</Badge>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">Nothing for {dayLabel} — nice!</p>
        ) : items.map(p => {
          const pr = byId.get(p.problemId); if (!pr) return null
          return <ProblemCard key={p.problemId} problem={pr} progress={p} {...makeHandlers(p.problemId)} />
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {reviewItems.length} problems in the spaced-repetition loop, grouped by upcoming weekend.
      </p>
      {sortedWeekends.map((w, idx) => {
        const base = labelFor(w, idx)
        const title = base || `${fmt(w.sat)} – ${fmt(w.sun)}`
        const satItems = w.items.filter(p => p.requeueDate === w.sat)
        const sunItems = w.items.filter(p => p.requeueDate === w.sun)
        return (
          <Card key={w.sat}>
            <CardHeader>
              <CardTitle className="text-base">{title}
                <Badge variant="secondary" className="ml-2">{w.items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <DaySection dayLabel="Saturday" date={w.sat} items={satItems} />
              <DaySection dayLabel="Sunday" date={w.sun} items={sunItems} />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
```

**Notes:**
- `DaySection` filters `w.items` into Sat/Sun buckets by exact `requeueDate` match — relies on `nextReviewDay`/`weekendOf` always returning weekend dates.
- Malformed/stale `requeueDate` values (e.g. a weekday date from before this fix was deployed) will silently disappear from a day-section while still being counted in the card's badge. Acceptable per user direction; such entries self-heal on the next `processRequeue` pass (app open or any `updateProgress` call).
- The `labelFor` helper distinguishes "past" weekends (all whose `sun < today`), "This weekend" (first upcoming), "Next weekend" (second), then formatted title.
- Empty-state uses the spec's text exactly.
- Days with zero problems render a placeholder row to keep the week shape predictable.

### Success Criteria:

#### Automated Verification:
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` succeeds.
- [ ] `npm test` still passes (no regression in requeue tests).

#### Manual Verification:
- [ ] Reviews tab renders with the description line and correct problem count.
- [ ] With seeded solved-not-confident problems, weekend cards appear grouped by Sat/Sun.
- [ ] "This weekend" / "Next weekend" / formatted title labels are correct.
- [ ] Past weekend card (pre-existing `requeueDate` in the past) renders with "Past — will roll forward on next open" label and disappears after reload (processRequeue on mount).
- [ ] Status changes on a problem in Reviews view persist and update the Today view counts.
- [ ] Notes edited inline in Reviews view persist across reload.
- [ ] Empty state shows when no `solved` items have a truthy `requeueDate`.
- [ ] Days with zero reviews show "Nothing for Saturday — nice!" placeholder.

**Implementation Note**: After completing this phase and all automated verification passes, pause for final manual confirmation.

---

## Testing Strategy

### Unit Tests (Vitest):
- `nextReviewDay`: weekday (Wed/Fri) → next Sat; Sat → Sun; Sun → next Sat.
- `weekendOf`: mid-week, on-Sat, on-Sun (same weekend), on-Mon (this coming).
- Regression: missed review with past `requeueDate`, `today` = mid-week → rescheduled to weekend `>= today`.
- Updated daily-fallback tests: no unsolved problems → `requeueDate` is now a weekend, not `today+1`.

### Integration Tests:
- None (per existing convention; no snapshot tests for views).

### Manual Testing Steps:
1. `npm run dev` → confirm Reviews tab appears between Today and Calendar.
2. Mark several problems `'solved'` (not confident) → trigger/seed requeue → Reviews tab populates weekend cards.
3. Verify Saturday and Sunday sub-sections partition problems by their `requeueDate`.
4. Verify "This weekend" label on the upcoming weekend and past weekends labelled distinctly.
5. Reload app → confirm past weekend items roll forward and no past card remains.
6. Change status and edit notes from inside Reviews → verify persistence via Today/Topics views.

## Performance Considerations

- 475 problems max → tiny; no virtualization needed for the Reviews list.
- Grouping is a single pass over `Object.values(store.state.progress)` — negligible.
- No debounce needed for handlers since they delegate to `store.updateProgress` (already handled by React state scheduling).

## Migration Notes

- No storage migration: `ProblemProgress` shape unchanged.
- Existing localStorage entries with weekday `requeueDate` values will be rolled to weekend dates on the next app open by the mount-time `processRequeue` call in `useStore.ts:13-15`. No explicit data scrub needed.

## References

- Design spec: `docs/superpowers/specs/2026-07-08-reviews-tab-design.md`
- Related plan: `thoughts/shared/plans/2026-07-08-interview-study-planner.md` (Phase 6 — requeue)
- Scheduling bug location: `src/lib/requeue.ts:31`
- Pattern for new view: `src/components/TodayView.tsx:16-23` (makeHandlers), `src/components/ProblemCard.tsx:10-13`

---

## Summary of files changed

| File | Change |
|------|--------|
| `src/lib/requeue.ts` | Add exported `nextReviewDay`, `weekendOf`. Fix both branches to land on weekend. |
| `src/lib/requeue.test.ts` | Tests for new helpers; update 2 daily-fallback tests; add regression test. |
| `src/components/ReviewsView.tsx` | New — weekend-grouped review listing. |
| `src/components/Sidebar.tsx` | Add `'reviews'` to `Tab` union (after `'today'`), `TABS` entry, `RotateCw` import. |
| `src/App.tsx` | Add `reviews` to `TITLES`, import + render `ReviewsView` in tab router. |
| `src/components/TodayView.tsx` | Remove "Due for Review" card (`:87-104`), `reviews` const (`:27`), `reviews.length` from Due today stat (`:53`). |

6 files — 1 new, 5 edits.
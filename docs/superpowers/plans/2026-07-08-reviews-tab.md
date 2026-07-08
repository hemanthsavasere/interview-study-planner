# Reviews Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated Reviews tab listing all solved-but-not-confident problems in the spaced-repetition loop, grouped by upcoming weekend with day sub-sections. Also fix the scheduling bug where missed reviews land on weekdays (in both cadence branches of `processRequeue`).

**Architecture:** TDD'd scheduling fix first — two new exported helpers in `src/lib/requeue.ts` (`nextReviewDay`, `weekendOf`) replace the weekday-landing fallback. Then shell wiring (Sidebar tab entry + App router branch + placeholder view), TodayView cleanup (remove the relocated "Due for Review" card), and finally the real `ReviewsView` reusing `ProblemCard` + the `makeHandlers` pattern verbatim from TodayView. Read-only data over existing state; no schema changes.

**Tech Stack:** Vite + React 19, TypeScript, Tailwind v4, shadcn/ui (new-york), lucide-react, Vitest + jsdom.

---

## Reference

- Design spec: `docs/superpowers/specs/2026-07-08-reviews-tab-design.md`
- Existing detailed notes plan: `thoughts/shared/plans/2026-07-08-reviews-tab.md`
- Test pattern reference: `src/lib/requeue.test.ts`
- View pattern reference: `src/components/TodayView.tsx:16-23` (`makeHandlers`), `src/components/ProblemCard.tsx:10-13` (props)
- Commands: `npm test` (vitest run), `npm run lint` (eslint src), `npm run typecheck` (tsc --noEmit), `npm run build`, `npm run dev`

### Conventions (verified)
- `noUnusedLocals` + `noUnusedParameters` ON — remove unused imports/vars.
- Only pure `lib/*` modules get unit tests; view components verified via typecheck + lint + manual smoke.
- shadcn `Badge` accepts `variant="secondary"`. `Button` has `ghost`, `icon-sm`, `sm` sizes.
- All weekday calculations use `new Date(iso + 'T12:00:00').getDay()` (0=Sun, 6=Sat) to avoid TZ rollover.
- The spec's `weekendOf` pseudocode walks forward to the next Saturday, which sends a Sunday input to *next* weekend. This plan's helper anchors Sunday to its own (yesterday's) Saturday to satisfy "on-Sun → same weekend".

### Tab placement decision
Spec lines 67–69 list `'reviews'` after `'calendar'`. The chosen placement (confirmed by the user) puts it between **Today and Calendar**: `today → reviews → calendar → topics → notes → settings`. This overrides the spec wording; all other spec requirements are intact.

## File Structure

```
src/
  lib/
    requeue.ts                    # MODIFY: add exported `nextReviewDay`, `weekendOf`; fix both branches to land on weekend
    requeue.test.ts               # MODIFY: new describe blocks for helpers; update 2 daily-fallback assertions; regression test
  components/
    ReviewsView.tsx               # CREATE (Phase 2: placeholder; Phase 4: full implementation)
    Sidebar.tsx                   # MODIFY: add `'reviews'` to `Tab` union after `'today'`, new TABS entry, import `RotateCw`
    App.tsx                       # MODIFY: `reviews` in `TITLES`, import + render `ReviewsView` in tab router
    TodayView.tsx                 # MODIFY: remove "Due for Review" card, `reviews` const, `reviews.length` from Due today stat
```

6 files — 1 new, 5 edits.

---

## Task 1: Scheduling fix in `requeue.ts` (TDD)

**Files:**
- Modify: `src/lib/requeue.ts`
- Test: `src/lib/requeue.test.ts`

**Goal:** Add two exported helpers (`nextReviewDay`, `weekendOf`) and replace the weekday-landing fallback `addDays(today, 1)` in **both** the weekly branch (`requeue.ts:31`) and the daily branch (`requeue.ts:27`) with `nextReviewDay(today)`, so every scheduled review lands on a Saturday or Sunday.

### Step 1.1: Write failing tests for `nextReviewDay`

- [ ] **Step 1: Add the failing tests**

Open `src/lib/requeue.test.ts`. Update the import line (line 2) to include the new helpers (they don't exist yet, so this will fail to compile — that's expected for the red phase):

```ts
import { processRequeue, nextReviewDay, weekendOf } from './requeue'
```

Append two new `describe` blocks at the end of the file (after the closing `})` of the existing `describe('requeue', ...)` block on line 47):

```ts
describe('nextReviewDay', () => {
  it('Wednesday -> next Saturday', () => {
    // 2099-01-14 is a Wednesday
    expect(new Date('2099-01-14T12:00:00').getDay()).toBe(3)
    expect(nextReviewDay('2099-01-14')).toBe('2099-01-16')
  })
  it('Friday -> next Saturday', () => {
    // 2099-01-15 is a Friday
    expect(new Date('2099-01-15T12:00:00').getDay()).toBe(5)
    expect(nextReviewDay('2099-01-15')).toBe('2099-01-16')
  })
  it('Saturday -> following Sunday', () => {
    // 2099-01-16 is a Saturday
    expect(new Date('2099-01-16T12:00:00').getDay()).toBe(6)
    expect(nextReviewDay('2099-01-16')).toBe('2099-01-17')
  })
  it('Sunday -> next Saturday', () => {
    // 2099-01-17 is a Sunday
    expect(new Date('2099-01-17T12:00:00').getDay()).toBe(0)
    expect(nextReviewDay('2099-01-17')).toBe('2099-01-23')
  })
})

describe('weekendOf', () => {
  it('mid-week Wednesday -> this Sat/Sun', () => {
    // 2099-01-14 is a Wednesday
    expect(weekendOf('2099-01-14')).toEqual({ sat: '2099-01-16', sun: '2099-01-17' })
  })
  it('on-Saturday -> same Sat/Sun', () => {
    expect(weekendOf('2099-01-16')).toEqual({ sat: '2099-01-16', sun: '2099-01-17' })
  })
  it('on-Sunday -> same weekend (yesterday Sat / today Sun)', () => {
    expect(weekendOf('2099-01-17')).toEqual({ sat: '2099-01-16', sun: '2099-01-17' })
  })
  it('on-Monday -> this coming Sat/Sun', () => {
    // 2099-01-12 is a Monday
    expect(new Date('2099-01-12T12:00:00').getDay()).toBe(1)
    expect(weekendOf('2099-01-12')).toEqual({ sat: '2099-01-16', sun: '2099-01-17' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/requeue.test.ts`
Expected: FAIL — import error: `nextReviewDay` / `weekendOf` are not exported from `./requeue` (or "nextReviewDay is not defined").

### Step 1.2: Implement `nextReviewDay` and `weekendOf`

- [ ] **Step 3: Add the two helpers to `requeue.ts`**

Open `src/lib/requeue.ts`. After line 7 (the closing of `dayOf`), insert:

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

Leave `processRequeue` untouched for now (the bodies of the next sub-steps will edit it).

- [ ] **Step 4: Run tests to verify the helper tests pass**

Run: `npm test -- src/lib/requeue.test.ts`
Expected: PASS for `nextReviewDay` and `weekendOf` blocks (the existing `requeue` block tests still pass too).

### Step 1.3: Fix the weekly branch with TDD

- [ ] **Step 5: Write a failing regression test for the weekday-landing bug**

Append inside the existing `describe('requeue', () => { ... })` block, before its closing `})` on line 47:

```ts
  it('missed review (weekly cadence) lands on a weekend >= today', () => {
    // 2099-01-13 is a Wednesday; unsolved problem present -> weekly cadence
    const today = '2099-01-13'
    expect(new Date(today + 'T12:00:00').getDay()).toBe(3)
    const r = processRequeue(
      { a: solved('a', '2099-01-01', '2099-01-05') },
      [prob('a'), { ...prob('b'), status: 'not-started' as const } as unknown as Parameters<typeof processRequeue>[1][number]],
      cfg,
      today,
    )
    expect(r.a.requeueCount).toBe(1)
    const wd = new Date(r.a.requeueDate + 'T12:00:00').getDay()
    expect(wd === 6 || wd === 0).toBe(true)
    expect(r.a.requeueDate >= today).toBe(true)
  })
```

(Note: the `as unknown as ...` cast works around the `prob()` helper returning a `Problem` without a `status` field — `processRequeue`'s second arg is `Problem[]` and only checks `!progress[p.id]`, so `status` isn't required on it. If that cast produces a lint error, an alternative is to pass `[prob('a'), prob('b')]` plus an entry in the progress record with `status: 'not-started'`. Prefer that form if the cast lints badly — see Step 6 note.)

- [ ] **Step 6: Run the regression test to verify it fails**

Run: `npm test -- src/lib/requeue.test.ts`
Expected: FAIL — the "missed review" test fails because `addDays(today, 1)` returns `2099-01-14` (a Wednesday, weekday), so `wd === 6 || wd === 0` is `false`.

If instead the test errors on the cast, replace the test body with the cleaner form (no cast) and re-run to confirm the red:

```ts
  it('missed review (weekly cadence) lands on a weekend >= today', () => {
    const today = '2099-01-13'
    const r = processRequeue(
      {
        a: solved('a', '2099-01-01', '2099-01-05'),
        b: { problemId: 'b', status: 'not-started', notes: '', lastUpdated: '2099-01-01', scheduledDate: '2099-01-01' },
      },
      [prob('a'), prob('b')],
      cfg,
      today,
    )
    expect(r.a.requeueCount).toBe(1)
    const wd = new Date(r.a.requeueDate + 'T12:00:00').getDay()
    expect(wd === 6 || wd === 0).toBe(true)
    expect(r.a.requeueDate >= today).toBe(true)
  })
```

- [ ] **Step 7: Fix the weekly branch**

In `src/lib/requeue.ts`, replace line 31:

```ts
      if (date <= today) date = addDays(today, 1)
```

with:

```ts
      if (date <= today) date = nextReviewDay(today)
```

- [ ] **Step 8: Run full requeue tests to verify green**

Run: `npm test -- src/lib/requeue.test.ts`
Expected: PASS — all tests including the new regression test now pass.

### Step 1.4: Fix the daily branch + update existing assertions

- [ ] **Step 9: Update the two daily-fallback tests to expect weekend landing**

In `src/lib/requeue.test.ts`, the daily branch (`useDaily` when there are no unsolved problems) currently lands on `today+1` (a weekday). After the fix it should land on the next weekend day. The two affected tests are "deadline passed + no unsolved -> daily fallback" (lines 36–41) and "no unsolved problems -> daily fallback" (lines 42–46).

Replace both tests with the following (keeps the same `it` descriptions so test counts are stable):

```ts
  it('deadline passed + no unsolved -> daily fallback lands on weekend', () => {
    const today = '2100-01-01' // Friday
    expect(new Date(today + 'T12:00:00').getDay()).toBe(5)
    const past: ScheduleConfig = { ...cfg, deadline: '2099-12-31' }
    const r = processRequeue({ a: solved('a', '2099-12-01') }, [prob('a')], past, today)
    expect(r.a.requeueDate).toBe('2100-01-02') // Saturday
    expect(new Date(r.a.requeueDate + 'T12:00:00').getDay()).toBe(6)
  })
  it('no unsolved problems -> daily fallback lands on weekend', () => {
    const today = '2099-06-01' // Monday
    expect(new Date(today + 'T12:00:00').getDay()).toBe(1)
    const r = processRequeue({ a: solved('a', '2099-05-20') }, [prob('a')], cfg, today)
    // next weekend day from Mon 2099-06-01 is Sat 2099-06-05 (nextReviewDay returns the next Sat or Sun, strictly > today)
    expect(r.a.requeueDate).toBe('2099-06-05')
    expect(new Date(r.a.requeueDate + 'T12:00:00').getDay()).toBe(6)
  })
```

- [ ] **Step 10: Run tests to confirm they fail (red)**

Run: `npm test -- src/lib/requeue.test.ts`
Expected: FAIL — the two updated daily-fallback tests fail because the daily branch still returns `today+1` (a weekday).

- [ ] **Step 11: Fix the daily branch**

In `src/lib/requeue.ts`, replace line 27:

```ts
      date = addDays(today, 1)
```

with:

```ts
      date = nextReviewDay(today)
```

- [ ] **Step 12: Run full requeue tests — all green**

Run: `npm test -- src/lib/requeue.test.ts`
Expected: PASS — all `requeue`, `nextReviewDay`, `weekendOf` tests green.

### Step 1.5: Verify + commit

- [ ] **Step 13: Run typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both pass clean (no unused imports; `nextReviewDay` and `weekendOf` are now referenced by tests and by `processRequeue`).

- [ ] **Step 14: Run full test suite (no regressions elsewhere)**

Run: `npm test`
Expected: all test files pass.

- [ ] **Step 15: Commit**

```bash
git add src/lib/requeue.ts src/lib/requeue.test.ts
git commit -m "fix(requeue): land missed reviews on weekend in both cadence branches

Add nextReviewDay + weekendOf helpers; replace addDays(today,1) fallback
in weekly and daily branches so every scheduled review is a Sat or Sun.
Anchor weekendOf's Sunday to its own Saturday (same weekend)."
```

- [ ] **Step 16: Pause for manual confirmation**

Confirm with the reviewer before starting Task 2. Verification target: `npm test` is fully green; `nextReviewDay`/`weekendOf` outputs match a calendar for `2099-01-12` (Mon), `2099-01-14` (Wed), `2099-01-16` (Sat), `2099-01-17` (Sun).

---

## Task 2: Sidebar + App shell wiring

**Files:**
- Modify: `src/components/Sidebar.tsx:2,7,10-11`
- Create: `src/components/ReviewsView.tsx` (placeholder form)
- Modify: `src/App.tsx:6 (import), 17-19 (TITLES), 33-37 (tab router)`

**Goal:** Add the `'reviews'` tab id between Today and Calendar in the `Tab` union and `TABS` array, the `RotateCw` icon, the `TITLES` entry, and a router branch rendering a placeholder `ReviewsView`. The placeholder accepts the same props as the eventual view so typecheck passes now.

### Step 2.1: Create the placeholder ReviewsView

- [ ] **Step 1: Write `src/components/ReviewsView.tsx` (placeholder)**

Create the file with this exact content:

```tsx
import type { Problem } from '../types'

export function ReviewsView(_props: { problems: Problem[]; store: unknown }) {
  return <div className="text-sm text-muted-foreground">Reviews — coming soon.</div>
}
```

(The `store: unknown` typing is intentional: App.tsx will pass the real store type, and TS will accept it because `unknown` is assignable-from anything. Phase 4 tightens it.)

### Step 2.2: Wire the Sidebar

- [ ] **Step 2: Update `Sidebar.tsx` imports**

Open `src/components/Sidebar.tsx`. Replace line 2:

```ts
import { CalendarDays, CalendarRange, Layers, StickyNote, Settings, Sun, Moon } from 'lucide-react'
```

with:

```ts
import { CalendarDays, CalendarRange, Layers, StickyNote, Settings, Sun, Moon, RotateCw } from 'lucide-react'
```

- [ ] **Step 3: Update the `Tab` union**

Replace line 7:

```ts
export type Tab = 'today' | 'calendar' | 'topics' | 'notes' | 'settings'
```

with:

```ts
export type Tab = 'today' | 'reviews' | 'calendar' | 'topics' | 'notes' | 'settings'
```

- [ ] **Step 4: Insert the `reviews` TABS entry between `today` and `calendar`**

Replace lines 10–11:

```ts
  { id: 'today', label: 'Today', icon: CalendarDays },
  { id: 'calendar', label: 'Calendar', icon: CalendarRange },
```

with:

```ts
  { id: 'today', label: 'Today', icon: CalendarDays },
  { id: 'reviews', label: 'Reviews', icon: RotateCw },
  { id: 'calendar', label: 'Calendar', icon: CalendarRange },
```

### Step 2.3: Wire App.tsx

- [ ] **Step 5: Add the `ReviewsView` import**

Open `src/App.tsx`. After line 8 (`import { TodayView }...`), add:

```ts
import { ReviewsView } from './components/ReviewsView'
```

- [ ] **Step 6: Update `TITLES`**

Replace lines 17–19:

```ts
const TITLES: Record<Tab, string> = {
  today: 'Today', calendar: 'Calendar', topics: 'Topics', notes: 'Notes', settings: 'Settings',
}
```

with:

```ts
const TITLES: Record<Tab, string> = {
  today: 'Today', reviews: 'Reviews', calendar: 'Calendar', topics: 'Topics', notes: 'Notes', settings: 'Settings',
}
```

- [ ] **Step 7: Insert the `reviews` branch in the tab router ternary**

Replace lines 33–37:

```tsx
            {tab === 'today' ? <TodayView problems={problems} store={store} />
              : tab === 'calendar' ? <CalendarView problems={problems} store={store} />
              : tab === 'topics' ? <TopicsView problems={problems} store={store} />
              : tab === 'notes' ? <NotesView problems={problems} store={store} />
              : <SettingsView problems={problems} store={store} />}
```

with:

```tsx
            {tab === 'today' ? <TodayView problems={problems} store={store} />
              : tab === 'reviews' ? <ReviewsView problems={problems} store={store} />
              : tab === 'calendar' ? <CalendarView problems={problems} store={store} />
              : tab === 'topics' ? <TopicsView problems={problems} store={store} />
              : tab === 'notes' ? <NotesView problems={problems} store={store} />
              : <SettingsView problems={problems} store={store} />}
```

### Step 2.4: Verify + commit

- [ ] **Step 8: Run typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both pass. (App passes the real `useStore` return to `ReviewsView`; because the placeholder's `store` param is typed `unknown`, the call is assignable. `noUnusedParameters` doesn't flag `_props` because of the leading underscore.)

If lint complains about `_props` underscore: rename the param to `_ignored` and destructure nothing. (Config typically allows leading-underscore unused params — check `tsconfig.app.json` and `eslint.config.js`.)

- [ ] **Step 9: Manual smoke (optional, recommended)**

Run: `npm run dev`
Expected: the Reviews tab appears between Today and Calendar in the sidebar; clicking it renders "Reviews — coming soon." and the header title reads "Reviews".

- [ ] **Step 10: Commit**

```bash
git add src/components/ReviewsView.tsx src/components/Sidebar.tsx src/App.tsx
git commit -m "feat(reviews): wire Reviews tab in sidebar + app shell (placeholder)"
```

- [ ] **Step 11: Pause for manual confirmation before Task 3**

---

## Task 3: TodayView cleanup

**Files:**
- Modify: `src/components/TodayView.tsx:27, 53, 87-105`

**Goal:** Remove the "Due for Review" card and the `reviews` const, and drop `reviews.length` from the "Due today" stat. The Scheduled card, date navigator, "Solved" and "Upcoming reviews (next 7d)" stat tiles are all kept.

### Step 3.1: Remove the `reviews` const

- [ ] **Step 1: Delete the `reviews` const**

Open `src/components/TodayView.tsx`. Delete line 27:

```ts
  const reviews = Object.values(store.state.progress).filter(p => p.requeueDate === selectedDate)
```

### Step 3.2: Update "Due today" stat

- [ ] **Step 2: Drop `reviews.length` from the "Due today" stat**

Replace line 53:

```tsx
            <div className="text-3xl font-semibold tabular-nums">{scheduled.length + reviews.length}</div>
```

with:

```tsx
            <div className="text-3xl font-semibold tabular-nums">{scheduled.length}</div>
```

### Step 3.3: Remove the "Due for Review" card

- [ ] **Step 3: Delete the entire "Due for Review" Card block**

Delete lines 87–105 inclusive — from the blank line before `<Card>` (line 87) through the closing `</Card>` (line 104) and the trailing blank line (line 105). Concretely, remove this block:

```tsx

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Due for Review
            <Badge variant="secondary" className="ml-2">{reviews.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {reviews.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-muted-foreground">
              <CheckCircle2 className="size-8 mb-2 text-primary/60" />
              <p className="text-sm">No reviews due — nice!</p>
            </div>
          ) : reviews.map(p => {
            const pr = byId.get(p.problemId); if (!pr) return null
            return <ProblemCard key={p.problemId} problem={pr} progress={p} {...makeHandlers(p.problemId)} />
          })}
        </CardContent>
      </Card>

```

Leave the surrounding Scheduled `<Card>` block (lines ~106–123) intact.

### Step 3.4: Verify + commit

- [ ] **Step 4: Run typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both pass. `Badge`, `CheckCircle2`, and `ProblemCard` are still used elsewhere in TodayView (the Scheduled card uses them), so no unused-import errors. `makeHandlers` still used by the Scheduled card. `reviews` is fully removed.

- [ ] **Step 5: Run build (catches any unused-import lint that tsc misses)**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 6: Manual smoke**

Run: `npm run dev`
Expected:
- Today view shows the three stat tiles (Solved / Due today / Upcoming reviews).
- "Due today" stat equals the Scheduled card's count, no overflow from reviews.
- No "Due for Review" card on screen.
- Scheduled card still renders and is editable.

- [ ] **Step 7: Commit**

```bash
git add src/components/TodayView.tsx
git commit -m "refactor(today): remove relocated 'Due for Review' card

The reviews listing moves to the dedicated Reviews tab; remove the card,
the reviews const, and reviews.length from the 'Due today' stat."
```

- [ ] **Step 8: Pause for manual confirmation before Task 4**

---

## Task 4: ReviewsView implementation

**Files:**
- Modify: `src/components/ReviewsView.tsx` (replace the Task 2 placeholder)

**Goal:** Full weekend-grouped, read-only Reviews view reusing `ProblemCard` + `makeHandlers`. Groups solved items with a truthy `requeueDate` by weekend, labels the first upcoming weekend "This weekend", the next "Next weekend", subsequent ones by formatted dates, fully-past weekends "Past — will roll forward on next open", and renders Saturday/Sunday day sub-sections with placeholder rows when a day is empty.

### Step 4.1: Replace ReviewsView with the full implementation

- [ ] **Step 1: Replace the contents of `src/components/ReviewsView.tsx`**

Overwrite the entire file with:

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

  // Group by weekend (key = sat ISO date)
  const groups = new Map<string, { sat: string; sun: string; items: ProblemProgress[] }>()
  for (const p of reviewItems) {
    const { sat, sun } = weekendOf(p.requeueDate!)
    if (!groups.has(sat)) groups.set(sat, { sat, sun, items: [] })
    groups.get(sat)!.items.push(p)
  }

  const sortedWeekends = Array.from(groups.values()).sort((a, b) => a.sat.localeCompare(b.sat))

  // First upcoming weekend = first whose Sunday >= today
  const firstUpcomingIdx = sortedWeekends.findIndex(w => w.sun >= today)

  function labelFor(idx: number): string {
    if (firstUpcomingIdx === -1 || idx < firstUpcomingIdx) {
      return 'Past — will roll forward on next open'
    }
    if (idx === firstUpcomingIdx) return 'This weekend'
    if (idx === firstUpcomingIdx + 1) return 'Next weekend'
    return ''
  }

  function fmt(iso: string): string {
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
        const base = labelFor(idx)
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

### Step 4.2: Verify automated gates

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS. `store` is now strongly typed via `ReturnType<typeof import('../hooks/useStore').useStore>`; `weekendOf` and `todayISO` resolve; `Status`, `Problem`, `ProblemProgress` all imported.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS. All imports are referenced. (If `Card`/`CardHeader`/`CardTitle` get flagged because the children-of-CardContent JSX usage is somehow not detected — they are used — this should not fire. If it does, double check the JSX literal includes `<Card>`, `<CardHeader>`, `<CardTitle>`.)

- [ ] **Step 4: Run full test suite (no regressions)**

Run: `npm test`
Expected: all tests pass — no test touches this view (convention: views are manual-smoke only).

- [ ] **Step 5: Run build**

Run: `npm run build`
Expected: succeeds.

### Step 4.3: Manual verification

- [ ] **Step 6: Manual smoke — empty state**

Run: `npm run dev`. Open the Reviews tab on a fresh store (no solved items yet).
Expected: centered `RotateCw` icon and the empty-state copy `Nothing in the review loop yet — mark problems 'Solved' to enroll them for weekly re-attempts.`

- [ ] **Step 7: Manual smoke — populated weekends**

Without reloading dev, mark several problems `'solved'` (not `'confident'`) from the Today or Topics view. Trigger a requeue either by reloading (the `useStore` mount effect runs `processRequeue` on app open) or by any `updateProgress` call (also runs `processRequeue`). Switch to the Reviews tab.
Expected:
- Description line shows `{N} problems in the spaced-repetition loop, grouped by upcoming weekend.`
- One Card per weekend; header title is "This weekend" for the first upcoming, "Next weekend" for the second, then `"MMM d – MMM d"` for further-out ones.
- Each Card has a `Badge` with the total problems in that weekend, and Saturday / Sunday sub-sections with their own count Badges.
- Items partition by `requeueDate` — Saturday items under Saturday, Sunday items under Sunday.

- [ ] **Step 8: Manual smoke — past weekend self-heals**

Seed a solved-not-confident problem whose `requeueDate` is in the past (e.g. set `requeueDate` to a past Monday directly in localStorage, or solve a problem, wait so it falls due, then advance with `addDays` manually via DevTools `localStorage` mutation — pick whatever's fastest). Open the app.
Expected: on first open, the past weekend card may briefly show with the "Past — will roll forward on next open" label. After the `useStore` mount effect runs `processRequeue` (which it does once on mount per `useStore.ts:13-15`), that item's `requeueDate` should roll forward to a future weekend and the past card should disappear. Reload once and confirm: no past card remains.

- [ ] **Step 9: Manual smoke — status + notes persistence**

From inside Reviews, change a problem's status to `'attempted'` and edit its notes.
Expected:
- The problem immediately drops out of the Reviews listing (its status is no longer `'solved'`).
- Switching to Today or Topics shows the updated status and notes.
- Reloading preserves both.
- Re-marking it `'solved'` re-enrolls it (after `processRequeue` recomputes on the update or next open).

- [ ] **Step 10: Manual smoke — empty day placeholder**

Find a weekend where Saturday has problems but Sunday has none (or vice-versa). Confirm the empty day shows `Nothing for Sunday — nice!` (or `Nothing for Saturday — nice!`) and the day's count Badge reads `0`.

### Step 4.4: Commit

- [ ] **Step 11: Commit**

```bash
git add src/components/ReviewsView.tsx
git commit -m "feat(reviews): implement weekend-grouped Reviews view

Reuse ProblemCard + makeHandlers from TodayView so status/notes
behave identically. Group by weekendOf, label This/Next/formatted/Past,
split Sat/Sun day sections with empty-day placeholders."
```

- [ ] **Step 12: Final pause for manual confirmation**

Reviewer checks all manual-smoke items, then declares the feature done.

---

## Testing Strategy Summary

**Unit (Vitest, in `src/lib/requeue.test.ts`):**
- `nextReviewDay`: Wed→Sat, Fri→Sat, Sat→Sun, Sun→next Sat.
- `weekendOf`: mid-week Wed → this Sat/Sun; on-Sat → same; on-Sun → same weekend (yesterday Sat / today Sun); on-Mon → this coming Sat/Sun.
- Regression: missed review with past `requeueDate`, today=Wed → rescheduled to a weekend date `>= today` (weekly cadence).
- Updated daily-fallback: deadline-passed fallback and no-unsolved fallback now assert a specific weekend date (Sat) instead of `today+1`.

**Integration/component:** none (follows repo convention — views verified via typecheck + lint + manual smoke).

**Manual smoke path:** empty state → seed solved-not-confident → confirm grouping/labels → past-weekend self-heal on reload → status/notes persistence → empty-day placeholder.

---

## Performance Notes

- At most ~475 problems; `Object.values(progress)` is tiny. No virtualization.
- Grouping is a single linear pass — negligible.
- `processRequeue` already called on mount (`useStore.ts:13-15`) and on every `updateProgress` (`:25`), so stale weekday `requeueDate` values self-heal without explicit scrubbing.

---

## Migration Notes

- No schema change. `ProblemProgress.requeueDate` stays `?string`.
- Pre-existing localStorage entries that have a weekday `requeueDate` get rolled forward to a weekend date on the next app open (and on any subsequent `updateProgress`). No explicit data-migration step required.

---

## Self-Review Checklist (for the execution engineer to confirm before each phase commit)

- [ ] Spec coverage — every spec section maps to a task:
  - "Scheduling Fix in `src/lib/requeue.ts`" → Task 1 (both branches, helpers, tests, regression).
  - "Sidebar & App Shell" → Task 2 (with the user-confirmed tab order Today → Reviews → Calendar).
  - "TodayView.tsx Cleanup" → Task 3.
  - "ReviewsView.tsx" → Task 4 (data pipeline, labels, day sections, empty state, malformed/past edge cases).
  - "Error Handling" — past-weekend edge case handled by `labelFor`; malformed `requeueDate` (falsy) filtered out in `reviewItems`; weekday `requeueDate` values (pre-fix data) silently absent from a day-section but still counted in the card badge, self-heal on next `processRequeue` pass.
  - "Non-Goals" — no new fields, no badges/buttons, no manual cadence toggle, no mobile layout, no new shadcn components, no view component tests. All respected.
- [ ] No placeholders — every code step shows the exact code; no TODO/TBD/"add appropriate…" lines.
- [ ] Type consistency — `nextReviewDay(from: string): string` and `weekendOf(date: string): { sat: string; sun: string }` are used identically in `requeue.ts` (Task 1) and `ReviewsView.tsx` (Task 4). `ReviewsView` props `{ problems: Problem[]; store: ReturnType<typeof import('../hooks/useStore').useStore> }` match the placeholder signature loosened in Task 2. `labelFor(idx)` and `fmt(iso)` named consistently between phases.
- [ ] All file paths exact; all commands show expected output.

---

**Done criteria (final):** `npm run typecheck && npm run lint && npm test && npm run build` all pass clean; the 12 manual-smoke items in Task 4 all behave as described; the Reviews tab sits between Today and Calendar in the sidebar.
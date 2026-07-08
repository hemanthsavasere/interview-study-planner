# Reviews Tab Design Spec

**Goal:** Add a dedicated Reviews tab that surfaces all solved-but-not-confident problems in the spaced-repetition loop, grouped by upcoming weekend (Sat/Sun) with day sub-sections. Fix a scheduling bug where missed reviews land on weekdays.

**Scope:** Pure view + minor scheduling fix. No new state fields, no migration, no behavior changes outside the requeue weekday-landing fix.

---

## Architecture & Data Model

No schema changes. The Reviews tab is a read-only view over existing data: `store.state.progress[p.problemId].status` and `.requeueDate`. `ProblemProgress`, `AppState`, and `useStore` stay as-is.

### Key constraints
- Filter: `status === 'solved'` only (matches `processRequeue`'s existing guard at `requeue.ts:22`).
- `status === 'confident'` is terminal — excluded.
- `status === 'attempted'` or `'not-started'` — excluded (not in the review loop).
- Only items with a truthy `requeueDate` are displayable.

---

## Scheduling Fix in `src/lib/requeue.ts`

### Current bug (`requeue.ts:30-31`)
When unsolved problems exist, missed reviews fall through to `addDays(today, 1)` — which can land on Monday through Friday. Reviews scheduled to weekdays don't surface in the weekend-grouped view.

### Fix
Add two helpers:

```ts
export function nextReviewDay(from: string): string {
  let d = addDays(from, 1)
  while (dayOf(d) !== 6 && dayOf(d) !== 0) d = addDays(d, 1)
  return d
}

export function weekendOf(date: string): { sat: string; sun: string } {
  let s = date
  while (dayOf(s) !== 6) s = addDays(s, 1)
  return { sat: s, sun: addDays(s, 1) }
}
```

Then in `processRequeue`'s weekly branch, replace:
```ts
if (date <= today) date = addDays(today, 1)
```
with:
```ts
if (date <= today) date = nextReviewDay(today)
```

**Behavior:**
- Wed → Sat, Fri → Sat, Sat → Sun, Sun → next Sat.
- Daily-cadence branch (`addDays(today, 1)`) is unchanged — daily mode uses every day as a review day.

### Tests to add in `requeue.test.ts`
- `nextReviewDay`: Wed→next Sat, Sat→Sun, Sun→next Sat, Fri→Sat.
- `weekendOf`: Wed Jul 8 → `{ '2026-07-11', '2026-07-12' }`; on-Sat → same weekend; on-Sun → same weekend; on-Mon → this/next weekend (the upcoming Sat+Sun from Monday).
- Existing tests all still pass.
- Regression test: missed review with past `requeueDate`, today=Wednesday → rescheduled to Sat or Sun ≥ today (cover the fix).

---

## Sidebar & App Shell

### Sidebar.tsx
- `Tab` type: add `'reviews'` after `'calendar'`:
  `'today' | 'calendar' | 'reviews' | 'topics' | 'notes' | 'settings'`
- `TABS` array: new entry `{ id: 'reviews', label: 'Reviews', icon: RotateCw }` between Calendar and Topics.
- Import `RotateCw` from `lucide-react`.

### App.tsx
- Import `ReviewsView` from `./components/ReviewsView`.
- `TITLES`: add `reviews: 'Reviews'`.
- Tab router: add `tab === 'reviews' ? <ReviewsView problems={problems} store={store} />` branch.
- `solved` count in AppHeader already computed from filter on `'solved' || 'confident'` — no change needed.

---

## TodayView.tsx Cleanup

Remove the "Due for Review" card (the entire `<Card>` block with `CardTitle "Due for Review"`). Also remove:
- The `reviews` const (`line ~27`).
- The `reviews.length` term from the "Due today" stat tile (the stat becomes `scheduled.length` alone).

### Things kept in TodayView
- Date navigator (chevrons + "Today" button).
- Scheduled card.
- "Solved" and "Upcoming reviews (next 7d)" stat tiles (the latter serves as a cross-reference signal even though the listing moved).

---

## ReviewsView.tsx

**File:** new `src/components/ReviewsView.tsx`.

**Props:**
```ts
{ problems: Problem[]; store: ReturnType<typeof import('../hooks/useStore').useStore> }
```

### Data pipeline
1. `byId = new Map(problems.map(p => [p.id, p]))`.
2. `reviewItems = Object.values(store.state.progress).filter(p => p.status === 'solved' && p.requeueDate)`.
3. Group by `weekendOf(p.requeueDate)`.
4. Sort weekends ascending by `sat`.
5. Compute labels:
   - First weekend whose Sunday >= todayISO() (i.e. the weekend that contains today or is the next one coming) → `"This weekend"`
   - Second → `"Next weekend"`
   - Subsequent → formatted `"MMM d – MMM d"` (e.g. `"Jul 18 – Jul 19"`)
   - Weekends fully in the past → `"Past — will roll forward on next open"` (briefly visible between app sessions only).

### Rendering
- Description line: `"{N} problems in the spaced-repetition loop, grouped by upcoming weekend."`
- For each weekend: a `Card` with `CardHeader` (title + `Badge` count) and `CardContent`.
- Inside each Card: "Saturday" and "Sunday" `DaySection` blocks.
- A `DaySection`: heading (`"Saturday — Jul 11"`) + count Badge, then `ProblemCard` list using the same `makeHandlers(problemId)` pattern from TodayView so status changes and notes work identically.
- Days with zero problems: placeholder row `"Nothing for Saturday — nice!"` so the week shape stays predictable.

### Empty state
- Icon: lucide `RotateCw` (size-10, `text-primary/60`), centered.
- Text: `"Nothing in the review loop yet — mark problems 'Solved' to enroll them for weekly re-attempts."`

---

## Error Handling
- `ReviewsView` is read-only — no error paths beyond the empty state.
- Malformed `requeueDate` (falsy) on a `solved` entry: filtered out in `reviewItems`. The next `processRequeue` pass (on any `updateProgress` call) will re-attach a date.
- Past weekend edge case: only visible briefly before `processRequeue` runs on app open. Label as "Past — will roll forward..." and treat as a normal week card.

---

## Non-Goals
- No new fields on `ProblemProgress` or `AppState`.
- No missed-count badges or "skip to next" buttons.
- No manual cadence toggle in UI.
- No mobile-specific layout.
- No new shadcn components (reuses Card, CardHeader, CardTitle, CardContent, Badge, Button, ProblemCard).
- Snapshot/component tests: follow existing convention (unit tests for `lib/*`, typecheck + lint + manual smoke for views).

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/requeue.ts` | Add `nextReviewDay`, `weekendOf`. Fix `addDays(today,1)` → `nextReviewDay(today)` in weekly branch. |
| `src/lib/requeue.test.ts` | Tests for new helpers + regression test for the weekday-landing fix. |
| `src/components/ReviewsView.tsx` | New — weekend-grouped review listing. |
| `src/components/Sidebar.tsx` | Add `'reviews'` to `Tab`, new TABS entry, `RotateCw` import. |
| `src/App.tsx` | Add `reviews` to `TITLES`, tab branch rendering `ReviewsView`. |
| `src/components/TodayView.tsx` | Remove "Due for Review" card, `reviews` const, `reviews.length` from Due today stat. |

6 files. ~1 new, 5 edits.

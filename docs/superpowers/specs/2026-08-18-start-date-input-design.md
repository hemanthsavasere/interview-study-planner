## Problem Statement

As a learner using the interview study planner, when I generate a study schedule I cannot choose when the plan begins. The scheduler always starts spreading problems from today's date. If I want to start studying next Monday, or plan around a busy week ahead, I have no way to express that — the app silently assumes "now." This makes the schedule useless for anyone who needs to plan ahead, and forces a regenerate-on-the-day workflow.

## Solution

Add a **Start Date** input to the Schedule card on the Settings page, placed above the existing Deadline input. The field is pre-filled with today's date so the user always sees a concrete value, but they can edit it to any future date before the deadline. When the user clicks **Generate Schedule** or **Regenerate (unsolved)**, problems are spread from the chosen Start Date toward the Deadline instead of from today. An empty field falls back to today, preserving current behavior for users who never touch it.

## User Stories

1. As a learner, I want to see a Start Date field on the Settings page, so that I know I can control when my plan begins.
2. As a learner, I want the Start Date field to show today's date by default, so that I don't have to set it when I want to start today.
3. As a learner, I want to pick a future Start Date, so that my schedule begins on the day I actually plan to start studying.
4. As a learner, I want problems to be spread from my chosen Start Date toward the Deadline, so that the plan matches my real availability.
5. As a learner, I want to clear the Start Date field and still generate a schedule, so that an empty field doesn't block me (it falls back to today).
6. As a learner, I want to be warned if I set a Start Date before today, so that I don't accidentally backdate my plan.
7. As a learner, I want to be warned if I set a Start Date on or after the Deadline, so that the schedule span is always valid.
8. As a learner, I want the Start Date I chose to be remembered across page reloads, so that I don't have to re-enter it each time.
9. As a learner using Regenerate (unsolved), I want unsolved problems re-spread from my chosen Start Date, so that Generate and Regenerate behave consistently.
10. As a learner using Regenerate (unsolved), I want my already-solved problems to keep their original scheduled dates, so that my study history is preserved even if it falls before a new Start Date.
11. As a learner with an existing saved schedule (from before this feature), I want my state to load without being wiped, so that I don't lose my progress when the app updates.
12. As a learner, I want the Start Date and Deadline labels to read naturally together (start → end), so that the form is self-explanatory.

## Implementation Decisions

### Schedule Config shape

`ScheduleConfig` gains an optional `startDate` field. It is optional so that existing persisted state (which has no `startDate`) loads without migration and without a schema version bump. Missing or empty `startDate` is treated as "today" at generation time.

- `startDate?: string` — local ISO date (`YYYY-MM-DD`), or empty/undefined for "today."

### Default state

`freshState()` initializes `config.startDate` to an empty string. The Settings UI pre-fills the input with today's date on render when the value is empty, so the user sees a concrete date without the persisted state pretending they chose one. The first Generate persists whatever is in the field.

### Scheduler change

The scheduler currently hardcodes `today = new Date()` and spreads from there. It will instead derive the start from `config.startDate`, falling back to today when empty/undefined.

- Resolved start: `config.startDate || todayISO()`.
- Day count is computed from `(deadline − start)` instead of `(deadline − today)`.

### Validation guards

The existing `"deadline must be future"` guard is replaced by the precise invariant `deadline > startDate`, since "future" was only ever a proxy for "after the start" when start was always today. Two guards:

- `startDate < today` → error: "Start date cannot be before today"
- `startDate >= deadline` → error: "Start date must be before the deadline"

A single guard `deadline <= startDate` covers the `startDate === deadline` and `startDate > deadline` cases with one message.

### Regenerate (unsolved) behavior

Regenerate passes the same `cfg` (including `startDate`) to `generateSchedule`. Solved problems keep their original `scheduledDate` values — they are a historical record, not part of the active spread. Unsolved problems re-spread from the configured Start Date. No reset or warning is issued for solved problems whose dates fall before a new Start Date.

### UI placement

A new "Start date" row is inserted **above** the existing "Deadline" row in the Schedule card, so the pair reads top-to-bottom as start → end. It reuses the existing native `<Input type="date">` primitive — no new date-picker component is introduced.

### Helper consolidation

The scheduler has private `isoDate`/`addDays` helpers duplicating `localISODate`/`addDaysISO` from the shared date module. Since the change touches those same lines, the duplicates are removed and the shared helpers are imported instead, eliminating a source of DST-parsing drift.

### Persistence

No schema version bump. `startDate` is optional; existing state loads unchanged. The next save writes `startDate` into the persisted config alongside the existing fields.

## Testing Decisions

### What makes a good test

Tests assert **external behavior of the pure `generateSchedule` function** — inputs in, assignments and errors out. They do not inspect internal variables or control-flow branches. Tests are **date-independent**: they pass explicit fixed dates rather than relying on "today," so the suite is deterministic and doesn't flake across days.

### Seam

One seam: the existing pure-function boundary at `generateSchedule` (covered by `scheduler.test.ts`). No new seams are introduced. The Settings UI is a thin wiring layer (state → config → `generateSchedule`) and is not given a new test seam; its behavior is covered by the manual verification checklist.

### Modules tested

- `generateSchedule` (scheduler module) — the spread logic and all validation guards.

### Prior art

`scheduler.test.ts` already tests `generateSchedule` as a pure function: difficulty minute weights, total study minutes, every problem gets a scheduled date, day-budget rollover, CSV-order preservation, the existing deadline guard, the hoursPerDay guard, over-capacity warnings, and regenerate preserving solved problems' dates. The new tests follow the same style.

### Test changes

- Existing tests are rewritten to pass an explicit fixed `startDate` so they no longer implicitly depend on today.
- New tests:
  - First assignment equals the chosen `startDate`.
  - Throws when `startDate < today` (using yesterday's ISO).
  - Throws when `startDate === deadline`.
  - Throws when `startDate > deadline`.
- The regenerate-preserves-solved-dates test stays, now passing an explicit `startDate`.

## Out of Scope

- **`weekdaysOnly` wired into the scheduler.** `ScheduleConfig.weekdaysOnly` is declared but ignored by `generateSchedule` — it is only consumed by the requeue module, and even there the weekend-skip logic is hardcoded. Wiring it into the scheduler (day-counting that excludes weekends, weekend-skip interaction with a configurable Start Date) is a separate task and is recorded here as a known follow-up.
- A custom date-picker component (Radix Calendar/Popover). The native `<input type="date">` is reused.
- Component/integration tests for the Settings UI. The logic worth pinning lives in the pure function; the UI wiring is verified manually.
- Schema migration / version bump. `startDate` is optional, so no migration is needed.
- Resetting or warning about solved problems whose dates fall before a new Start Date on Regenerate.

## Further Notes

### Glossary (to be captured in `CONTEXT.md`)

- **Start Date** — The first calendar date (local, `YYYY-MM-DD`) from which problems are spread toward the Deadline. Defaults to today. Distinct from `generatedAt` (a timestamp of when generation ran).
- **Deadline** — The last calendar date by which all problems should be scheduled.
- **Schedule** — The set of problem-to-date assignments produced by `generateSchedule`, spread from the Start Date toward the Deadline within a per-day hour budget.
- **generatedAt** — A full ISO timestamp recording when the schedule was last generated; not a date-only field and not the plan's start.

### Follow-up gap

`ScheduleConfig.weekdaysOnly` is declared on the config type and shown in the UI as "Weekdays only (for requeue)," but `generateSchedule` ignores it. Only the requeue module reads it, and even there the weekend-skip is hardcoded rather than gated on the flag. Wiring `weekdaysOnly` into the scheduler — so weekend days are excluded from the day count and the spread — is a meaningful change that interacts with Start Date (a Monday vs. Saturday start changes which days count). It is intentionally left out of this spec to keep the change focused.

### Manual verification checklist

- Load the app → Settings → Start Date shows today's date.
- Change Start Date to a future date → Generate → first problem scheduled to that date.
- Clear the Start Date field → Generate → falls back to today.
- Set Start Date before today → error: "Start date cannot be before today."
- Set Start Date on or after Deadline → error: "Start date must be before the deadline."
- Regenerate (unsolved) → unsolved problems re-spread from the Start Date; solved problems keep their original dates.
- Reload the page → chosen Start Date persists.

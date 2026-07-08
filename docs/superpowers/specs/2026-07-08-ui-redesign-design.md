# UI Redesign Spec

**Date:** 2026-07-08
**Status:** approved
**Scope:** visual & structural redesign of all views; no feature changes

## Summary

Polish the interview study planner's UI from bare/utilitarian to refined, modern, and pleasant. The design uses the existing shadcn/ui (new-york) base, introduces an indigo/violet accent while keeping a neutral palette, restructures layout with Cards and a shared AppHeader, and consolidates duplicated badge/color logic into shared modules. Both light and dark modes are treated equally.

---

## 1. Design tokens & theming

### Accent color

Introduce an indigo accent driven by CSS custom properties in `src/index.css`:

| Token | Light | Dark |
|-------|-------|------|
| `--primary` | `oklch(0.55 0.2 268)` | `oklch(0.68 0.19 268)` |
| `--ring` | `oklch(0.55 0.2 268 / 0.35)` | `oklch(0.68 0.19 268 / 0.35)` |

### Difficulty & status tokens

New custom properties for consistent badge coloring across all views:

| Property | Purpose |
|----------|---------|
| `--diff-easy-bg` / `--diff-easy-fg` | Easy problems |
| `--diff-medium-bg` / `--diff-medium-fg` | Medium problems |
| `--diff-hard-bg` / `--diff-hard-fg` | Hard problems |
| `--diff-fundamental-bg` / `--diff-fundamental-fg` | Fundamental problems |
| `--status-todo-bg` / `--status-todo-fg` | Not started |
| `--status-tried-bg` / `--status-tried-fg` | Attempted |
| `--status-solved-bg` / `--status-solved-fg` | Solved |
| `--status-mastered-bg` / `--status-mastered-fg` | Confident |

### Surface separation (dark mode)

In `.dark`, `--card` is set slightly lighter than `--background` (`oklch(0.19 0 0)` vs `0.145`) so cards read as raised layers. Light mode cards remain white (`oklch(1 0 0)`).

### Radius

`--radius` bumped to `0.75rem` for softer, modern corners.

### Typography hierarchy

- Page titles: `text-xl font-semibold tracking-tight`
- Card titles: `text-base font-semibold`
- Body: `text-sm`
- Meta: `text-xs text-muted-foreground`

### Theme toggle

A Sun/Moon icon button in the sidebar footer using `useTheme()` from `next-themes` (already installed). `aria-label="Toggle theme"` for accessibility.

---

## 2. Shared badge infrastructure

### `src/lib/badges.ts`

Pure functions returning token-based class strings:

- `difficultyClass(diff: Difficulty): string`
- `statusClass(status: Status): string`

These consume the new `--diff-*` and `--status-*` tokens, replacing the 4 duplicated `DIFF_COLOR` maps and 2 duplicated `STATUS_COLOR` maps spread across TodayView, ProblemCard, CalendarView, TopicsView, and NotesView.

### `src/lib/stats.ts`

Extracted from TopicsView into a reusable module:

- `sectionStats(problems, progress)` — solved/confident/total/masteryPct
- `nodeStats(problems, progress)` — solved/total
- `flattenProblems(topics: Record<string, Record<string, Problem[]>>): Problem[]` — flatten nested topic→section→problem structure

### `src/components/ui/badge.tsx`

Added via `npx shadcn add badge`. A `cva`-based pill component with variants for difficulty and status. Every view imports `Badge` and the helper functions instead of inline color maps.

### Tests

- `src/lib/badges.test.ts` — verifies correct class return for each difficulty and status, null handling
- `src/lib/stats.test.ts` — verifies stat computation shape, empty input, edge cases
- Follows existing vitest + jsdom patterns (`parseProblems.test.ts`, `requeue.test.ts`, etc.)

---

## 3. App shell & layout

### `App.tsx`

Three-zone desktop layout:

```
Sidebar (w-60) | <main> containing AppHeader + content area
```

### `AppHeader` (new component: `src/components/AppHeader.tsx`)

- Sticky top bar, `h-14`, `border-b`, `backdrop-blur` + `bg-background/80`
- Left: page title from active tab ("Today", "Calendar", etc.) in `text-xl font-semibold tracking-tight`
- Right: compact progress chip ("X / 475 solved") with mini indigo progress bar

### `<main>` content wrapper

- `overflow-auto flex-1`
- Inner `max-w-5xl mx-auto px-6 py-6 space-y-6` so wide screens don't stretch content edge-to-edge
- Every view drops its own top heading — AppHeader provides it

### Sidebar (`Sidebar.tsx`)

- Width stays `w-60` (240px)
- Branded header: a small decorative indigo rounded square (`bg-primary rounded-md size-5`) next to "Interview Planner" in `font-bold tracking-tight` (no SVG/asset needed)
- Nav items gain lucide icons: `CalendarDays` (Today), `CalendarRange` (Calendar), `Layers` (Topics), `StickyNote` (Notes), `Settings` (Settings)
- Active item: `bg-primary/10`, `border-l-2 border-primary`, primary-colored icon+label
- Inactive item: muted icon, `hover:bg-accent`
- Footer: mini progress block (solved/total + thin indigo Progress bar + pct%) → Theme toggle icon button below

---

## 4. Today view (`TodayView.tsx`)

Three zones stacked vertically, replacing the current flat structure.

### 4.1 Stat tiles

Three `Card`-based tiles in `grid grid-cols-1 sm:grid-cols-3 gap-4`:

- **Solved**: big number (`text-3xl font-semibold`) + `/ 475 total` muted + indigo mini progress bar
- **Due today**: count of scheduled + review items for the selected date, with `CalendarDays` icon
- **Upcoming reviews**: count of items whose `requeueDate` falls in the range [today .. today+7 days], or "All caught up" empty state when zero

Each tile: `CardContent p-4`, `hover:shadow-md transition-shadow`, indigo accent on the leading icon.

### 4.2 Date navigator

Single horizontal row replacing the current Prev/Today/Next button row:

`ChevronLeft` · date label (`text-lg font-semibold`) · `ChevronRight` · "Today" ghost button (only enabled when not on today)

### 4.3 Content sections

"Due for Review" and "Scheduled" each in a `Card`:

- `CardHeader` with `CardTitle` + count badge
- `CardContent` with `space-y-3`
- Empty state: centered muted icon + friendly message (e.g. "No reviews due — nice!")

### 4.4 ProblemCard (`ProblemCard.tsx`)

- Wraps in `Card` with `CardContent p-4`
- Top row: problem name (`font-medium`), `topic · section` meta, difficulty `<Badge>`
- Status selector: shadcn `Select` replacing raw `<select>`
- "Open" → `ghost` icon button (`ExternalLink` icon)
- "Notes" toggle: `ghost` button; expanded textarea uses `focus-visible:ring-ring/50`
- On status change: brief indigo border ring animation (~1s CSS transition)

---

## 5. Calendar view (`CalendarView.tsx`)

### 5.1 Month navigation

Prev/Next as icon buttons (`ChevronLeft`/`ChevronRight`) + "Today" ghost button.

### 5.2 Grid cells

- Styling: `aspect-square rounded-lg`, border on hover, `transition-colors`
- Today highlight: `ring-2 ring-primary` on the real-today cell
- Has scheduled: small indigo count label in top-right + difficulty dot row using badge tokens
- All solved: `bg-primary/10` + `Check` icon (within indigo accent system)
- Selected: `border-primary bg-accent`
- Weekends: `bg-muted/30`

### 5.3 Day detail Dialog

- `DialogTitle` shows formatted date via `toLocaleDateString` (e.g. "Wednesday, July 8, 2026")
- Scheduled and Reviews sub-sections with count badges
- `DayProblem` rows: Card-styled container, Badge for difficulty, status text, ghost "Open" icon button
- Read-only in dialog — editing is in Today view

---

## 6. Topics view (`TopicsView.tsx`)

### 6.1 Three-level tree with depth styling

- **Learning Path**: `Card` wrapper with `CardHeader` (name + counts + inline indigo Progress bar)
- **Topic**: `ml-6`, `border-l-2 border-border` rail, `Folder`/`FolderOpen` icon on trigger, status chip
- **Section**: `ml-9 border-l`, tight pill rows (`hover:bg-accent rounded-md px-2 py-1.5`), difficulty + status badges

### 6.2 Progress indicators

Every level's trigger shows a thin horizontal `h-2` indigo progress bar scaled to `solved/total`, sitting below the label row.

### 6.3 Computed stats

Uses shared `src/lib/stats.ts` for `nodeStats` and `sectionStats` instead of inline implementations.

### 6.4 Content description

Muted description line ("Browse 475 problems by learning path, topic, and section.") above the tree.

---

## 7. Notes view (`NotesView.tsx`)

### 7.1 Filter toolbar

Wrapped in a single `Card` with `CardContent p-3`:

- Topic/Status/Difficulty shadcn `Select` components with `w-44` triggers + leading icons (`Filter`, `CircleDot`, `Signal`)
- Search `Input` with leading `Search` icon via relative wrapper
- "Clear filters" ghost button with `X` icon, visible only when any filter is active

### 7.2 Note cards

Each note in a `Card` with `CardContent p-4 space-y-3`:

- Top metadata: problem name (`hover:text-primary hover:underline`), difficulty `<Badge>`, status `<Badge>`, topic pill (`bg-muted text-muted-foreground rounded-full px-2 text-xs`), date (`text-xs text-muted-foreground`)
- Markdown body: `text-sm leading-relaxed text-foreground/90` with `border-l-2 border-primary/30 pl-3` accent
- Edit mode: styled textarea with focus ring, `Check`/`X` icon buttons for save/cancel
- "Edit" button: ghost button with `Pencil` icon
- Empty state: centered `StickyNote` icon + message

### 7.3 No new features

Same filters, same edit flow, same markdown rendering. Pure visual + structural upgrade.

---

## 8. Settings view (`SettingsView.tsx`)

### 8.1 Schedule card

`Card` with `CardHeader` ("Schedule", description "Set your deadline and study pace"):

- `CardContent`: deadline Input, hours/day Input, weekdays-only Switch — in `grid gap-4`, each with `Label` above
- `CardFooter`: "Generate Schedule" (primary) + "Regenerate (unsolved)" (outline)
- Error message above footer in `text-sm text-destructive`

### 8.2 File sync card

`Card` with `CardHeader` ("Sync", description — brief explainer about `progress.json` and `notes/`):

- `CardFooter`: "Sync to Files" + "Import from Files" (outline), then `Separator` + "Reset All Progress" (destructive) with gap

### 8.3 Stat summary card

Compact recap below the action cards: generated date, total scheduled count, total solved count. Two rows of muted label + value in a small `Card`.

### 8.4 Dialogs

Import confirm and warnings dialogs unchanged — they already use shadcn `Dialog` and inherit indigo primary button styling through tokens.

### 8.5 Layout

Width constrained to `max-w-2xl`. No in-view `<h2>` — AppHeader handles "Settings" page title.

---

## 9. Accessibility

- Theme toggle: `aria-label="Toggle theme"`
- Icon-only buttons (Today/Calendar/Open side buttons): `aria-label` on each
- Color is never the sole indicator — badges always include text labels
- Focus rings use `--ring` (indigo) token; all interactive elements keep `focus-visible:ring-ring/50`

---

## 10. Non-goals

- No new features or behavior changes
- No mobile responsive layout (matches existing README scope)
- No backend, auth, or multi-user
- No snapshot/component rendering tests (project has no component test infra today)
- No animation library — CSS transitions only

---

## 11. Implementation order

1. Tokens (`index.css`) + `lib/badges.ts` + `lib/stats.ts` + `components/ui/badge.tsx` + tests
2. App shell: `AppHeader.tsx`, restructured `App.tsx`, restructured `Sidebar.tsx`
3. Today view: `TodayView.tsx` + `ProblemCard.tsx`
4. Calendar view: `CalendarView.tsx`
5. Topics view: `TopicsView.tsx`
6. Notes view: `NotesView.tsx`
7. Settings view: `SettingsView.tsx`
8. Lint, typecheck, manual verification

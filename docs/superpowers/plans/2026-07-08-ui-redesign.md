# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Visually and structurally redesign the interview study planner's UI from bare/utilitarian to refined and modern — indigo/violet accent on a neutral palette, card-based layout, shared AppHeader, and consolidated badge/stats logic — with no behavior changes.

**Architecture:** Pure visual/structural refactor. New shared modules `lib/badges.ts` and `lib/stats.ts` (TDD'd under Vitest) replace the 4 duplicated `DIFF_COLOR` maps and 2 duplicated `STATUS_COLOR` maps. A `Badge` shadcn component plus token-based className helpers provide consistent coloring via CSS custom properties in `index.css`. App shell gains a sticky `AppHeader`; every view wraps content in `Card`s and drops its own heading.

**Tech Stack:** Vite + React 19, TypeScript, Tailwind v4, shadcn/ui (new-york), next-themes (already installed), lucide-react, Vitest + jsdom.

---

## Reference

- Design spec: `docs/superpowers/specs/2026-07-08-ui-redesign-design.md`
- Existing plan (app build): `docs/superpowers/plans/2026-07-08-interview-study-planner.md`
- Test pattern: `src/lib/parseProblems.test.ts`, `src/lib/requeue.test.ts`
- Commands: `npm run test` (vitest run), `npm run lint` (eslint src), `npm run typecheck` (tsc --noEmit), `npm run dev`

### Conventions (verified)
- shadcn `components.json`: style `new-york`, aliases `@/components`, `@/lib`, `@/hooks`, `@/components/ui`. Icon lib `lucide`.
- TS path alias `@/*` → `./src/*`. `noUnusedLocals` + `noUnusedParameters` ON — remove unused imports.
- `Button` has sizes incl. `xs`, `icon-xs`, `icon-sm`, `icon`. Variants: default, outline, ghost, destructive, secondary, link.
- `Progress` already uses `bg-primary` — it auto picks up indigo once `--primary` token changes.
- `next-themes` `ThemeProvider` already mounted in `src/main.tsx` (`attribute="class"`, `enableSystem`). `useTheme()` returns `{ theme, resolvedTheme, setTheme }`.
- No component/snapshot tests exist — only pure `lib/*` modules are TDD'd. Badge/stats get tests; view components get manual + typecheck/lint verification.

## File Structure

```
src/
  index.css                      # MODIFY: add --primary/--ring indigo, diff/status tokens, dark card layer, radius
  lib/
    badges.ts                    # CREATE: difficultyClass, statusClass, STATUS_LABEL (pure, tested)
    badges.test.ts               # CREATE
    stats.ts                     # CREATE: flattenProblems, sectionStats, nodeStats (extracted from TopicsView, tested)
    stats.test.ts                # CREATE
  components/
    ui/
      badge.tsx                  # CREATE: shadcn generic pill (cva)
      separator.tsx              # CREATE: shadcn (needed by SettingsView)
    AppHeader.tsx                # CREATE: sticky top bar w/ title + progress chip
    Sidebar.tsx                  # MODIFY: branded header, lucide nav icons, active rail, footer progress + theme toggle
    App.tsx                      # MODIFY: three-zone layout, AppHeader, max-w-5xl content
    TodayView.tsx                # REWRITE: stat tiles, date navigator, card sections
    ProblemCard.tsx              # REWRITE: Card wrapper, Badge, Select, ghost icon buttons
    CalendarView.tsx             # MODIFY: indigo tokens, ring today, bg-primary/10 all-solved, dialog date format
    TopicsView.tsx               # REWRITE: Card learning-path, depth rails, inline progress bars, shared stats
    NotesView.tsx                # REWRITE: filter Card, note Cards, markdown accent rail, icon edit buttons
    SettingsView.tsx             # REWRITE: schedule/sync/stat Cards, max-w-2xl, Separator
```

---

## Task 1: Design tokens in `index.css`

**Files:** Modify `src/index.css`

- [ ] **Step 1: Update `:root` tokens — indigo primary, radius, light card stays white**

Replace the `:root { ... }` block (lines 34–60) with:

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.55 0.2 268);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.55 0.2 268 / 0.35);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --radius: 0.75rem;
  --diff-easy-bg: oklch(0.95 0.05 150);      --diff-easy-fg: oklch(0.35 0.12 150);
  --diff-medium-bg: oklch(0.95 0.06 75);     --diff-medium-fg: oklch(0.4 0.13 75);
  --diff-hard-bg: oklch(0.95 0.06 25);       --diff-hard-fg: oklch(0.4 0.15 25);
  --diff-fundamental-bg: oklch(0.95 0.01 260); --diff-fundamental-fg: oklch(0.4 0.02 260);
  --status-todo-bg: oklch(0.96 0 0);         --status-todo-fg: oklch(0.45 0 0);
  --status-tried-bg: oklch(0.95 0.06 75);    --status-tried-fg: oklch(0.4 0.13 75);
  --status-solved-bg: oklch(0.93 0.07 250);  --status-solved-fg: oklch(0.4 0.13 268);
  --status-mastered-bg: oklch(0.9 0.13 150); --status-mastered-fg: oklch(0.3 0.15 150);
}
```

- [ ] **Step 2: Update `.dark` tokens — indigo primary, raised card layer, dark diff/status tokens**

Replace the `.dark { ... }` block (lines 62–87) with:

```css
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.19 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.18 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.68 0.19 268);
  --primary-foreground: oklch(0.145 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.396 0.141 25.723);
  --destructive-foreground: oklch(0.637 0.237 25.331);
  --border: oklch(0.269 0 0);
  --input: oklch(0.269 0 0);
  --ring: oklch(0.68 0.19 268 / 0.35);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --diff-easy-bg: oklch(0.3 0.08 150);        --diff-easy-fg: oklch(0.85 0.13 150);
  --diff-medium-bg: oklch(0.32 0.09 75);      --diff-medium-fg: oklch(0.85 0.14 75);
  --diff-hard-bg: oklch(0.32 0.1 25);         --diff-hard-fg: oklch(0.85 0.16 25);
  --diff-fundamental-bg: oklch(0.3 0.02 260); --diff-fundamental-fg: oklch(0.85 0.03 260);
  --status-todo-bg: oklch(0.28 0 0);          --status-todo-fg: oklch(0.7 0 0);
  --status-tried-bg: oklch(0.32 0.09 75);     --status-tried-fg: oklch(0.85 0.14 75);
  --status-solved-bg: oklch(0.3 0.1 268);     --status-solved-fg: oklch(0.85 0.14 268);
  --status-mastered-bg: oklch(0.32 0.15 150); --status-mastered-fg: oklch(0.85 0.16 150);
}
```

- [ ] **Step 3: Verify build still compiles**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "style: indigo primary + diff/status design tokens"
```

---

## Task 2: `lib/badges.ts` (TDD)

**Files:** Create `src/lib/badges.ts`, Create `src/lib/badges.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/badges.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { difficultyClass, statusClass, STATUS_LABEL } from './badges'
import type { Difficulty, Status } from '../types'

describe('difficultyClass', () => {
  const cases: [Difficulty, RegExp][] = [
    ['Easy', /--diff-easy-bg/],
    ['Medium', /--diff-medium-bg/],
    ['Hard', /--diff-hard-bg/],
    ['Fundamental', /--diff-fundamental-bg/],
  ]
  for (const [d, re] of cases) {
    it(`${d} returns token bg + fg classes`, () => {
      const cls = difficultyClass(d)
      expect(cls).toMatch(re)
      expect(cls).toMatch(new RegExp(re.source.replace('bg', 'fg')))
    })
  }
})

describe('statusClass', () => {
  const cases: [Status, RegExp][] = [
    ['not-started', /--status-todo-bg/],
    ['attempted', /--status-tried-bg/],
    ['solved', /--status-solved-bg/],
    ['confident', /--status-mastered-bg/],
  ]
  for (const [s, re] of cases) {
    it(`${s} returns token bg + fg classes`, () => {
      const cls = statusClass(s)
      expect(cls).toMatch(re)
      expect(cls).toMatch(new RegExp(re.source.replace('bg', 'fg')))
    })
  }
})

describe('STATUS_LABEL', () => {
  it('maps every status to a short label', () => {
    expect(STATUS_LABEL).toEqual({
      'not-started': 'Todo',
      'attempted': 'Tried',
      'solved': 'Solved',
      'confident': 'Mastered',
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- badges`
Expected: FAIL — `difficultyClass is not defined` / module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/badges.ts`:

```ts
import type { Difficulty, Status } from '../types'

export function difficultyClass(diff: Difficulty): string {
  switch (diff) {
    case 'Easy': return 'bg-[var(--diff-easy-bg)] text-[var(--diff-easy-fg)]'
    case 'Medium': return 'bg-[var(--diff-medium-bg)] text-[var(--diff-medium-fg)]'
    case 'Hard': return 'bg-[var(--diff-hard-bg)] text-[var(--diff-hard-fg)]'
    case 'Fundamental': return 'bg-[var(--diff-fundamental-bg)] text-[var(--diff-fundamental-fg)]'
  }
}

export function statusClass(status: Status): string {
  switch (status) {
    case 'not-started': return 'bg-[var(--status-todo-bg)] text-[var(--status-todo-fg)]'
    case 'attempted': return 'bg-[var(--status-tried-bg)] text-[var(--status-tried-fg)]'
    case 'solved': return 'bg-[var(--status-solved-bg)] text-[var(--status-solved-fg)]'
    case 'confident': return 'bg-[var(--status-mastered-bg)] text-[var(--status-mastered-fg)]'
  }
}

export const STATUS_LABEL: Record<Status, string> = {
  'not-started': 'Todo',
  'attempted': 'Tried',
  'solved': 'Solved',
  'confident': 'Mastered',
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- badges`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/badges.ts src/lib/badges.test.ts
git commit -m "feat: shared badge color helpers + tests"
```

---

## Task 3: `lib/stats.ts` (TDD)

**Files:** Create `src/lib/stats.ts`, Create `src/lib/stats.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/stats.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { flattenProblems, sectionStats, nodeStats } from './stats'
import type { Problem, ProblemProgress } from '../types'

const p = (id: string): Problem => ({
  id, learningPath: 'DS', topic: 'T', section: 'S', name: id, difficulty: 'Easy', url: 'x',
})
const pr = (id: string, status: ProblemProgress['status']): ProblemProgress => ({
  problemId: id, status, notes: '', lastUpdated: '2099-01-01', requeueCount: 0,
})

describe('flattenProblems', () => {
  it('flattens nested topic→section→problem', () => {
    const tree = {
      A: { X: [p('1'), p('2')], Y: [p('3')] },
      B: { Z: [p('4')] },
    }
    expect(flattenProblems(tree).map(x => x.id)).toEqual(['1', '2', '3', '4'])
  })
  it('empty tree -> []', () => {
    expect(flattenProblems({})).toEqual([])
  })
})

describe('sectionStats', () => {
  it('counts solved/confident/total + masteryPct', () => {
    const probs = [p('1'), p('2'), p('3'), p('4')]
    const progress = {
      '1': pr('1', 'solved'),
      '2': pr('2', 'confident'),
      '3': pr('3', 'attempted'),
      '4': pr('4', 'not-started'),
    }
    expect(sectionStats(probs, progress)).toEqual({ solved: 2, confident: 1, total: 4, masteryPct: 25 })
  })
  it('empty problems -> zeros', () => {
    expect(sectionStats([], {})).toEqual({ solved: 0, confident: 0, total: 0, masteryPct: 0 })
  })
})

describe('nodeStats', () => {
  it('counts solved+total only', () => {
    const probs = [p('1'), p('2'), p('3')]
    const progress = { '1': pr('1', 'solved'), '2': pr('2', 'confident'), '3': pr('3', 'attempted') }
    expect(nodeStats(probs, progress)).toEqual({ solved: 2, total: 3 })
  })
  it('missing progress entry counts as not solved', () => {
    expect(nodeStats([p('1')], {})).toEqual({ solved: 0, total: 1 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- stats`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/stats.ts`:

```ts
import type { Problem, ProblemProgress } from '../types'

export function flattenProblems(topics: Record<string, Record<string, Problem[]>>): Problem[] {
  const all: Problem[] = []
  for (const sections of Object.values(topics)) {
    for (const probs of Object.values(sections)) {
      for (const p of probs) all.push(p)
    }
  }
  return all
}

export function sectionStats(problems: Problem[], progress: Record<string, ProblemProgress>) {
  let solved = 0, confident = 0
  for (const p of problems) {
    const s = progress[p.id]?.status
    if (s === 'solved' || s === 'confident') solved++
    if (s === 'confident') confident++
  }
  const total = problems.length
  return { solved, confident, total, masteryPct: total ? Math.round((confident / total) * 100) : 0 }
}

export function nodeStats(problems: Problem[], progress: Record<string, ProblemProgress>) {
  let total = 0, solved = 0
  for (const p of problems) {
    total++
    const s = progress[p.id]?.status
    if (s === 'solved' || s === 'confident') solved++
  }
  return { solved, total }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- stats`
Expected: PASS.

- [ ] **Step 5: Run full suite to confirm no regressions**

Run: `npm run test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/stats.ts src/lib/stats.test.ts
git commit -m "feat: shared stats module + tests"
```

---

## Task 4: shadcn `Badge` + `Separator` components

**Files:** Create `src/components/ui/badge.tsx`, Create `src/components/ui/separator.tsx`

- [ ] **Step 1: Add the components via shadcn CLI**

Run: `npx shadcn@latest add badge separator`
Expected: writes `src/components/ui/badge.tsx` and `src/components/ui/separator.tsx`, no errors.

- [ ] **Step 2: Verify files exist**

Run: `ls src/components/ui/`
Expected: includes `badge.tsx` and `separator.tsx`.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/badge.tsx src/components/ui/separator.tsx
git commit -m "feat: shadcn Badge + Separator components"
```

---

## Task 5: App shell — `AppHeader`, `App.tsx`, `Sidebar.tsx`

**Files:** Create `src/components/AppHeader.tsx`, Modify `src/App.tsx`, Modify `src/components/Sidebar.tsx`

- [ ] **Step 1: Create `AppHeader.tsx`**

Create `src/components/AppHeader.tsx`:

```tsx
import { Progress } from './ui/progress'

export function AppHeader({ title, solved, total }: {
  title: string; solved: number; total: number
}) {
  const pct = total ? Math.round((solved / total) * 100) : 0
  return (
    <header className="sticky top-0 z-30 h-14 border-b backdrop-blur bg-background/80 flex items-center justify-between px-6">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground tabular-nums">{solved} / {total} solved</span>
        <Progress value={pct} className="w-24 h-2" />
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Rewrite `Sidebar.tsx`**

Replace the entire contents of `src/components/Sidebar.tsx` with:

```tsx
import type { ComponentType } from 'react'
import { CalendarDays, CalendarRange, Layers, StickyNote, Settings, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Progress } from './ui/progress'
import { cn } from '../lib/utils'

export type Tab = 'today' | 'calendar' | 'topics' | 'notes' | 'settings'

const TABS: { id: Tab; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'today', label: 'Today', icon: CalendarDays },
  { id: 'calendar', label: 'Calendar', icon: CalendarRange },
  { id: 'topics', label: 'Topics', icon: Layers },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ active, onTab, solved, total }: {
  active: Tab; onTab: (t: Tab) => void; solved: number; total: number
}) {
  const { resolvedTheme, setTheme } = useTheme()
  const pct = total ? Math.round((solved / total) * 100) : 0
  return (
    <aside className="w-60 border-r flex flex-col bg-background">
      <div className="flex items-center gap-2 px-4 h-14 border-b">
        <span className="bg-primary rounded-md size-5" />
        <span className="font-bold tracking-tight">Interview Planner</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {TABS.map(t => {
          const Icon = t.icon
          const on = active === t.id
          return (
            <button key={t.id} onClick={() => onTab(t.id)} aria-current={on ? 'page' : undefined}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm border-l-2 transition-colors',
                on
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'border-transparent hover:bg-accent text-muted-foreground',
              )}>
              <Icon className="size-4" />
              <span>{t.label}</span>
            </button>
          )
        })}
      </nav>
      <footer className="p-3 border-t space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span className="tabular-nums">{solved}/{total}</span>
          </div>
          <Progress value={pct} className="h-2" />
          <div className="text-xs text-muted-foreground text-right tabular-nums">{pct}%</div>
        </div>
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent text-muted-foreground"
        >
          {resolvedTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          <span>{resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </footer>
    </aside>
  )
}
```

- [ ] **Step 3: Rewrite `App.tsx` to use three-zone layout + AppHeader**

Replace the entire contents of `src/App.tsx` with:

```tsx
import { useState } from 'react'
import { toast } from 'sonner'
import { useStore } from './hooks/useStore'
import { parseProblems } from './lib/parseProblems'
import csv from './data/problems.csv?raw'
import { Sidebar, type Tab } from './components/Sidebar'
import { AppHeader } from './components/AppHeader'
import { TodayView } from './components/TodayView'
import { CalendarView } from './components/CalendarView'
import { SettingsView } from './components/SettingsView'
import { TopicsView } from './components/TopicsView'
import { NotesView } from './components/NotesView'

const { problems, skipped } = parseProblems(csv)
if (skipped > 0) toast.warning(`${skipped} CSV rows skipped`)

const TITLES: Record<Tab, string> = {
  today: 'Today', calendar: 'Calendar', topics: 'Topics', notes: 'Notes', settings: 'Settings',
}

export default function App() {
  const store = useStore(problems)
  const [tab, setTab] = useState<Tab>('today')
  const solved = Object.values(store.state.progress).filter(p => p.status === 'solved' || p.status === 'confident').length

  return (
    <div className="flex h-screen">
      <Sidebar active={tab} onTab={setTab} solved={solved} total={problems.length} />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader title={TITLES[tab]} solved={solved} total={problems.length} />
        <main className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
            {tab === 'today' ? <TodayView problems={problems} store={store} />
              : tab === 'calendar' ? <CalendarView problems={problems} store={store} />
              : tab === 'topics' ? <TopicsView problems={problems} store={store} />
              : tab === 'notes' ? <NotesView problems={problems} store={store} />
              : <SettingsView problems={problems} store={store} />}
          </div>
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors. (If `TodayView` etc. still reference removed props, they don't — props unchanged.)

- [ ] **Step 5: Manual smoke test**

Run: `npm run dev`
Open browser. Verify: sidebar has branded header + icons + active rail; AppHeader shows title + progress chip; theme toggle switches light/dark; nav switches views.

- [ ] **Step 6: Commit**

```bash
git add src/components/AppHeader.tsx src/components/Sidebar.tsx src/App.tsx
git commit -m "feat: app shell with AppHeader, icon sidebar, theme toggle"
```

---

## Task 6: `TodayView.tsx` + `ProblemCard.tsx`

**Files:** Rewrite `src/components/TodayView.tsx`, Rewrite `src/components/ProblemCard.tsx`

- [ ] **Step 1: Rewrite `ProblemCard.tsx`**

Replace entire contents of `src/components/ProblemCard.tsx`:

```tsx
import { useState } from 'react'
import { ExternalLink, StickyNote } from 'lucide-react'
import type { Problem, ProblemProgress, Status } from '../types'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent } from './ui/card'
import { difficultyClass, statusClass, STATUS_LABEL } from '../lib/badges'

export function ProblemCard({ problem, progress, onStatusChange, onNotesChange }: {
  problem: Problem; progress: ProblemProgress
  onStatusChange: (s: Status) => void; onNotesChange: (n: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [ring, setRing] = useState(false)

  function handleStatus(s: Status) {
    onStatusChange(s)
    setRing(true)
    setTimeout(() => setRing(false), 1000)
  }

  return (
    <Card className={`transition-shadow hover:shadow-md ${ring ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-medium truncate">{problem.name}</div>
            <div className="text-xs text-muted-foreground">{problem.topic} · {problem.section}</div>
          </div>
          <Badge className={difficultyClass(problem.difficulty)}>{problem.difficulty}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select value={progress.status} onValueChange={v => handleStatus(v as Status)}>
            <SelectTrigger size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['not-started', 'attempted', 'solved', 'confident'] as Status[]).map(s => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon-sm" aria-label="Open problem"
            onClick={() => window.open(problem.url, '_blank')}>
            <ExternalLink />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setOpen(o => !o)}>
            <StickyNote className="size-4" /> {open ? 'Hide' : 'Notes'}
          </Button>
        </div>
        {open && (
          <textarea
            value={progress.notes}
            onChange={e => onNotesChange(e.target.value)}
            placeholder="Markdown notes..."
            className="w-full min-h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        )}
        {!open && progress.status !== 'not-started' && (
          <Badge className={statusClass(progress.status)}>{STATUS_LABEL[progress.status]}</Badge>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Rewrite `TodayView.tsx`**

Replace entire contents of `src/components/TodayView.tsx`:

```tsx
import { useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, Clock, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { Badge } from './ui/badge'
import { ProblemCard } from './ProblemCard'
import type { Problem } from '../types'
import { todayISO, addDaysISO } from '../lib/date'

export function TodayView({ problems, store }: { problems: Problem[]; store: ReturnType<typeof import('../hooks/useStore').useStore> }) {
  const realToday = todayISO()
  const [selectedDate, setSelectedDate] = useState(realToday)
  const isToday = selectedDate === realToday

  const byId = new Map(problems.map(p => [p.id, p]))
  const scheduled = Object.values(store.state.progress).filter(p => p.scheduledDate === selectedDate)
  const reviews = Object.values(store.state.progress).filter(p => p.requeueDate === selectedDate)
  const solved = Object.values(store.state.progress).filter(p => p.status === 'solved' || p.status === 'confident').length
  const pct = problems.length ? (solved / problems.length) * 100 : 0

  const weekEnd = addDaysISO(realToday, 7)
  const upcoming = Object.values(store.state.progress).filter(p =>
    p.requeueDate && p.requeueDate >= realToday && p.requeueDate <= weekEnd).length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CheckCircle2 className="size-4 text-primary" /> Solved
            </div>
            <div className="text-3xl font-semibold tabular-nums">{solved}</div>
            <div className="text-xs text-muted-foreground">/ {problems.length} total</div>
            <Progress value={pct} className="h-2" />
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CalendarDays className="size-4 text-primary" /> Due today
            </div>
            <div className="text-3xl font-semibold tabular-nums">{scheduled.length + reviews.length}</div>
            <div className="text-xs text-muted-foreground">{selectedDate}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="size-4 text-primary" /> Upcoming reviews
            </div>
            <div className="text-3xl font-semibold tabular-nums">{upcoming}</div>
            <div className="text-xs text-muted-foreground">
              {upcoming === 0 ? 'All caught up' : `next 7 days`}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" aria-label="Previous day"
          onClick={() => setSelectedDate(d => addDaysISO(d, -1))}>
          <ChevronLeft />
        </Button>
        <span className="text-lg font-semibold">
          {isToday ? `Today — ${selectedDate}` : selectedDate}
        </span>
        <Button variant="ghost" size="icon-sm" aria-label="Next day"
          onClick={() => setSelectedDate(d => addDaysISO(d, 1))}>
          <ChevronRight />
        </Button>
        {!isToday && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedDate(realToday)}>Today</Button>
        )}
      </div>

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
            return <ProblemCard key={p.problemId} problem={pr} progress={p}
              onStatusChange={s => store.updateProgress(p.problemId, { status: s, lastUpdated: new Date().toISOString() })}
              onNotesChange={n => store.updateProgress(p.problemId, { notes: n, lastUpdated: new Date().toISOString() })} />
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scheduled
            <Badge variant="secondary" className="ml-2">{scheduled.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {scheduled.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-muted-foreground">
              <CalendarDays className="size-8 mb-2 text-primary/60" />
              <p className="text-sm">Nothing scheduled for this day.</p>
            </div>
          ) : scheduled.map(p => {
            const pr = byId.get(p.problemId); if (!pr) return null
            return <ProblemCard key={p.problemId} problem={pr} progress={p}
              onStatusChange={s => store.updateProgress(p.problemId, { status: s, lastUpdated: new Date().toISOString() })}
              onNotesChange={n => store.updateProgress(p.problemId, { notes: n, lastUpdated: new Date().toISOString() })} />
          })}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`
Verify: three stat tiles render; date navigator chevrons work; "Today" button only shows when off-today; empty states show; status change triggers brief indigo ring; Select opens.

- [ ] **Step 5: Commit**

```bash
git add src/components/TodayView.tsx src/components/ProblemCard.tsx
git commit -m "feat: redesigned Today view with stat tiles + card ProblemCard"
```

---

## Task 7: `CalendarView.tsx`

**Files:** Modify `src/components/CalendarView.tsx`

- [ ] **Step 1: Rewrite `CalendarView.tsx`**

Replace entire contents of `src/components/CalendarView.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Check, ExternalLink } from 'lucide-react'
import type { Problem, ProblemProgress } from '../types'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Card, CardContent } from './ui/card'
import { difficultyClass, STATUS_LABEL } from '../lib/badges'
import { todayISO } from '../lib/date'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function firstWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export function CalendarView({ problems, store }: {
  problems: Problem[]
  store: ReturnType<typeof import('../hooks/useStore').useStore>
}) {
  const now = new Date()
  const [viewMonth, setViewMonth] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const realToday = todayISO()

  const byId = useMemo(() => new Map(problems.map(p => [p.id, p])), [problems])

  const { scheduledMap, requeueMap } = useMemo(() => {
    const sMap: Record<string, ProblemProgress[]> = {}
    const rMap: Record<string, ProblemProgress[]> = {}
    for (const p of Object.values(store.state.progress)) {
      if (p.scheduledDate) (sMap[p.scheduledDate] ??= []).push(p)
      if (p.requeueDate) (rMap[p.requeueDate] ??= []).push(p)
    }
    return { scheduledMap: sMap, requeueMap: rMap }
  }, [store.state.progress])

  function prev() {
    setViewMonth(m => m.month === 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 })
  }
  function next() {
    setViewMonth(m => m.month === 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: m.month + 1 })
  }
  function dateKey(day: number) {
    const m = String(viewMonth.month + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    return `${viewMonth.year}-${m}-${d}`
  }

  const total = daysInMonth(viewMonth.year, viewMonth.month)
  const startDay = firstWeekday(viewMonth.year, viewMonth.month)
  const cells: (number | null)[] = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let d = 1; d <= total; d++) cells.push(d)

  const selectedData = selectedDate ? {
    scheduled: scheduledMap[selectedDate] ?? [],
    requeue: requeueMap[selectedDate] ?? [],
  } : null

  const monthName = new Date(viewMonth.year, viewMonth.month).toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{monthName}</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Previous month" onClick={prev}><ChevronLeft /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Next month" onClick={next}><ChevronRight /></Button>
          <Button variant="ghost" size="sm" onClick={() => {
            const t = new Date()
            setViewMonth({ year: t.getFullYear(), month: t.getMonth() })
          }}>Today</Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="aspect-square" />
          const key = dateKey(day)
          const scheduled = scheduledMap[key] ?? []
          const requeue = requeueMap[key] ?? []
          const allSolved = scheduled.length > 0 && scheduled.every(p => p.status === 'solved' || p.status === 'confident')
          const diffs = [...new Set(scheduled.map(p => byId.get(p.problemId)?.difficulty).filter(Boolean))] as string[]
          const weekday = i % 7
          const isWeekend = weekday === 0 || weekday === 6
          const isToday = key === realToday
          const isSelected = key === selectedDate
          const hasRequeue = requeue.length > 0 && isWeekend

          return (
            <button
              key={key}
              onClick={() => setSelectedDate(key)}
              className={[
                'aspect-square rounded-lg border p-1 flex flex-col items-center justify-start text-sm transition-colors',
                isWeekend ? 'bg-muted/30' : '',
                isToday ? 'ring-2 ring-primary' : '',
                allSolved ? 'bg-primary/10' : '',
                isSelected ? 'border-primary bg-accent' : 'hover:bg-accent',
              ].join(' ')}
            >
              <span className="text-xs">{day}</span>
              {scheduled.length > 0 && (
                <span className="text-[10px] font-medium text-primary mt-0.5">{scheduled.length}</span>
              )}
              {diffs.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {diffs.map(d => <span key={d} className={`w-1.5 h-1.5 rounded-full ${difficultyClass(d as Problem['difficulty']).split(' ')[0]}`} />)}
                </div>
              )}
              {allSolved && <Check className="size-3 text-primary mt-0.5" />}
              {hasRequeue && <span className="text-[10px] text-muted-foreground mt-0.5">{requeue.length} review{requeue.length > 1 ? 's' : ''}</span>}
            </button>
          )
        })}
      </div>

      <Dialog open={!!selectedDate} onOpenChange={o => { if (!o) setSelectedDate(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-auto">
            {selectedData?.scheduled.length === 0 && selectedData?.requeue.length === 0 && (
              <p className="text-sm text-muted-foreground">No problems scheduled</p>
            )}
            {selectedData && selectedData.scheduled.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Scheduled <Badge variant="secondary" className="ml-1">{selectedData.scheduled.length}</Badge></h4>
                {selectedData.scheduled.map(p => { const pr = byId.get(p.problemId); if (!pr) return null; return <DayProblem key={p.problemId} problem={pr} progress={p} /> })}
              </div>
            )}
            {selectedData && selectedData.requeue.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Reviews <Badge variant="secondary" className="ml-1">{selectedData.requeue.length}</Badge></h4>
                {selectedData.requeue.map(p => { const pr = byId.get(p.problemId); if (!pr) return null; return <DayProblem key={p.problemId} problem={pr} progress={p} /> })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DayProblem({ problem, progress }: { problem: Problem; progress: ProblemProgress }) {
  return (
    <Card>
      <CardContent className="p-2 flex items-center justify-between text-sm">
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{problem.name}</div>
          <div className="text-xs text-muted-foreground">{STATUS_LABEL[progress.status]}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <Badge className={difficultyClass(problem.difficulty)}>{problem.difficulty}</Badge>
          <Button variant="ghost" size="icon-xs" aria-label="Open problem" onClick={() => window.open(problem.url, '_blank')}>
            <ExternalLink />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev` → Calendar tab.
Verify: today cell has indigo ring; all-solved cells get `bg-primary/10` + check; selected cell has primary border; dialog shows formatted long date; difficulty dots use token colors.

- [ ] **Step 4: Commit**

```bash
git add src/components/CalendarView.tsx
git commit -m "feat: redesigned Calendar view with indigo tokens + long date dialog"
```

---

## Task 8: `TopicsView.tsx`

**Files:** Rewrite `src/components/TopicsView.tsx`

- [ ] **Step 1: Rewrite `TopicsView.tsx`**

Replace entire contents of `src/components/TopicsView.tsx`:

```tsx
import { useState } from 'react'
import { ChevronRight, Folder, FolderOpen } from 'lucide-react'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { cn } from '../lib/utils'
import { difficultyClass, statusClass, STATUS_LABEL } from '../lib/badges'
import { flattenProblems, sectionStats, nodeStats } from '../lib/stats'
import type { Problem, ProblemProgress } from '../types'

function masteryColor(pct: number) {
  if (pct <= 40) return 'text-red-500'
  if (pct <= 75) return 'text-amber-500'
  return 'text-green-500'
}

function SectionNode({ name, problems, progress, defaultOpen }: {
  name: string; problems: Problem[]; progress: Record<string, ProblemProgress>; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  const { solved, confident, total, masteryPct } = sectionStats(problems, progress)
  const pct = total ? (solved / total) * 100 : 0

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1 py-1.5 px-2 rounded-md hover:bg-accent w-full text-left text-sm">
        <ChevronRight className={cn('size-4 shrink-0 transition-transform', open && 'rotate-90')} />
        <span className="font-medium truncate">{name}</span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">{solved}/{total} solved</span>
        <span className={cn('ml-2 shrink-0 text-xs font-medium', masteryColor(masteryPct))}>{confident}/{total} mastered</span>
      </CollapsibleTrigger>
      <div className="px-2 pb-1"><Progress value={pct} className="h-1.5" /></div>
      <CollapsibleContent className="ml-9 border-l pl-2 space-y-0.5">
        {problems.map(p => (
          <button key={p.id} onClick={() => window.open(p.url, '_blank')}
            className="flex items-center gap-2 w-full text-left py-1.5 px-2 rounded-md hover:bg-accent text-sm">
            <span className="truncate flex-1">{p.name}</span>
            <Badge className={cn('shrink-0', difficultyClass(p.difficulty))}>{p.difficulty}</Badge>
            <Badge className={cn('shrink-0', statusClass(progress[p.id]?.status ?? 'not-started'))}>
              {STATUS_LABEL[progress[p.id]?.status ?? 'not-started']}
            </Badge>
          </button>
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

function TopicNode({ name, sections, progress }: {
  name: string; sections: Record<string, Problem[]>; progress: Record<string, ProblemProgress>
}) {
  const [open, setOpen] = useState(false)
  const all = flattenProblems({ __: sections })
  const { solved, total } = nodeStats(all, progress)
  const pct = total ? (solved / total) * 100 : 0

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="ml-6 border-l-2 border-border pl-2">
      <CollapsibleTrigger className="flex items-center gap-1 py-2 px-2 rounded-md hover:bg-accent w-full text-left text-sm font-medium">
        {open ? <FolderOpen className="size-4 text-muted-foreground" /> : <Folder className="size-4 text-muted-foreground" />}
        <ChevronRight className={cn('size-4 shrink-0 transition-transform', open && 'rotate-90')} />
        <span>{name}</span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">{solved}/{total} solved</span>
      </CollapsibleTrigger>
      <div className="px-2 pb-1"><Progress value={pct} className="h-1.5" /></div>
      <CollapsibleContent className="space-y-0.5">
        {Object.entries(sections).map(([section, probs]) => (
          <SectionNode key={section} name={section} problems={probs} progress={progress} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

function LearningPathNode({ name, topics, progress }: {
  name: string; topics: Record<string, Record<string, Problem[]>>; progress: Record<string, ProblemProgress>
}) {
  const [open, setOpen] = useState(true)
  const all = flattenProblems(topics)
  const { solved, total } = nodeStats(all, progress)
  const pct = total ? (solved / total) * 100 : 0

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ChevronRight className={cn('size-4 transition-transform', open && 'rotate-90')} />
              {name}
              <span className="ml-auto text-xs font-normal text-muted-foreground">{solved}/{total} solved</span>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <div className="px-6 pb-2"><Progress value={pct} className="h-2" /></div>
        <CardContent className="space-y-1">
          {Object.entries(topics).map(([topic, sections]) => (
            <TopicNode key={topic} name={topic} sections={sections} progress={progress} />
          ))}
        </CardContent>
      </Collapsible>
    </Card>
  )
}

export function TopicsView({ problems, store }: {
  problems: Problem[]
  store: { state: { progress: Record<string, ProblemProgress> } }
}) {
  const tree: Record<string, Record<string, Record<string, Problem[]>>> = {}
  problems.forEach(p => {
    tree[p.learningPath] ??= {}
    tree[p.learningPath][p.topic] ??= {}
    tree[p.learningPath][p.topic][p.section] ??= []
    tree[p.learningPath][p.topic][p.section].push(p)
  })

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Browse {problems.length} problems by learning path, topic, and section.</p>
      {Object.entries(tree).map(([learningPath, topics]) => (
        <LearningPathNode key={learningPath} name={learningPath} topics={topics} progress={store.state.progress} />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev` → Topics tab.
Verify: each learning path is a Card; topic rows have folder icon + left rail; section rows indented; inline progress bars render; badges use tokens; expand/collapse works.

- [ ] **Step 4: Commit**

```bash
git add src/components/TopicsView.tsx
git commit -m "feat: redesigned Topics view with cards, rails, shared stats"
```

---

## Task 9: `NotesView.tsx`

**Files:** Rewrite `src/components/NotesView.tsx`

- [ ] **Step 1: Rewrite `NotesView.tsx`**

Replace entire contents of `src/components/NotesView.tsx`:

```tsx
import ReactMarkdown from 'react-markdown'
import { useState, useMemo } from 'react'
import { Search, Filter, CircleDot, Signal, X, Pencil, Check, StickyNote } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card, CardContent } from './ui/card'
import type { Problem, Difficulty, Status } from '../types'
import { difficultyClass, statusClass, STATUS_LABEL } from '../lib/badges'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function NotesView({ problems, store }: {
  problems: Problem[]
  store: ReturnType<typeof import('../hooks/useStore').useStore>
}) {
  const [topicFilter, setTopicFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const byId = useMemo(() => new Map(problems.map(p => [p.id, p])), [problems])

  const noted = useMemo(() =>
    Object.values(store.state.progress).filter(p => p.notes.trim()),
  [store.state.progress])

  const topics = useMemo(() =>
    [...new Set(noted.map(p => byId.get(p.problemId)?.topic).filter(Boolean))].sort() as string[],
  [noted, byId])

  const difficulties: Difficulty[] = ['Fundamental', 'Easy', 'Medium', 'Hard']
  const statuses: Status[] = ['not-started', 'attempted', 'solved', 'confident']

  const filtered = useMemo(() =>
    noted.filter(p => {
      const prob = byId.get(p.problemId)
      if (!prob) return false
      if (topicFilter && prob.topic !== topicFilter) return false
      if (statusFilter && p.status !== statusFilter) return false
      if (difficultyFilter && prob.difficulty !== difficultyFilter) return false
      if (search && !prob.name.toLowerCase().includes(search.toLowerCase()) && !p.notes.toLowerCase().includes(search.toLowerCase()))
        return false
      return true
    }),
  [noted, byId, topicFilter, statusFilter, difficultyFilter, search])

  const anyFilter = !!(topicFilter || statusFilter || difficultyFilter || search)

  function startEdit(id: string, current: string) { setEditing(id); setDraft(current) }
  function saveEdit(id: string) {
    store.updateProgress(id, { notes: draft, lastUpdated: new Date().toISOString() })
    setEditing(null); setDraft('')
  }
  function cancelEdit() { setEditing(null); setDraft('') }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3 flex flex-wrap gap-3 items-center">
          <Select value={topicFilter} onValueChange={setTopicFilter}>
            <SelectTrigger size="sm" className="w-44">
              <Filter className="size-4" /><SelectValue placeholder="All topics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All topics</SelectItem>
              {topics.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger size="sm" className="w-44">
              <CircleDot className="size-4" /><SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              {statuses.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger size="sm" className="w-44">
              <Signal className="size-4" /><SelectValue placeholder="All difficulties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All difficulties</SelectItem>
              {difficulties.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 max-w-xs" />
          </div>

          {anyFilter && (
            <Button variant="ghost" size="sm" onClick={() => { setTopicFilter(''); setStatusFilter(''); setDifficultyFilter(''); setSearch('') }}>
              <X className="size-4" /> Clear
            </Button>
          )}
        </CardContent>
      </Card>

      {noted.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-muted-foreground">
          <StickyNote className="size-10 mb-2 text-primary/60" />
          <p className="text-sm">No notes yet. Add notes to problems to see them here.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes match your filters.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map(p => {
            const prob = byId.get(p.problemId)
            if (!prob) return null
            const isEditing = editing === p.problemId
            return (
              <Card key={p.problemId}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => window.open(prob.url, '_blank')}
                        className="font-semibold text-left hover:text-primary hover:underline">
                        {prob.name}
                      </button>
                      <Badge className={difficultyClass(prob.difficulty)}>{prob.difficulty}</Badge>
                      <Badge className={statusClass(p.status)}>{STATUS_LABEL[p.status]}</Badge>
                      <span className="text-xs bg-muted text-muted-foreground rounded-full px-2">{prob.topic}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{formatDate(p.lastUpdated)}</span>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea value={draft} onChange={e => setDraft(e.target.value)}
                        className="w-full min-h-32 rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(p.problemId)}><Check className="size-4" /> Save</Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="size-4" /> Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="border-l-2 border-primary/30 pl-3 text-sm leading-relaxed text-foreground/90">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{p.notes}</ReactMarkdown>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => startEdit(p.problemId, p.notes)}>
                        <Pencil className="size-4" /> Edit
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev` → Notes tab.
Verify: filter Card with leading icons; clear button only when filter active; note cards have indigo left accent on markdown; edit mode shows Check/X icon buttons; empty state shows StickyNote icon.

- [ ] **Step 4: Commit**

```bash
git add src/components/NotesView.tsx
git commit -m "feat: redesigned Notes view with filter card + accent note cards"
```

---

## Task 10: `SettingsView.tsx`

**Files:** Rewrite `src/components/SettingsView.tsx`

- [ ] **Step 1: Rewrite `SettingsView.tsx`**

Replace entire contents of `src/components/SettingsView.tsx`:

```tsx
import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Separator } from './ui/separator'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog'
import { toast } from 'sonner'
import { generateSchedule } from '../lib/scheduler'
import { syncToFiles, loadFromFiles } from '../lib/sync'
import type { Problem, AppState } from '../types'

export function SettingsView({ problems, store }: { problems: Problem[]; store: ReturnType<typeof import('../hooks/useStore').useStore> }) {
  const [deadline, setDeadline] = useState(store.state.config.deadline)
  const [hours, setHours] = useState(String(store.state.config.hoursPerDay))
  const [weekdays, setWeekdays] = useState(store.state.config.weekdaysOnly)
  const [err, setErr] = useState('')
  const [warn, setWarn] = useState<string[] | null>(null)
  const [importedData, setImportedData] = useState<AppState | null>(null)

  const scheduledCount = Object.values(store.state.progress).filter(p => p.scheduledDate).length
  const solvedCount = Object.values(store.state.progress).filter(p => p.status === 'solved' || p.status === 'confident').length

  function run(regen: boolean) {
    setErr(''); setWarn(null)
    try {
      const h = Number(hours)
      if (!isFinite(h) || h < 0.5) { setErr('Hours must be at least 0.5'); return }
      if (!deadline) { setErr('Please set a deadline'); return }
      const cfg = { deadline, hoursPerDay: h, weekdaysOnly: weekdays }
      const { assignments, warnings } = generateSchedule(problems, cfg, regen ? store.state.progress : undefined)
      store.setConfig(cfg)
      store.applyAssignments(assignments, new Date().toISOString())
      if (warnings.length) setWarn(warnings)
      else toast.success(regen ? 'Schedule regenerated' : 'Schedule generated')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setErr(msg); toast.error(msg)
    }
  }

  async function handleSync() {
    const res = await syncToFiles(store.state, problems)
    if (res.ok) toast.success('Synced to files')
    else toast.error(res.error ?? 'Sync failed')
  }

  async function handleImport() {
    const data = await loadFromFiles()
    if (!data) { toast.error('No progress file found'); return }
    setImportedData(data)
  }

  function confirmImport() {
    if (!importedData) return
    store.loadFromImport(importedData)
    setImportedData(null)
    toast.success('Progress imported from files')
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule</CardTitle>
          <CardDescription>Set your deadline and study pace.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="deadline">Deadline</Label>
            <Input id="deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="hours">Hours per day</Label>
            <Input id="hours" type="number" min={0.5} step={0.5} value={hours} onChange={e => setHours(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="weekdays" checked={weekdays} onCheckedChange={setWeekdays} />
            <Label htmlFor="weekdays">Weekdays only (for requeue)</Label>
          </div>
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
        </CardContent>
        <CardFooter className="gap-2">
          <Button onClick={() => run(false)}>Generate Schedule</Button>
          <Button variant="outline" onClick={() => run(true)}>Regenerate (unsolved)</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sync</CardTitle>
          <CardDescription>Sync <code>progress.json</code> and <code>notes/</code> with local files (dev server only).</CardDescription>
        </CardHeader>
        <CardFooter className="gap-2">
          <Button variant="outline" onClick={handleSync}>Sync to Files</Button>
          <Button variant="outline" onClick={handleImport}>Import from Files</Button>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Button variant="destructive" onClick={() => { if (confirm('Reset all progress?')) { store.resetAll(); toast.success('Reset') } }}>
            Reset All Progress
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardContent className="p-4 grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
          <div className="text-muted-foreground">Schedule generated</div>
          <div className="text-right tabular-nums">{store.state.generatedAt || '—'}</div>
          <div className="text-muted-foreground">Total scheduled</div>
          <div className="text-right tabular-nums">{scheduledCount}</div>
          <div className="text-muted-foreground">Total solved</div>
          <div className="text-right tabular-nums">{solvedCount}</div>
        </CardContent>
      </Card>

      <Dialog open={!!importedData} onOpenChange={o => !o && setImportedData(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import progress</DialogTitle>
            <DialogDescription>Import progress from files? This will overwrite your current progress.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportedData(null)}>Cancel</Button>
            <Button onClick={confirmImport}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!warn} onOpenChange={o => !o && setWarn(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule warnings</DialogTitle></DialogHeader>
          <ul className="text-sm list-disc pl-4">{warn?.map((w, i) => <li key={i}>{w}</li>)}</ul>
          <DialogFooter><Button onClick={() => setWarn(null)}>OK</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev` → Settings tab.
Verify: three cards (Schedule / Sync / Stat summary); Separator divides sync buttons from reset; dialogs open; generatedAt/scheduled/solved counts show.

- [ ] **Step 4: Commit**

```bash
git add src/components/SettingsView.tsx
git commit -m "feat: redesigned Settings view with schedule/sync/stat cards"
```

---

## Task 11: Final verification

**Files:** none

- [ ] **Step 1: Full test suite**

Run: `npm run test`
Expected: all PASS (badges + stats + existing parseProblems/requeue/scheduler/storage).

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Manual full pass**

Run: `npm run preview`
Walk every tab in both light and dark mode: Today, Calendar, Topics, Notes, Settings. Verify indigo accent, card layers, badges, theme toggle, accessibility labels on icon buttons.

- [ ] **Step 6: Commit any remaining fixes + tag**

```bash
git add -A
git commit -m "chore: ui redesign final verification" --allow-empty
```

---

## Self-Review

**Spec coverage check (sections 1–11):**
- §1 tokens → Task 1 ✓ (primary, ring, diff/status, dark card layer, radius). Typography hierarchy applied across Tasks 5–10 (page titles in AppHeader `text-xl font-semibold tracking-tight`; card titles `text-base font-semibold`; body `text-sm`; meta `text-xs text-muted-foreground`). Theme toggle → Task 5 Sidebar ✓.
- §2 shared badges/stats → Tasks 2, 3, 4 ✓. `Badge` + helpers replace all 4 `DIFF_COLOR` + 2 `STATUS_COLOR` maps (verified removed in Tasks 6–10 rewrites).
- §3 app shell → Task 5 ✓ (AppHeader, three-zone, Sidebar branded header/icons/active rail/footer progress/theme toggle).
- §4 Today view → Task 6 ✓ (stat tiles, date navigator, card sections, ProblemCard Card+Badge+Select+ghost icon buttons+ring).
- §5 Calendar → Task 7 ✓ (icon nav, today ring, all-solved bg-primary/10+check, selected border, weekend muted, dialog long date, DayProblem Card).
- §6 Topics → Task 8 ✓ (Card learning path, depth rails, folder icons, inline progress bars, shared stats, description line).
- §7 Notes → Task 9 ✓ (filter Card w/ leading icons + clear, note Cards, markdown accent rail, Check/X edit buttons, empty state).
- §8 Settings → Task 10 ✓ (schedule/sync/stat cards, max-w-2xl, Separator, no in-view h2).
- §9 accessibility → aria-labels on all icon-only buttons (Tasks 5–10), color never sole indicator (badges always carry text), focus rings via `--ring` token (inherited from shadcn defaults) ✓.
- §10 non-goals respected — no new features, no mobile layout, no component snapshot tests, no animation lib ✓.
- §11 implementation order matches task order ✓.

**Placeholder scan:** none — every code step contains complete code; every command has expected output.

**Type/name consistency:** `difficultyClass`, `statusClass`, `STATUS_LABEL`, `flattenProblems`, `sectionStats`, `nodeStats` — names match across definition (Tasks 2, 3) and all consumers (Tasks 6–10). `Tab` exported from Sidebar (Task 5) and imported in App (Task 5). Badge API (`className` + helpers) consistent everywhere.

No issues found.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-07-08-ui-redesign.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**

- **Subagent-Driven chosen:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development — fresh subagent per task + two-stage review.
- **Inline Execution chosen:** REQUIRED SUB-SKILL: superpowers:executing-plans — batch execution with checkpoints for review.

# Interview Study Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vite + React + TS + shadcn/ui single-page app that auto-schedules 475 interview problems across a user deadline, tracks per-problem mastery with notes, auto-requeues not-confident problems via weekend spaced repetition, and syncs to local files for manual git push.

**Architecture:** Single-page, tabbed dashboard (no router). State in localStorage via a central `useStore` hook (schema-versioned). CSV imported at build time. A dev-only Vite plugin exposes `/save`+`/load` for filesystem sync. Logic modules (`scheduler`, `storage`, `requeue`) are pure functions under Vitest TDD.

**Tech Stack:** Vite, React 18, TypeScript, shadcn/ui (Tailwind), Vitest + jsdom, sonner toasts, react-markdown.

---

## Reference

- Design spec: `docs/superpowers/specs/2026-07-08-interview-study-planner-design.md`
- Problem data: `codeintuition_problems.csv` (475 rows)
- shadcn registry: `@shadcn` (default)

### CSV facts (verified against `codeintuition_problems.csv`)

- 475 data rows, header `Learning Path,Topic,Section,Problem Name,Difficulty,URL`.
- Difficulty distribution: Easy 113, Fundamental 94, Medium 225, Hard 43.
- Two learning paths: `Data Structures`, `Algorithms`.
- No quoted fields / no embedded commas (simple `split(',')` is safe).
- **Duplicate problem names exist** (e.g. `Delete the Given Node`, `Three Sum`) — slug dedup is mandatory.

## File Structure

```
src/
  main.tsx, App.tsx, index.css, types.ts
  data/problems.csv            # copy of root CSV, ?raw import
  lib/
    parseProblems.ts (+test)
    scheduler.ts   (+test)     # distribute problems across deadline
    requeue.ts     (+test)     # spaced repetition
    storage.ts     (+test)     # localStorage + schema version
    sync.ts                    # client side of /save /load
    seed.ts                    # dev-only fake schedule
  plugins/filesystem.ts        # Vite dev-server plugin (~40 lines)
  components/
    Sidebar.tsx TodayView.tsx CalendarView.tsx TopicsView.tsx
    NotesView.tsx SettingsView.tsx ProblemCard.tsx
    ui/                        # shadcn components
  hooks/useStore.ts
vite.config.ts, tsconfig*.json, components.json, tailwind.config.js, postcss.config.js, eslint.config.js
```

---

## Task 1: Scaffold Vite + React + TS + tooling

**Files:** Create `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `eslint.config.js`

- [ ] **Step 1: Scaffold project**

```bash
cd /home/hemanth/interview-study-plannner
npm create vite@latest . -- --template react-ts
```
If prompt warns about non-empty dir, choose "Ignore files and continue".

- [ ] **Step 2: Install deps**

```bash
npm install
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

- [ ] **Step 3: Configure `vite.config.ts` (test + plugin placeholder)**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react, ...(command === 'serve' ? [] : [])],
  test: { globals: true, environment: 'jsdom' },
}))
```

- [ ] **Step 4: Add scripts to `package.json`**

```json
"scripts": {
  "dev": "vite",
  "test": "vitest run",
  "test:watch": "vitest",
  "lint": "eslint src --ext .ts,.tsx",
  "typecheck": "tsc --noEmit",
  "build": "tsc && vite build"
}
```

- [ ] **Step 5: Verify**

Run: `npm run dev` (then Ctrl-C), `npm run typecheck`, `npm run build`
Expected: all succeed, `dist/` produced.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: scaffold vite react ts"
```

---

## Task 2: shadcn/ui + base components

**Files:** Create `components.json`, `tailwind.config.js`, `src/index.css`, `postcss.config.js`, `src/components/ui/*`

- [ ] **Step 1: Init shadcn**

```bash
npx shadcn@latest init -d
```
Accept defaults (New York, CSS variables).

- [ ] **Step 2: Add base components**

```bash
npx shadcn@latest add button card tabs dialog input label select progress switch sonner
```

- [ ] **Step 3: Smoke render** — in `src/App.tsx` add `<Button>Hello</Button>` and `import { Toaster } from '@/components/ui/sonner'` + `<Toaster/>`.

- [ ] **Step 4: Verify & commit**

Run: `npm run dev` → page shows button; `npm run build` succeeds.
```bash
git add -A && git commit -m "chore: configure shadcn base components"
```

---

## Task 3: Types + CSV parser (TDD)

**Files:** Create `src/types.ts`, `src/data/problems.csv` (copy root CSV), `src/lib/parseProblems.ts`, `src/lib/parseProblems.test.ts`

- [ ] **Step 1: Write `src/types.ts`** (per spec lines 73-108)

```typescript
export type Difficulty = 'Fundamental' | 'Easy' | 'Medium' | 'Hard'
export type Status = 'not-started' | 'attempted' | 'solved' | 'confident'

export interface Problem {
  id: string; learningPath: string; topic: string; section: string
  name: string; difficulty: Difficulty; url: string
}
export interface ProblemProgress {
  problemId: string; status: Status; notes: string; lastUpdated: string
  scheduledDate?: string; requeueDate?: string; requeueCount: number
}
export interface ScheduleConfig {
  deadline: string; hoursPerDay: number; weekdaysOnly: boolean
}
export interface AppState {
  schemaVersion: number; config: ScheduleConfig
  progress: Record<string, ProblemProgress>; generatedAt: string
}
```

- [ ] **Step 2: Copy CSV**

```bash
cp codeintuition_problems.csv src/data/problems.csv
```

- [ ] **Step 3: Write failing test `parseProblems.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { parseProblems, slugify } from './parseProblems'

const CSV = `Learning Path,Topic,Section,Problem Name,Difficulty,URL
Data Structures,Array,Pattern: Two Pointers,Flip Characters,Easy,https://x/y
Data Structures,Array,Pattern: Two Pointers,Flip Characters,Easy,https://x/z
Algorithms,DP,Basic,Three Sum,Medium,https://x/w`

describe('parseProblems', () => {
  it('maps columns to Problem fields', () => {
    const p = parseProblems(CSV)
    expect(p).toHaveLength(3)
    expect(p[0]).toMatchObject({
      learningPath: 'Data Structures', topic: 'Array',
      section: 'Pattern: Two Pointers', name: 'Flip Characters',
      difficulty: 'Easy', url: 'https://x/y',
    })
  })
  it('slugifies id and dedupes collisions', () => {
    const p = parseProblems(CSV)
    expect(p[0].id).toBe('flip-characters')
    expect(p[1].id).toBe('flip-characters-2')
  })
  it('skips rows with unknown difficulty', () => {
    const bad = CSV + '\nData Structures,X,Y,Z,Banana,https://x'
    expect(parseProblems(bad)).toHaveLength(3)
  })
  it('slugify trims and kebab-cases', () => {
    expect(slugify('  Three Sum! ')).toBe('three-sum')
  })
})
```

- [ ] **Step 4: Run test — expect FAIL** (module not found)
Run: `npm run test src/lib/parseProblems.test.ts`

- [ ] **Step 5: Implement `parseProblems.ts`**

```typescript
import type { Problem, Difficulty } from '../types'

const VALID: Difficulty[] = ['Fundamental', 'Easy', 'Medium', 'Hard']

export function slugify(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function parseProblems(csv: string): Problem[] {
  const lines = csv.split(/\r?\n/).filter(l => l.trim())
  const seen = new Map<string, number>()
  const out: Problem[] = []
  for (let i = 1; i < lines.length; i++) {
    const [learningPath, topic, section, name, diff, url] = lines[i].split(',')
    if (!VALID.includes(diff as Difficulty)) {
      console.warn(`parseProblems: skipping row ${i} unknown difficulty "${diff}"`)
      continue
    }
    let id = slugify(name)
    const n = seen.get(id) ?? 0
    seen.set(id, n + 1)
    if (n > 0) id = `${id}-${n + 1}`
    out.push({ id, learningPath, topic, section, name, difficulty: diff as Difficulty, url })
  }
  return out
}
```

- [ ] **Step 6: Run test — expect PASS**
Run: `npm run test src/lib/parseProblems.test.ts`

- [ ] **Step 7: Verify full CSV parses to 475** — in `App.tsx` render `parseProblems(csv).length`, confirm `475`, no console warnings.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: types and CSV parser"
```

---

## Task 4: Scheduler (TDD)

**Files:** Create `src/lib/scheduler.ts`, `src/lib/scheduler.test.ts`

- [ ] **Step 1: Write failing test `scheduler.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { generateSchedule, totalStudyMinutes, DIFFICULTY_MINUTES } from './scheduler'
import type { Problem, ScheduleConfig, ProblemProgress } from '../types'

const mk = (n: string, d: Problem['difficulty']): Problem => ({
  id: n, learningPath: 'DS', topic: 'T', section: 'S', name: n, difficulty: d, url: 'x',
})
const cfg = (deadline: string, hoursPerDay = 2): ScheduleConfig => ({
  deadline, hoursPerDay, weekdaysOnly: false,
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
  it('respects day budget; rolls leftover to next day', () => {
    const probs = [mk('a', 'Hard'), mk('b', 'Hard'), mk('c', 'Hard')] // 69*3=207 > 120
    const { assignments } = generateSchedule(probs, cfg('2099-01-31', 2))
    expect(assignments.a === assignments.b).toBe(false)
  })
  it('orders Easy before Medium before Hard before Fundamental', () => {
    const probs = [mk('h', 'Hard'), mk('e', 'Easy'), mk('f', 'Fundamental'), mk('m', 'Medium')]
    const { assignments } = generateSchedule(probs, cfg('2099-01-31', 10))
    expect(assignments.e < assignments.h).toBe(true)
  })
  it('throws when deadline is in the past', () => {
    expect(() => generateSchedule([mk('a', 'Easy')], cfg('2000-01-01'))).toThrow(/future/)
  })
  it('throws when hoursPerDay < 0.5', () => {
    expect(() => generateSchedule([mk('a', 'Easy')], cfg('2099-01-31', 0))).toThrow(/0.5/)
  })
  it('warns when over capacity', () => {
    const probs = Array.from({ length: 100 }, (_, i) => mk('p' + i, 'Hard'))
    const { warnings } = generateSchedule(probs, cfg('2099-01-02', 2))
    expect(warnings.length).toBeGreaterThan(0)
  })
  it('regeneration preserves solved, reschedules unsolved', () => {
    const probs = [mk('a', 'Easy'), mk('b', 'Easy')]
    const existing: Record<string, ProblemProgress> = {
      a: { problemId: 'a', status: 'solved', notes: '', lastUpdated: '2099-01-01', scheduledDate: '2099-01-05', requeueCount: 0 },
      b: { problemId: 'b', status: 'not-started', notes: '', lastUpdated: '2099-01-01', scheduledDate: '2099-01-05', requeueCount: 0 },
    }
    const { assignments } = generateSchedule(probs, cfg('2099-12-31'), existing)
    expect(assignments.a).toBe('2099-01-05') // preserved
    expect(assignments.b).not.toBe('2099-01-05') // rescheduled
  })
})
```

- [ ] **Step 2: Run — expect FAIL** (module missing)
Run: `npm run test src/lib/scheduler.test.ts`

- [ ] **Step 3: Implement `scheduler.ts`**

```typescript
import type { Problem, ScheduleConfig, ProblemProgress, Difficulty } from '../types'

export const DIFFICULTY_MINUTES: Record<Difficulty, number> = {
  Fundamental: 24, Easy: 30, Medium: 48, Hard: 69,
}
export const ORDER: Difficulty[] = ['Easy', 'Medium', 'Hard', 'Fundamental']

export function totalStudyMinutes(problems: Problem[]): number {
  return problems.reduce((s, p) => s + DIFFICULTY_MINUTES[p.difficulty], 0)
}

export interface ScheduleResult {
  assignments: Record<string, string>
  warnings: string[]
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

export function generateSchedule(
  problems: Problem[],
  config: ScheduleConfig,
  existingProgress?: Record<string, ProblemProgress>,
): ScheduleResult {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const deadline = new Date(config.deadline + 'T00:00:00')
  if (deadline <= today) throw new Error('deadline must be future')
  if (config.hoursPerDay < 0.5) throw new Error('hoursPerDay must be at least 0.5')

  const dayBudget = config.hoursPerDay * 60
  const days = Math.floor((deadline.getTime() - today.getTime()) / 86400000) + 1

  const warnings: string[] = []
  const solvedOrConfident = new Set(
    Object.entries(existingProgress ?? {})
      .filter(([, p]) => p.status === 'solved' || p.status === 'confident')
      .map(([id]) => id),
  )
  const toSchedule = problems
    .filter(p => !solvedOrConfident.has(p.id))
    .sort((a, b) => {
      const da = ORDER.indexOf(a.difficulty), db = ORDER.indexOf(b.difficulty)
      if (da !== db) return da - db
      return a.section.localeCompare(b.section) || a.topic.localeCompare(b.topic)
    })

  const totalMin = totalStudyMinutes(toSchedule)
  if (totalMin > days * dayBudget) {
    warnings.push(`Not enough time: ${totalMin} min needed, ${days * dayBudget} min available`)
  }

  const assignments: Record<string, string> = {}
  if (existingProgress) {
    for (const [id, p] of Object.entries(existingProgress)) {
      if (p.scheduledDate) assignments[id] = p.scheduledDate
    }
  }

  let dayIdx = 0
  let used = 0
  for (const p of toSchedule) {
    const m = DIFFICULTY_MINUTES[p.difficulty]
    if (used + m > dayBudget && dayIdx + 1 < days) { dayIdx++; used = 0 }
    assignments[p.id] = isoDate(addDays(today, dayIdx))
    used += m
  }
  return { assignments, warnings }
}
```

- [ ] **Step 4: Run — expect PASS**
Run: `npm run test src/lib/scheduler.test.ts`

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: scheduler with TDD"
```

---

## Task 5: Storage + useStore (TDD)

**Files:** Create `src/lib/storage.ts`, `src/lib/storage.test.ts`, `src/hooks/useStore.ts`

- [ ] **Step 1: Write failing test `storage.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { loadState, saveState, freshState, SCHEMA_VERSION } from './storage'

beforeEach(() => localStorage.clear())

describe('storage', () => {
  it('freshState has current schemaVersion', () => {
    expect(freshState().schemaVersion).toBe(SCHEMA_VERSION)
  })
  it('loadState returns fresh when empty', () => {
    expect(loadState()).toEqual(freshState())
  })
  it('save then load round-trips', () => {
    const s = freshState(); s.config.deadline = '2099-12-31'
    saveState(s)
    expect(loadState().config.deadline).toBe('2099-12-31')
  })
  it('corrupt JSON -> fresh', () => {
    localStorage.setItem('isp-state', '{not json')
    expect(loadState()).toEqual(freshState())
  })
  it('schema mismatch -> fresh', () => {
    localStorage.setItem('isp-state', JSON.stringify({ ...freshState(), schemaVersion: 999 }))
    expect(loadState()).toEqual(freshState())
  })
})
```

- [ ] **Step 2: Run — expect FAIL**
Run: `npm run test src/lib/storage.test.ts`

- [ ] **Step 3: Implement `storage.ts`**

```typescript
import type { AppState } from '../types'
export const SCHEMA_VERSION = 1
const KEY = 'isp-state'

export function freshState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    config: { deadline: '', hoursPerDay: 2, weekdaysOnly: true },
    progress: {}, generatedAt: '',
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return freshState()
    const parsed = JSON.parse(raw) as AppState
    if (parsed.schemaVersion !== SCHEMA_VERSION) return freshState()
    return parsed
  } catch {
    return freshState()
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(KEY, JSON.stringify(state))
}
```

- [ ] **Step 4: Run — expect PASS**
Run: `npm run test src/lib/storage.test.ts`

- [ ] **Step 5: Implement `useStore.ts`**

```typescript
import { useCallback, useEffect, useState } from 'react'
import type { AppState, ProblemProgress, ScheduleConfig } from '../types'
import { loadState, saveState, freshState } from '../lib/storage'

export function useStore() {
  const [state, setState] = useState<AppState>(() => loadState())

  useEffect(() => { saveState(state) }, [state])

  const updateProgress = useCallback((problemId: string, patch: Partial<ProblemProgress>) => {
    setState(s => ({
      ...s,
      progress: {
        ...s.progress,
        [problemId]: {
          problemId, status: 'not-started', notes: '', lastUpdated: new Date().toISOString(),
          requeueCount: 0, ...s.progress[problemId], ...patch,
        },
      },
    }))
  }, [])

  const setConfig = useCallback((config: ScheduleConfig) => {
    setState(s => ({ ...s, config }))
  }, [])

  const applyAssignments = useCallback((assignments: Record<string, string>, generatedAt: string) => {
    setState(s => {
      const progress = { ...s.progress }
      for (const [id, date] of Object.entries(assignments)) {
        progress[id] = {
          problemId: id, status: 'not-started', notes: '',
          lastUpdated: new Date().toISOString(), scheduledDate: date, requeueCount: 0,
          ...s.progress[id],
        }
      }
      return { ...s, progress, generatedAt }
    })
  }, [])

  const resetAll = useCallback(() => setState(freshState()), [])
  const loadFromImport = useCallback((imp: AppState) => setState(imp), [])

  return { state, updateProgress, setConfig, applyAssignments, resetAll, loadFromImport }
}
```

- [ ] **Step 6: typecheck + commit**

```bash
npm run typecheck && git add -A && git commit -m "feat: storage and useStore"
```

---

## Task 6: App shell + Sidebar + ProblemCard + TodayView

**Files:** Modify `src/App.tsx`; create `src/components/Sidebar.tsx`, `src/components/ProblemCard.tsx`, `src/components/TodayView.tsx`, `src/lib/seed.ts`

- [ ] **Step 1: `src/lib/seed.ts`** (dev-only fake schedule)

```typescript
import type { AppState } from '../types'
export function seedState(problems: { id: string }[]): AppState {
  const today = new Date().toISOString().slice(0, 10)
  const progress: AppState['progress'] = {}
  problems.slice(0, 5).forEach(p => {
    progress[p.id] = { problemId: p.id, status: 'not-started', notes: '', lastUpdated: today, scheduledDate: today, requeueCount: 0 }
  })
  return { schemaVersion: 1, config: { deadline: '', hoursPerDay: 2, weekdaysOnly: true }, progress, generatedAt: today }
}
```

- [ ] **Step 2: `Sidebar.tsx`** — props `{ active, onTab, solved, total }`. Nav tabs (Today/Calendar/Topics/Notes/Settings) with icons + labels. Footer "X/475 solved (Y%)". Active tab highlighted.

```typescript
type Tab = 'today' | 'calendar' | 'topics' | 'notes' | 'settings'
export function Sidebar({ active, onTab, solved, total }: {
  active: Tab; onTab: (t: Tab) => void; solved: number; total: number
}) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'today', label: 'Today' }, { id: 'calendar', label: 'Calendar' },
    { id: 'topics', label: 'Topics' }, { id: 'notes', label: 'Notes' },
    { id: 'settings', label: 'Settings' },
  ]
  const pct = total ? Math.round((solved / total) * 100) : 0
  return (
    <aside className="w-60 border-r p-4 flex flex-col">
      <h1 className="text-lg font-bold mb-6">Interview Planner</h1>
      <nav className="flex-1 space-y-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => onTab(t.id)}
            className={`w-full text-left px-3 py-2 rounded ${active === t.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
            {t.label}
          </button>
        ))}
      </nav>
      <footer className="text-sm text-muted-foreground">{solved}/{total} solved ({pct}%)</footer>
    </aside>
  )
}
```

- [ ] **Step 3: `ProblemCard.tsx`** — props `{ problem, progress, onStatusChange, onNotesChange }`. Difficulty color badge (Easy=green, Medium=amber, Hard=red, Fundamental=slate). `<select>` for status. Collapsible `<textarea>` for notes. Link button opens `problem.url` in new tab.

```typescript
import { useState } from 'react'
import type { Problem, ProblemProgress, Status } from '../types'
import { Button } from './ui/button'

const DIFF_COLOR: Record<string, string> = {
  Easy: 'bg-green-500', Medium: 'bg-amber-500', Hard: 'bg-red-500', Fundamental: 'bg-slate-500',
}

export function ProblemCard({ problem, progress, onStatusChange, onNotesChange }: {
  problem: Problem; progress: ProblemProgress
  onStatusChange: (s: Status) => void; onNotesChange: (n: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{problem.name}</div>
          <div className="text-xs text-muted-foreground">{problem.topic} · {problem.section}</div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded text-white ${DIFF_COLOR[problem.difficulty]}`}>{problem.difficulty}</span>
      </div>
      <div className="flex gap-2">
        <select value={progress.status} onChange={e => onStatusChange(e.target.value as Status)} className="border rounded px-2 py-1 text-sm">
          <option value="not-started">Not started</option>
          <option value="attempted">Attempted</option>
          <option value="solved">Solved</option>
          <option value="confident">Confident</option>
        </select>
        <Button variant="outline" size="sm" onClick={() => window.open(problem.url, '_blank')}>Open</Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(o => !o)}>{open ? 'Hide' : 'Notes'}</Button>
      </div>
      {open && (
        <textarea value={progress.notes} onChange={e => onNotesChange(e.target.value)}
          placeholder="Markdown notes..." className="w-full border rounded p-2 text-sm h-24" />
      )}
    </div>
  )
}
```

- [ ] **Step 4: `TodayView.tsx`** — today's date, `<Progress>` bar (solved/total), "Due for Review" placeholder section ("No reviews due" until Task 8), list of `ProblemCard` where `scheduledDate === todayISO`.

```typescript
import { Progress } from './ui/progress'
import { ProblemCard } from './ProblemCard'
import type { Problem } from '../types'

function todayISO() { return new Date().toISOString().slice(0, 10) }

export function TodayView({ problems, store }: { problems: Problem[]; store: ReturnType<typeof import('../hooks/useStore').useStore> }) {
  const today = todayISO()
  const byId = new Map(problems.map(p => [p.id, p]))
  const todays = Object.values(store.state.progress).filter(p => p.scheduledDate === today)
  const reviews = Object.values(store.state.progress).filter(p => p.requeueDate === today)
  const solved = Object.values(store.state.progress).filter(p => p.status === 'solved' || p.status === 'confident').length
  const pct = problems.length ? (solved / problems.length) * 100 : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Today — {today}</h2>
        <Progress value={pct} className="mt-2" />
      </div>
      <section>
        <h3 className="font-semibold mb-2">Due for Review</h3>
        {reviews.length === 0 ? <p className="text-muted-foreground text-sm">No reviews due</p> : (
          <div className="space-y-2">
            {reviews.map(p => { const pr = byId.get(p.problemId); if (!pr) return null
              return <ProblemCard key={p.problemId} problem={pr} progress={p}
                onStatusChange={s => store.updateProgress(p.problemId, { status: s, lastUpdated: new Date().toISOString() })}
                onNotesChange={n => store.updateProgress(p.problemId, { notes: n, lastUpdated: new Date().toISOString() })} />
            })}
          </div>
        )}
      </section>
      <section>
        <h3 className="font-semibold mb-2">Scheduled</h3>
        {todays.length === 0 ? <p className="text-muted-foreground text-sm">Nothing scheduled today</p> : (
          <div className="space-y-2">
            {todays.map(p => { const pr = byId.get(p.problemId); if (!pr) return null
              return <ProblemCard key={p.problemId} problem={pr} progress={p}
                onStatusChange={s => store.updateProgress(p.problemId, { status: s, lastUpdated: new Date().toISOString() })}
                onNotesChange={n => store.updateProgress(p.problemId, { notes: n, lastUpdated: new Date().toISOString() })} />
            })}
          </div>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 5: `App.tsx`** — layout shell: sidebar + top bar (date + Sync placeholder) + main area switching on `activeTab`. Import parsed problems via `?raw`; seed in dev if empty.

```typescript
import { useState } from 'react'
import { useStore } from './hooks/useStore'
import { parseProblems } from './lib/parseProblems'
import { seedState } from './lib/seed'
import csv from './data/problems.csv?raw'
import { Sidebar } from './components/Sidebar'
import { TodayView } from './components/TodayView'

const problems = parseProblems(csv)

export default function App() {
  const store = useStore()
  const [tab, setTab] = useState<'today' | 'calendar' | 'topics' | 'notes' | 'settings'>('today')
  const solved = Object.values(store.state.progress).filter(p => p.status === 'solved' || p.status === 'confident').length
  return (
    <div className="flex h-screen">
      <Sidebar active={tab} onTab={setTab} solved={solved} total={problems.length} />
      <main className="flex-1 overflow-auto p-6">
        {tab === 'today' ? <TodayView problems={problems} store={store} />
         : <p className="text-muted-foreground">Coming soon</p>}
      </main>
    </div>
  )
}
```
(Dev-only seed: if `import.meta.env.DEV && Object.keys(store.state.progress).length === 0`, call `store.applyAssignments(Object.fromEntries(seedState(problems).progress ? Object.entries(seedState(problems).progress).map(([id,p]) => [id, p.scheduledDate!]) : []), new Date().toISOString())` once on mount. Keep minimal — a simple dev button "Seed" calling `store.applyAssignments(...)` is acceptable.)

- [ ] **Step 6: Verify** — `npm run dev`: sidebar tabs switch, seeded Today shows 5 cards, status change + notes persist across reload, link opens new tab.

- [ ] **Step 7: Commit**

```bash
npm run typecheck && git add -A && git commit -m "feat: app shell, sidebar, today view"
```

---

## Task 7: Settings View (Generate / Regenerate / Reset)

**Files:** Create `src/components/SettingsView.tsx`; modify `src/App.tsx` to render it; remove seed auto-trigger.

- [ ] **Step 1: `SettingsView.tsx`**

```typescript
import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { toast } from 'sonner'
import { generateSchedule } from '../lib/scheduler'
import type { Problem } from '../types'

export function SettingsView({ problems, store }: { problems: Problem[]; store: ReturnType<typeof import('../hooks/useStore').useStore> }) {
  const [deadline, setDeadline] = useState(store.state.config.deadline)
  const [hours, setHours] = useState(String(store.state.config.hoursPerDay))
  const [weekdays, setWeekdays] = useState(store.state.config.weekdaysOnly)
  const [err, setErr] = useState('')
  const [warn, setWarn] = useState<string[] | null>(null)

  function run(regen: boolean) {
    setErr('')
    try {
      const cfg = { deadline, hoursPerDay: Number(hours), weekdaysOnly: weekdays }
      const { assignments, warnings } = generateSchedule(problems, cfg, regen ? store.state.progress : undefined)
      store.setConfig(cfg)
      store.applyAssignments(assignments, new Date().toISOString())
      if (warnings.length) setWarn(warnings)
      else toast.success(regen ? 'Schedule regenerated' : 'Schedule generated')
    } catch (e) {
      setErr(String((e as Error).message))
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <h2 className="text-xl font-bold">Settings</h2>
      <div>
        <Label htmlFor="deadline">Deadline</Label>
        <Input id="deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="hours">Hours per day</Label>
        <Input id="hours" type="number" min={0.5} step={0.5} value={hours} onChange={e => setHours(e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={weekdays} onCheckedChange={setWeekdays} />
        <Label>Weekdays only (for requeue)</Label>
      </div>
      {err && <p className="text-sm text-red-500">{err}</p>}
      <div className="flex gap-2">
        <Button onClick={() => run(false)}>Generate Schedule</Button>
        <Button variant="outline" onClick={() => run(true)}>Regenerate (unsolved)</Button>
      </div>
      <Button variant="outline" disabled>Sync to Files (coming soon)</Button>
      <Button variant="destructive" onClick={() => { if (confirm('Reset all progress?')) { store.resetAll(); toast.success('Reset') } }}>
        Reset All Progress
      </Button>

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

- [ ] **Step 2: Wire into `App.tsx`** — render `<SettingsView problems={problems} store={store} />` on the settings tab.

- [ ] **Step 3: Verify** — deadline 30d/2hr → Generate → Today populates; past deadline blocked; 0 hours blocked; mark 2 solved → Regenerate → solved keep dates; Reset clears.

- [ ] **Step 4: Commit**

```bash
npm run typecheck && git add -A && git commit -m "feat: settings view, generate/regenerate"
```

---

## Task 8: Requeue (TDD)

**Files:** Create `src/lib/requeue.ts`, `src/lib/requeue.test.ts`; modify `src/hooks/useStore.ts`, `src/components/TodayView.tsx`

- [ ] **Step 1: Write failing test `requeue.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { processRequeue } from './requeue'
import type { Problem, ProblemProgress, ScheduleConfig } from '../types'

const cfg: ScheduleConfig = { deadline: '2099-12-31', hoursPerDay: 2, weekdaysOnly: true }
const prob = (id: string): Problem => ({ id, learningPath: 'DS', topic: 'T', section: 'S', name: id, difficulty: 'Easy', url: 'x' })

const solved = (id: string, lastUpdated: string, requeueDate?: string): ProblemProgress => ({
  problemId: id, status: 'solved', notes: '', lastUpdated, scheduledDate: '2099-01-01', requeueDate, requeueCount: 0,
})

describe('requeue', () => {
  it('schedules solved-not-confident to next weekend >=7d out', () => {
    const today = '2099-01-15' // Friday
    const r = processRequeue({ a: solved('a', '2099-01-08') }, [prob('a')], cfg, today)
    expect(r.a.requeueDate).toBeTruthy()
    expect(r.a.requeueCount).toBe(1)
    const d = new Date(r.a.requeueDate + 'T00:00:00')
    expect(d.getDay() === 6 || d.getDay() === 0).toBe(true)
    expect(r.a.requeueDate >= '2099-01-15').toBe(true)
  })
  it('past requeueDate -> reschedule +7d, increment', () => {
    const today = '2099-02-01'
    const r = processRequeue({ a: solved('a', '2099-01-01', '2099-01-10') }, [prob('a')], cfg, today)
    expect(r.a.requeueCount).toBe(1)
    expect(r.a.requeueDate > today).toBe(true)
  })
  it('confident excluded', () => {
    const r = processRequeue({ a: { ...solved('a', '2099-01-01'), status: 'confident' } }, [prob('a')], cfg, '2099-02-01')
    expect(r.a.requeueDate).toBeUndefined()
  })
  it('not-started/attempted excluded', () => {
    const r = processRequeue({ a: { ...solved('a', '2099-01-01'), status: 'attempted' } }, [prob('a')], cfg, '2099-02-01')
    expect(r.a.requeueDate).toBeUndefined()
  })
  it('deadline passed + no unsolved -> daily fallback', () => {
    const today = '2100-01-01'
    const past: ScheduleConfig = { ...cfg, deadline: '2099-12-31' }
    const r = processRequeue({ a: solved('a', '2099-12-01') }, [prob('a')], past, today)
    expect(r.a.requeueDate).toBe('2100-01-02')
  })
  it('no unsolved problems -> daily fallback', () => {
    const today = '2099-06-01'
    const r = processRequeue({ a: solved('a', '2099-05-20') }, [prob('a')], cfg, today)
    expect(r.a.requeueDate).toBe('2099-06-02')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**
Run: `npm run test src/lib/requeue.test.ts`

- [ ] **Step 3: Implement `requeue.ts`**

```typescript
import type { Problem, ProblemProgress, ScheduleConfig } from '../types'

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10)
}
function dayOf(iso: string): number { return new Date(iso + 'T00:00:00').getDay() }

export function processRequeue(
  progress: Record<string, ProblemProgress>,
  problems: Problem[],
  config: ScheduleConfig,
  today: string,
): Record<string, ProblemProgress> {
  const deadlinePassed = today > config.deadline
  const hasUnsolved = Object.values(progress).some(
    p => p.status === 'not-started' || p.status === 'attempted',
  ) || problems.some(p => !progress[p.id])
  const useDaily = (deadlinePassed && !hasUnsolved) || !hasUnsolved

  const out = { ...progress }
  for (const p of Object.values(out)) {
    if (p.status !== 'solved') continue
    const due = !p.requeueDate || p.requeueDate <= today
    if (!due) continue
    let date: string
    if (useDaily) {
      date = addDays(today, 1)
    } else {
      date = addDays(p.lastUpdated.slice(0, 10), 7)
      while (dayOf(date) !== 6 && dayOf(date) !== 0) date = addDays(date, 1)
      if (date <= today) date = addDays(today, 1)
    }
    out[p.problemId] = { ...p, requeueDate: date, requeueCount: p.requeueCount + 1 }
  }
  return out
}
```

- [ ] **Step 4: Run — expect PASS**
Run: `npm run test src/lib/requeue.test.ts`

- [ ] **Step 5: Wire into `useStore`** — accept `problems` param; run `processRequeue` on mount and after every `updateProgress`.

```typescript
import { processRequeue } from '../lib/requeue'
import type { Problem } from '../types'

export function useStore(problems: Problem[]) {
  const [state, setState] = useState<AppState>(() => loadState())
  const todayISO = () => new Date().toISOString().slice(0, 10)

  useEffect(() => { saveState(state) }, [state])
  useEffect(() => {
    setState(s => ({ ...s, progress: processRequeue(s.progress, problems, s.config, todayISO()) }))
  }, []) // run once on mount

  const updateProgress = useCallback((problemId: string, patch: Partial<ProblemProgress>) => {
    setState(s => {
      const merged = {
        ...s.progress[problemId],
        problemId, status: 'not-started', notes: '', lastUpdated: new Date().toISOString(), requeueCount: 0,
        ...s.progress[problemId], ...patch,
      } as ProblemProgress
      const next = { ...s, progress: { ...s.progress, [problemId]: merged } }
      return { ...next, progress: processRequeue(next.progress, problems, next.config, todayISO()) }
    })
  }, [problems])
  // ...rest unchanged; pass `problems` from App
}
```
Update `App.tsx` to call `useStore(problems)`.

- [ ] **Step 6: TodayView "Due for Review"** — already implemented in Task 6 (renders `requeueDate === today`). Verify it now populates.

- [ ] **Step 7: Verify** — mark solved-not-confident, temporarily hardcode `today` to a weekend 7+ days later → appears in Due for Review. Mark confident → never appears.

- [ ] **Step 8: Commit**

```bash
npm run test && npm run typecheck && git add -A && git commit -m "feat: requeue spaced repetition"
```

---

## Task 9: Calendar View

**Files:** Create `src/components/CalendarView.tsx`

- [ ] **Step 1: Build a custom month grid** (shadcn Calendar is date-picker-oriented; custom grid is simpler). State: `viewMonth` (`{year, month}`). Prev/next month buttons. Render 7-col grid with weekday headers.

- [ ] **Step 2: Per-day cell** — count problems with `scheduledDate === thatDay`; color dots by difficulty present; checkmark if all that day's problems solved/confident. Weekend days with `requeueDate === thatDay` → badge "X reviews".

- [ ] **Step 3: Click day → `<Dialog>`** listing that day's problems (compact: name + difficulty + status + link button).

- [ ] **Step 4: Verify** — current month renders, scheduled days show dots, solved day shows checkmark, requeue weekend shows badge, day dialog works, month nav preserves state.

- [ ] **Step 5: Commit**

```bash
npm run typecheck && git add -A && git commit -m "feat: calendar view"
```

---

## Task 10: Topics View

**Files:** Create `src/components/TopicsView.tsx`; add shadcn `collapsible` + `chevron-down` icon.

- [ ] **Step 1: Add components**

```bash
npx shadcn@latest add collapsible
```

- [ ] **Step 2: Build tree** from `problems` grouped by `learningPath → topic → section`. Use `Collapsible` with chevron icons.

- [ ] **Step 3: Per-node progress** — "Section — X/Y solved" computed from `store.state.progress`. Pattern mastery = `% confident`; color red<40, amber 40-75, green>75.

- [ ] **Step 4: Expand pattern → list problems** with status badges (color-coded by status).

- [ ] **Step 5: Verify** — full tree renders all learning paths/topics/sections from CSV; expand/collapse works; counts update after changing status in Today; mastery colors render at thresholds.

- [ ] **Step 6: Commit**

```bash
npm run typecheck && git add -A && git commit -m "feat: topics tree view"
```

---

## Task 11: Notes View

**Files:** Create `src/components/NotesView.tsx`; install `react-markdown`

- [ ] **Step 1: Install**

```bash
npm install react-markdown
```

- [ ] **Step 2: `NotesView.tsx`** — list problems with non-empty `notes`. Each entry: name, lastUpdated, rendered markdown (`<ReactMarkdown>`). Filters: topic `<select>`, status `<select>`, difficulty `<select>`. Search box filters by name OR notes content (case-insensitive). Edit toggle: textarea ↔ rendered; save → `store.updateProgress(id, { notes, lastUpdated })`.

- [ ] **Step 3: Verify** — only noted problems show; search + 3 filters work alone and combined; edit→save→renders; persists reload; markdown headings/lists/code render.

- [ ] **Step 4: Commit**

```bash
npm run typecheck && git add -A && git commit -m "feat: notes view with markdown"
```

---

## Task 12: Filesystem Sync

**Files:** Create `src/plugins/filesystem.ts`, `src/lib/sync.ts`; modify `vite.config.ts`, `src/components/SettingsView.tsx`

- [ ] **Step 1: `src/plugins/filesystem.ts`** (~40 lines)

```typescript
import type { Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

export function filesystemPlugin(root: string): Plugin {
  return {
    name: 'filesystem-sync',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? ''
        if (url === '/save' && req.method === 'POST') {
          let body = ''
          for await (const c of req) body += c
          try {
            const { progress, notes } = JSON.parse(body)
            fs.writeFileSync(path.join(root, 'progress.json'), JSON.stringify(progress, null, 2))
            for (const [rel, content] of Object.entries(notes as Record<string, string>)) {
              const fp = path.join(root, rel)
              fs.mkdirSync(path.dirname(fp), { recursive: true })
              fs.writeFileSync(fp, content)
            }
            res.end(JSON.stringify({ ok: true }))
          } catch (e) {
            res.end(JSON.stringify({ ok: false, error: String(e) }))
          }
          return
        }
        if (url === '/load' && req.method === 'GET') {
          const fp = path.join(root, 'progress.json')
          if (!fs.existsSync(fp)) { res.statusCode = 404; res.end(); return }
          res.end(fs.readFileSync(fp, 'utf-8'))
          return
        }
        next()
      })
    },
  }
}
```

- [ ] **Step 2: Register in `vite.config.ts`**

```typescript
import { filesystemPlugin } from './src/plugins/filesystem'
// add to plugins array: filesystemPlugin(process.cwd())
```

- [ ] **Step 3: `src/lib/sync.ts`**

```typescript
import type { AppState, Problem } from '../types'

export async function syncToFiles(state: AppState, problems: Problem[]): Promise<{ ok: boolean; error?: string }> {
  const notes: Record<string, string> = {}
  const byId = new Map(problems.map(p => [p.id, p]))
  for (const p of Object.values(state.progress)) {
    if (!p.notes.trim()) continue
    const prob = byId.get(p.problemId); if (!prob) continue
    const rel = `notes/${prob.learningPath}/${prob.topic}/${p.problemId}.md`
    notes[rel] = p.notes
  }
  const res = await fetch('/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progress: state, notes }) })
  return res.json()
}

export async function loadFromFiles(): Promise<AppState | null> {
  const res = await fetch('/load')
  if (!res.ok) return null
  return res.json()
}
```

- [ ] **Step 4: Wire Settings** — replace disabled "Sync to Files" with active button → `syncToFiles(store.state, problems)` → `toast.success/error`. Add "Import from Files" button → `loadFromFiles()` → confirm Dialog → `store.loadFromImport(loaded)`.

- [ ] **Step 5: Verify** — dev: Sync → `progress.json` + `notes/DS/Array/*.md` on disk; Import → confirm → state restored; kill dev server + Sync → error toast, app still works; `npm run build` excludes plugin (no `/save` route in production).

- [ ] **Step 6: Commit**

```bash
npm run typecheck && npm run build && git add -A && git commit -m "feat: filesystem sync plugin"
```

---

## Task 13: Polish + README + Smoke Test

**Files:** Modify `src/lib/parseProblems.ts` (return skipped count), `src/App.tsx` (toast on skip), `src/components/SettingsView.tsx` (toast on errors); create `README.md`

- [ ] **Step 1: Track skipped rows** — change `parseProblems` to also return skipped count:

```typescript
export function parseProblems(csv: string): { problems: Problem[]; skipped: number } {
  // ...same loop, increment skipped for unknown difficulty
  return { problems: out, skipped }
}
```
Update all callers (App.tsx, useStore receives `problems` only, sync.ts uses `problems`). In App, if `skipped > 0` call `toast.warning(\`\${skipped} CSV rows skipped\`)`.

- [ ] **Step 2: Wrap user-facing errors in `toast`** — scheduler throws caught in SettingsView already set `err`; also `toast.error(err)`.

- [ ] **Step 3: `README.md`**

```markdown
# Interview Study Planner

Tracks interview prep progress across 475 problems with auto-scheduling, spaced repetition, and local file sync.

## Setup
\`\`\`bash
npm install
npm run dev
\`\`\`

## Scripts
- \`npm run dev\` — Vite dev server (filesystem plugin active)
- \`npm run test\` — Vitest unit tests
- \`npm run lint\` — ESLint
- \`npm run typecheck\` — \`tsc --noEmit\`
- \`npm run build\` — production build (no filesystem plugin)

## Git sync workflow
1. Work in the app; state persists to localStorage.
2. Settings → "Sync to Files" writes \`progress.json\` and \`notes/\` to disk.
3. \`git add . && git commit -m "update progress" && git push\`

## Known limitations
- Desktop-first (no mobile layout).
- Single-user, no auth, no backend.
- Filesystem plugin is dev-only.
```

- [ ] **Step 4: Full suite**

```bash
npm run test && npm run typecheck && npm run lint && npm run build
```
Expected: all pass.

- [ ] **Step 5: Manual smoke test** — install → dev → configure 30d/2hr → generate → Today works → mark 5 solved (not confident) → advance clock → requeue on weekend → Calendar dots/checkmarks/badges → Topics progress+mastery → Notes search/filter/edit → Sync → verify `progress.json` + `notes/` on disk → reload → Import → Regenerate preserves solved → Reset confirms. No console errors.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "docs: readme and polish"
```

---

## Self-Review

**Spec coverage:**
- Scheduler incl. all edge cases (past deadline, hours<0.5, over-capacity, regeneration preserving progress, ordering, rollover) → Task 4 ✓
- Storage with schema version, corruption recovery, fresh fallback → Task 5 ✓
- useStore central hook → Task 5 ✓
- App shell + Sidebar with progress footer → Task 6 ✓
- Today view with progress bar, scheduled list, Due for Review section → Task 6 ✓
- ProblemCard with status selector + inline notes + link → Task 6 ✓
- Settings: deadline/hours/weekdays, Generate, Regenerate, Reset, over-capacity dialog → Task 7 ✓
- Requeue: 7-day weekend, Saturday/Sunday fallback, daily fallback (deadline passed OR no unsolved), confident exclusion, increment → Task 8 ✓
- Calendar: month grid, difficulty dots, checkmarks, requeue badges, day dialog → Task 9 ✓
- Topics: collapsible tree, per-node progress, mastery colors → Task 10 ✓
- Notes: search + 3 filters, inline markdown edit, react-markdown render → Task 11 ✓
- Filesystem plugin /save + /load, client sync, import confirm, dev-only → Task 12 ✓
- Error handling: CSV skip toast, localStorage corruption backup, sync error toasts → Task 13 ✓
- README + git workflow → Task 13 ✓
- Out-of-scope items (no backend, no mobile, no E2E, no router, no ascending intervals) respected throughout.

**Placeholder scan:** No "TBD"/"TODO"/"implement later". Every code step contains real code. Every test step contains real test code. Commands have expected output.

**Type consistency:**
- `applyAssignments(assignments, generatedAt)` — defined Task 5, used Task 6 & Task 7 ✓
- `useStore()` → `useStore(problems)` — changed in Task 8, App.tsx updated in Task 8 Step 5 ✓
- `processRequeue(progress, problems, config, today)` — signature identical in test (Task 8 Step 1) and impl (Task 8 Step 3) and hook wiring (Task 8 Step 5) ✓
- `parseProblems(csv)` returns `Problem[]` in Task 3; Task 13 changes return shape to `{ problems, skipped }` — callers updated in Task 13 Step 1 ✓
- `SCHEMA_VERSION`, `freshState`, `loadState`, `saveState` consistent across Tasks 3/5/13 ✓
- `Difficulty`/`Status`/`Problem`/`ProblemProgress`/`ScheduleConfig`/`AppState` match spec and are used consistently ✓
- `syncToFiles(state, problems)` / `loadFromFiles()` consistent Task 12 → Task 13 ✓

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-08-interview-study-planner.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**

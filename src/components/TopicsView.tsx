import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible'
import { cn } from '../lib/utils'
import type { Problem, ProblemProgress } from '../types'

const DIFF_COLOR: Record<string, string> = {
  Easy: 'bg-green-500', Medium: 'bg-amber-500', Hard: 'bg-red-500', Fundamental: 'bg-slate-500',
}

const STATUS_LABEL: Record<string, string> = {
  'not-started': 'Todo',
  'attempted': 'Tried',
  'solved': 'Solved',
  'confident': 'Mastered',
}

const STATUS_COLOR: Record<string, string> = {
  'not-started': 'bg-gray-300 text-gray-700',
  'attempted': 'bg-yellow-300 text-yellow-800',
  'solved': 'bg-blue-500 text-white',
  'confident': 'bg-green-600 text-white',
}

function masteryColor(pct: number) {
  if (pct <= 40) return 'text-red-500'
  if (pct <= 75) return 'text-amber-500'
  return 'text-green-500'
}

function sectionStats(problems: Problem[], progress: Record<string, ProblemProgress>) {
  let solved = 0, confident = 0
  for (const p of problems) {
    const s = progress[p.id]?.status
    if (s === 'solved' || s === 'confident') solved++
    if (s === 'confident') confident++
  }
  const total = problems.length
  return { solved, confident, total, masteryPct: total ? Math.round((confident / total) * 100) : 0 }
}

function nodeStats(problems: Problem[], progress: Record<string, ProblemProgress>) {
  let total = 0, solved = 0
  for (const p of problems) {
    total++
    const s = progress[p.id]?.status
    if (s === 'solved' || s === 'confident') solved++
  }
  return { solved, total }
}

function flattenProblems(topics: Record<string, Record<string, Problem[]>>) {
  const all: Problem[] = []
  for (const sections of Object.values(topics)) {
    for (const probs of Object.values(sections)) {
      for (const p of probs) all.push(p)
    }
  }
  return all
}

function SectionNode({ name, problems, progress, defaultOpen }: {
  name: string; problems: Problem[]; progress: Record<string, ProblemProgress>; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  const { solved, confident, total, masteryPct } = sectionStats(problems, progress)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1 py-1 px-2 rounded hover:bg-accent w-full text-left text-sm">
        <ChevronRight className={cn("size-4 shrink-0 transition-transform", open && "rotate-90")} />
        <span className="font-medium truncate">{name}</span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">{solved}/{total} solved</span>
        <span className={cn("ml-2 shrink-0 text-xs font-medium", masteryColor(masteryPct))}>
          {confident}/{total} mastered
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-4 border-l pl-3 space-y-0.5">
        {problems.map(p => (
          <button
            key={p.id}
            onClick={() => window.open(p.url, '_blank')}
            className="flex items-center gap-2 w-full text-left py-1 px-2 rounded hover:bg-accent text-sm"
          >
            <span className="truncate flex-1">{p.name}</span>
            <span className={cn("text-xs px-1.5 py-0.5 rounded text-white shrink-0", DIFF_COLOR[p.difficulty])}>
              {p.difficulty}
            </span>
            <span className={cn("text-xs px-1.5 py-0.5 rounded shrink-0", STATUS_COLOR[progress[p.id]?.status ?? 'not-started'])}>
              {STATUS_LABEL[progress[p.id]?.status ?? 'not-started']}
            </span>
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

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1 py-2 px-3 rounded hover:bg-accent w-full text-left font-semibold">
        <ChevronRight className={cn("size-4 shrink-0 transition-transform", open && "rotate-90")} />
        <span>{name}</span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground font-normal">{solved}/{total} solved</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-6 space-y-1">
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

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border rounded-lg">
      <CollapsibleTrigger className="flex items-center gap-2 py-3 px-4 rounded-lg hover:bg-accent w-full text-left font-bold text-base">
        <ChevronRight className={cn("size-5 shrink-0 transition-transform", open && "rotate-90")} />
        <span>{name}</span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground font-normal">{solved}/{total} solved</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-3 space-y-1">
        {Object.entries(topics).map(([topic, sections]) => (
          <TopicNode key={topic} name={topic} sections={sections} progress={progress} />
        ))}
      </CollapsibleContent>
    </Collapsible>
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
    <div className="space-y-3">
      <h2 className="text-xl font-bold">Topics</h2>
      {Object.entries(tree).map(([learningPath, topics]) => (
        <LearningPathNode key={learningPath} name={learningPath} topics={topics} progress={store.state.progress} />
      ))}
    </div>
  )
}

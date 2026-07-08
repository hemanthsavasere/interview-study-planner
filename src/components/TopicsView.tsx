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
          <button key={p.id} onClick={() => window.open(p.url, '_blank', 'noopener,noreferrer')}
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

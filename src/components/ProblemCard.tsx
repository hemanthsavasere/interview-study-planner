import { useState, useRef, useEffect } from 'react'
import { ExternalLink, StickyNote } from 'lucide-react'
import type { Problem, ProblemProgress, Status } from '../types'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent } from './ui/card'
import { difficultyClass, statusClass, STATUS_LABEL, STATUSES } from '../lib/badges'

export function ProblemCard({ problem, progress, onStatusChange, onNotesChange }: {
  problem: Problem; progress: ProblemProgress
  onStatusChange: (s: Status) => void; onNotesChange: (n: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [ring, setRing] = useState(false)
  const ringTimerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(ringTimerRef.current), [])

  function handleStatus(s: Status) {
    onStatusChange(s)
    setRing(true)
    ringTimerRef.current = setTimeout(() => setRing(false), 1000)
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
            <SelectTrigger size="sm" className="w-36" aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon-sm" aria-label="Open problem"
            onClick={() => window.open(problem.url, '_blank', 'noopener,noreferrer')}>
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

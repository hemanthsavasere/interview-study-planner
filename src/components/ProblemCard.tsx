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

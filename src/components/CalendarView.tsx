import { useMemo, useState } from 'react'
import type { Problem, ProblemProgress } from '../types'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'

const DIFF_COLOR: Record<string, string> = {
  Easy: 'bg-green-500', Medium: 'bg-amber-500', Hard: 'bg-red-500', Fundamental: 'bg-slate-500',
}

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

  const byId = useMemo(() => new Map(problems.map(p => [p.id, p])), [problems])

  const { scheduledMap, requeueMap } = useMemo(() => {
    const sMap: Record<string, ProblemProgress[]> = {}
    const rMap: Record<string, ProblemProgress[]> = {}
    for (const p of Object.values(store.state.progress)) {
      if (p.scheduledDate) {
        (sMap[p.scheduledDate] ??= []).push(p)
      }
      if (p.requeueDate) {
        (rMap[p.requeueDate] ??= []).push(p)
      }
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
        <h2 className="text-xl font-bold">{monthName}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={prev} aria-label="Previous month">Prev</Button>
          <Button variant="outline" size="sm" onClick={next} aria-label="Next month">Next</Button>
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
          const diffs = [...new Set(scheduled.map(p => byId.get(p.problemId)?.difficulty).filter(Boolean))]
          const weekday = i % 7
          const isWeekend = weekday === 0 || weekday === 6
          const hasRequeue = requeue.length > 0 && isWeekend

          return (
            <button
              key={key}
              onClick={() => setSelectedDate(key)}
              className={`aspect-square border rounded-lg p-1 flex flex-col items-center justify-start text-sm hover:bg-accent transition-colors ${allSolved ? 'border-green-400 bg-green-50 dark:bg-green-950' : ''}`}
            >
              <span className="text-xs">{day}</span>
              {scheduled.length > 0 && (
                <span className="text-[10px] font-medium text-muted-foreground mt-0.5">{scheduled.length}</span>
              )}
              {diffs.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {diffs.map(d => (
                    <span key={d} className={`w-1.5 h-1.5 rounded-full ${DIFF_COLOR[d!]}`} />
                  ))}
                </div>
              )}
              {allSolved && <span className="text-green-600 text-xs mt-0.5">&#10003;</span>}
              {hasRequeue && <span className="text-[10px] text-muted-foreground mt-0.5">{requeue.length} review{requeue.length > 1 ? 's' : ''}</span>}
            </button>
          )
        })}
      </div>

      <Dialog open={!!selectedDate} onOpenChange={o => { if (!o) setSelectedDate(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedDate}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-auto">
            {selectedData?.scheduled.length === 0 && selectedData?.requeue.length === 0 && (
              <p className="text-sm text-muted-foreground">No problems scheduled</p>
            )}
            {selectedData && selectedData.scheduled.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Scheduled</h4>
                {selectedData.scheduled.map(p => {
                  const pr = byId.get(p.problemId)
                  if (!pr) return null
                  return <DayProblem key={p.problemId} problem={pr} progress={p} />
                })}
              </div>
            )}
            {selectedData && selectedData.requeue.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Reviews</h4>
                {selectedData.requeue.map(p => {
                  const pr = byId.get(p.problemId)
                  if (!pr) return null
                  return <DayProblem key={p.problemId} problem={pr} progress={p} />
                })}
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
    <div className="flex items-center justify-between border rounded p-2 text-sm">
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{problem.name}</div>
        <div className="text-xs text-muted-foreground">{progress.status}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <span className={`text-xs px-1.5 py-0.5 rounded text-white ${DIFF_COLOR[problem.difficulty]}`}>{problem.difficulty}</span>
        <Button variant="outline" size="xs" onClick={() => window.open(problem.url, '_blank')}>Open</Button>
      </div>
    </div>
  )
}

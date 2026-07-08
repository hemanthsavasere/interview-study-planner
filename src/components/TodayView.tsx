import { useState } from 'react'
import { Progress } from './ui/progress'
import { Button } from './ui/button'
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

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(d => addDaysISO(d, -1))}>
            Prev
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(realToday)} disabled={isToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(d => addDaysISO(d, 1))}>
            Next
          </Button>
          <h2 className="text-xl font-bold ml-2">
            {isToday ? `Today — ${selectedDate}` : selectedDate}
          </h2>
        </div>
        <Progress value={pct} />
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
        {scheduled.length === 0 ? <p className="text-muted-foreground text-sm">Nothing scheduled</p> : (
          <div className="space-y-2">
            {scheduled.map(p => { const pr = byId.get(p.problemId); if (!pr) return null
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

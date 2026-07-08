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

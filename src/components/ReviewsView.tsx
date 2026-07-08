import { RotateCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { ProblemCard } from './ProblemCard'
import type { Problem, ProblemProgress, Status } from '../types'
import { todayISO } from '../lib/date'
import { weekendOf } from '../lib/requeue'

export function ReviewsView({ problems, store }: {
  problems: Problem[]
  store: ReturnType<typeof import('../hooks/useStore').useStore>
}) {
  const today = todayISO()

  function makeHandlers(problemId: string) {
    return {
      onStatusChange: (s: Status) =>
        store.updateProgress(problemId, { status: s, lastUpdated: new Date().toISOString() }),
      onNotesChange: (n: string) =>
        store.updateProgress(problemId, { notes: n, lastUpdated: new Date().toISOString() }),
    }
  }

  const byId = new Map(problems.map(p => [p.id, p]))
  const reviewItems = Object.values(store.state.progress).filter(
    (p): p is ProblemProgress => p.status === 'solved' && !!p.requeueDate,
  )

  const groups = new Map<string, { sat: string; sun: string; items: ProblemProgress[] }>()
  for (const p of reviewItems) {
    const { sat, sun } = weekendOf(p.requeueDate!)
    if (!groups.has(sat)) groups.set(sat, { sat, sun, items: [] })
    groups.get(sat)!.items.push(p)
  }

  const sortedWeekends = Array.from(groups.values()).sort((a, b) => a.sat.localeCompare(b.sat))

  const firstUpcomingIdx = sortedWeekends.findIndex(w => w.sun >= today)

  function labelFor(idx: number): string {
    if (firstUpcomingIdx === -1 || idx < firstUpcomingIdx) {
      return 'Past — will roll forward on next open'
    }
    if (idx === firstUpcomingIdx) return 'This weekend'
    if (idx === firstUpcomingIdx + 1) return 'Next weekend'
    return ''
  }

  function fmt(iso: string): string {
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (reviewItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <RotateCw className="size-10 mb-3 text-primary/60" />
        <p className="text-sm max-w-sm">
          Nothing in the review loop yet — mark problems 'Solved' to enroll them for weekly re-attempts.
        </p>
      </div>
    )
  }

  function DaySection({ dayLabel, date, items }: {
    dayLabel: string; date: string; items: ProblemProgress[]
  }) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">{dayLabel} — {fmt(date)}</h4>
          <Badge variant="secondary" className="ml-1">{items.length}</Badge>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">Nothing for {dayLabel} — nice!</p>
        ) : items.map(p => {
          const pr = byId.get(p.problemId); if (!pr) return null
          return <ProblemCard key={p.problemId} problem={pr} progress={p} {...makeHandlers(p.problemId)} />
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {reviewItems.length} problems in the spaced-repetition loop, grouped by upcoming weekend.
      </p>
      {sortedWeekends.map((w, idx) => {
        const base = labelFor(idx)
        const title = base || `${fmt(w.sat)} – ${fmt(w.sun)}`
        const satItems = w.items.filter(p => p.requeueDate === w.sat)
        const sunItems = w.items.filter(p => p.requeueDate === w.sun)
        return (
          <Card key={w.sat}>
            <CardHeader>
              <CardTitle className="text-base">{title}
                <Badge variant="secondary" className="ml-2">{w.items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <DaySection dayLabel="Saturday" date={w.sat} items={satItems} />
              <DaySection dayLabel="Sunday" date={w.sun} items={sunItems} />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

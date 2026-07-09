import { useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, Clock, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { Badge } from './ui/badge'
import { ProblemCard } from './ProblemCard'
import type { Problem, Status } from '../types'
import { todayISO, addDaysISO } from '../lib/date'

export function TodayView({ problems, store }: { problems: Problem[]; store: ReturnType<typeof import('../hooks/useStore').useStore> }) {
  const realToday = todayISO()
  const [selectedDate, setSelectedDate] = useState(realToday)
  const isToday = selectedDate === realToday

  function makeHandlers(problemId: string) {
    return {
      onStatusChange: (s: Status) =>
        store.updateProgress(problemId, { status: s, lastUpdated: new Date().toISOString() }),
      onNotesChange: (n: string) =>
        store.updateProgress(problemId, { notes: n, lastUpdated: new Date().toISOString() }),
    }
  }

  const byId = new Map(problems.map(p => [p.id, p]))
  const scheduled = Object.values(store.state.progress).filter(p => p.scheduledDate === selectedDate)

  const solved = Object.values(store.state.progress).filter(p => p.status === 'solved' || p.status === 'confident').length
  const pct = problems.length ? (solved / problems.length) * 100 : 0

  const weekEnd = addDaysISO(realToday, 7)
  const upcoming = Object.values(store.state.progress).filter(p =>
    p.status === 'solved' && p.requeueDate && p.requeueDate >= realToday && p.requeueDate <= weekEnd).length

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
            <div className="text-3xl font-semibold tabular-nums">{scheduled.length}</div>
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
            return <ProblemCard key={p.problemId} problem={pr} progress={p} {...makeHandlers(p.problemId)} />
          })}
        </CardContent>
      </Card>
    </div>
  )
}

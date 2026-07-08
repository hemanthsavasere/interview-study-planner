import type { Problem, ProblemProgress, ScheduleConfig } from '../types'

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}
function dayOf(iso: string): number { return new Date(iso + 'T12:00:00').getDay() }

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
  const useDaily = deadlinePassed && !hasUnsolved

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

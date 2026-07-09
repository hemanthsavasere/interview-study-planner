import type { Problem, ProblemProgress, ScheduleConfig } from '../types'

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}
function dayOf(iso: string): number { return new Date(iso + 'T12:00:00').getDay() }

export function nextReviewDay(from: string): string {
  let d = addDays(from, 1)
  while (dayOf(d) !== 6 && dayOf(d) !== 0) d = addDays(d, 1)
  return d
}

export function weekendOf(date: string): { sat: string; sun: string } {
  const wd = dayOf(date)
  const offset = wd === 0 ? -1 : 6 - wd
  const sat = addDays(date, offset)
  return { sat, sun: addDays(sat, 1) }
}

export function processRequeue(
  progress: Record<string, ProblemProgress>,
  problems: Problem[],
  config: ScheduleConfig,
  today: string,
): Record<string, ProblemProgress> {
  const hasUnsolved = Object.values(progress).some(
    p => p.status === 'not-started' || p.status === 'attempted',
  ) || problems.some(p => !progress[p.id])
  const useDaily = !hasUnsolved

  const out = { ...progress }
  for (const p of Object.values(out)) {
    if (p.status !== 'solved') {
      if (p.requeueDate !== undefined) {
        out[p.problemId] = { ...p, requeueDate: undefined }
      }
      continue
    }
    const due = !p.requeueDate || p.requeueDate <= today
    if (!due) continue
    let date: string
    if (useDaily) {
      date = nextReviewDay(today)
    } else {
      date = p.lastUpdated.slice(0, 10)
      while (dayOf(date) !== 6 && dayOf(date) !== 0) date = addDays(date, 1)
      if (date <= today) date = nextReviewDay(today)
    }
    out[p.problemId] = { ...p, requeueDate: date, requeueCount: p.requeueCount + 1 }
  }
  return out
}

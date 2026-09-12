import type { Problem, ProblemProgress, ScheduleConfig } from '../types'

export const DEFAULT_REVIEWS_PER_DAY = 5

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
  const cap = Math.max(1, Math.floor(config.reviewsPerDay ?? DEFAULT_REVIEWS_PER_DAY))
  const hasUnsolved = Object.values(progress).some(
    p => p.status === 'not-started' || p.status === 'attempted',
  ) || problems.some(p => !progress[p.id])
  const useDaily = !hasUnsolved

  const out = { ...progress }
  const due: { p: ProblemProgress; preferred: string }[] = []
  const scheduled: ProblemProgress[] = []

  for (const p of Object.values(out)) {
    if (p.status !== 'solved') {
      if (p.requeueDate !== undefined) {
        out[p.problemId] = { ...p, requeueDate: undefined }
      }
      continue
    }
    const isDue = !p.requeueDate || p.requeueDate <= today
    if (isDue) {
      let date: string
      if (useDaily) {
        date = nextReviewDay(today)
      } else {
        date = p.lastUpdated.slice(0, 10)
        while (dayOf(date) !== 6 && dayOf(date) !== 0) date = addDays(date, 1)
        if (date <= today) date = nextReviewDay(today)
      }
      due.push({ p, preferred: date })
    } else {
      scheduled.push(p)
    }
  }

  const entries: { p: ProblemProgress; preferred: string; wasDue: boolean }[] = [
    ...due.map(d => ({ p: d.p, preferred: d.preferred, wasDue: true })),
    ...scheduled.map(p => ({ p, preferred: p.requeueDate!, wasDue: false })),
  ]
  entries.sort((a, b) => a.p.lastUpdated.localeCompare(b.p.lastUpdated))

  const load: Record<string, number> = {}
  for (const { p, preferred, wasDue } of entries) {
    let date = preferred
    while ((load[date] ?? 0) >= cap) date = nextReviewDay(date)
    load[date] = (load[date] ?? 0) + 1
    out[p.problemId] = {
      ...p,
      requeueDate: date,
      requeueCount: wasDue ? p.requeueCount + 1 : p.requeueCount,
    }
  }
  return out
}

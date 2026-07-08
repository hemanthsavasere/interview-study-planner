import type { Problem, ScheduleConfig, ProblemProgress, Difficulty } from '../types'
import { localISODate } from './date'

export const DIFFICULTY_MINUTES: Record<Difficulty, number> = {
  Fundamental: 24, Easy: 30, Medium: 48, Hard: 69,
}
export function totalStudyMinutes(problems: Problem[]): number {
  return problems.reduce((s, p) => s + DIFFICULTY_MINUTES[p.difficulty], 0)
}

export interface ScheduleResult {
  assignments: Record<string, string>
  warnings: string[]
}

function isoDate(d: Date): string {
  return localISODate(d)
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

export function generateSchedule(
  problems: Problem[],
  config: ScheduleConfig,
  existingProgress?: Record<string, ProblemProgress>,
): ScheduleResult {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const deadline = new Date(config.deadline + 'T00:00:00')
  if (deadline < today) throw new Error('deadline must be future')
  if (config.hoursPerDay < 0.5) throw new Error('hoursPerDay must be at least 0.5')

  const dayBudget = config.hoursPerDay * 60
  const days = Math.floor((deadline.getTime() - today.getTime()) / 86400000) + 1

  const warnings: string[] = []
  const solvedOrConfident = new Set(
    Object.entries(existingProgress ?? {})
      .filter(([, p]) => p.status === 'solved' || p.status === 'confident')
      .map(([id]) => id),
  )
  const toSchedule = problems.filter(p => !solvedOrConfident.has(p.id))

  const totalMin = totalStudyMinutes(toSchedule)
  if (totalMin > days * dayBudget) {
    warnings.push(`Not enough time: ${totalMin} min needed, ${days * dayBudget} min available`)
  }

  const problemIds = new Set(problems.map(p => p.id))
  const assignments: Record<string, string> = {}
  if (existingProgress) {
    for (const [id, p] of Object.entries(existingProgress)) {
      if (p.scheduledDate && problemIds.has(id)) assignments[id] = p.scheduledDate
    }
  }

  let dayIdx = 0
  let used = 0
  for (const p of toSchedule) {
    const m = DIFFICULTY_MINUTES[p.difficulty]
    if (used + m > dayBudget && dayIdx + 1 < days) { dayIdx++; used = 0 }
    assignments[p.id] = isoDate(addDays(today, dayIdx))
    used += m
  }
  return { assignments, warnings }
}

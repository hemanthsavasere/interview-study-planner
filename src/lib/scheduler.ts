import type { Problem, ScheduleConfig, ProblemProgress, Difficulty } from '../types'
import { addDaysISO, todayISO } from './date'

function isWeekend(date: string): boolean {
  const day = new Date(`${date}T12:00:00`).getDay()
  return day === 0 || day === 6
}

function nextWeekday(date: string): string {
  let next = date
  while (isWeekend(next)) next = addDaysISO(next, 1)
  return next
}

export const DIFFICULTY_MINUTES: Record<Difficulty, number> = {
  Fundamental: 24, Easy: 30, Medium: 48, Hard: 69,
}
export function totalStudyMinutes(problems: Problem[]): number {
  return problems.reduce((s, p) => s + DIFFICULTY_MINUTES[p.difficulty], 0)
}

export interface ScheduleResult {
  assignments: Record<string, string>
  warnings: string[]
  extendedDeadline?: string
}

export function generateSchedule(
  problems: Problem[],
  config: ScheduleConfig,
  existingProgress?: Record<string, ProblemProgress>,
): ScheduleResult {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const startISO = config.startDate || todayISO()
  const start = new Date(startISO + 'T00:00:00')
  if (start < today) throw new Error('Start date cannot be before today')
  const deadline = new Date(config.deadline + 'T00:00:00')
  if (deadline < today) throw new Error('Deadline must be in the future')
  if (deadline <= start) throw new Error('Start date must be before the deadline')
  if (config.hoursPerDay < 0.5) throw new Error('hoursPerDay must be at least 0.5')

  const dayBudget = config.hoursPerDay * 60

  const warnings: string[] = []
  const solvedOrConfident = new Set(
    Object.entries(existingProgress ?? {})
      .filter(([, p]) => p.status === 'solved' || p.status === 'confident')
      .map(([id]) => id),
  )
  const toSchedule = problems.filter(p => !solvedOrConfident.has(p.id))

  const problemIds = new Set(problems.map(p => p.id))
  const assignments: Record<string, string> = {}
  if (existingProgress) {
    for (const [id, p] of Object.entries(existingProgress)) {
      if (p.scheduledDate && problemIds.has(id)) assignments[id] = p.scheduledDate
    }
  }

  let currentDate = config.weekdaysOnly ? nextWeekday(startISO) : startISO
  let requiredDays = 0
  let used = 0
  for (const p of toSchedule) {
    const m = DIFFICULTY_MINUTES[p.difficulty]
    const startsNewDay = requiredDays === 0 || (used > 0 && used + m > dayBudget)
    if (startsNewDay) {
      if (requiredDays > 0) {
        currentDate = addDaysISO(currentDate, 1)
        if (config.weekdaysOnly) currentDate = nextWeekday(currentDate)
      }
      requiredDays++
      used = 0
    }
    assignments[p.id] = currentDate
    used += m
  }

  const finalAssignmentDate = toSchedule.length > 0
    ? assignments[toSchedule[toSchedule.length - 1].id]
    : undefined
  const extendedDeadline = finalAssignmentDate && finalAssignmentDate > config.deadline
    ? finalAssignmentDate
    : undefined
  if (extendedDeadline) {
    warnings.push(
      `Schedule extended from ${config.deadline} to ${extendedDeadline} because the problems require ${requiredDays} days at ${config.hoursPerDay} hours/day.`,
    )
  }

  return extendedDeadline
    ? { assignments, warnings, extendedDeadline }
    : { assignments, warnings }
}

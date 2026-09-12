import { describe, it, expect } from 'vitest'
import { generateSchedule, totalStudyMinutes, DIFFICULTY_MINUTES } from './scheduler'
import { todayISO } from './date'
import type { Problem, ScheduleConfig, ProblemProgress } from '../types'

const mk = (n: string, d: Problem['difficulty']): Problem => ({
  id: n, learningPath: 'DS', topic: 'T', section: 'S', name: n, difficulty: d, url: 'x',
})
const cfg = (deadline: string, hoursPerDay = 2, startDate = '2099-01-01'): ScheduleConfig => ({
  deadline, hoursPerDay, weekdaysOnly: false, startDate,
})
const weekdayCfg = (deadline: string, hoursPerDay = 2, startDate = '2099-01-01'): ScheduleConfig => ({
  deadline, hoursPerDay, weekdaysOnly: true, startDate,
})
const isWeekend = (iso: string): boolean => [0, 6].includes(new Date(`${iso}T12:00:00`).getDay())

describe('scheduler', () => {
  it('weights: F=24 E=30 M=48 H=69', () => {
    expect(DIFFICULTY_MINUTES).toEqual({ Fundamental: 24, Easy: 30, Medium: 48, Hard: 69 })
  })
  it('totalStudyMinutes sums weights', () => {
    expect(totalStudyMinutes([mk('a', 'Easy'), mk('b', 'Hard')])).toBe(30 + 69)
  })
  it('assigns every problem a scheduledDate within range', () => {
    const probs = [mk('a', 'Easy'), mk('b', 'Easy')]
    const { assignments } = generateSchedule(probs, cfg('2099-01-31'))
    expect(Object.keys(assignments)).toHaveLength(2)
    expect(assignments.a).toBeTruthy()
    expect(assignments.b).toBeTruthy()
  })
  it('first unsolved assignment equals the chosen startDate', () => {
    const probs = [mk('a', 'Easy'), mk('b', 'Easy')]
    const { assignments } = generateSchedule(probs, cfg('2099-02-28', 2, '2099-02-10'))
    expect(assignments.a).toBe('2099-02-10')
  })
  it('respects day budget; rolls leftover to next day', () => {
    const probs = [mk('a', 'Hard'), mk('b', 'Hard'), mk('c', 'Hard')] // 69*3=207 > 120
    const { assignments } = generateSchedule(probs, cfg('2099-01-31', 2))
    expect(assignments.a === assignments.b).toBe(false)
  })
  it('preserves CSV order (no re-sorting by difficulty)', () => {
    const probs = [mk('h', 'Hard'), mk('e', 'Easy'), mk('f', 'Fundamental'), mk('m', 'Medium')]
    const { assignments } = generateSchedule(probs, cfg('2099-01-31', 0.5))
    expect(assignments.h <= assignments.e).toBe(true)
  })
  it('moves a weekend start to the next weekday when weekdays-only is enabled', () => {
    const { assignments } = generateSchedule([mk('a', 'Easy')], weekdayCfg('2099-01-31', 2, '2099-01-03'))
    expect(assignments.a).toBe('2099-01-05')
  })
  it('skips the weekend when a packed day rolls over from Friday', () => {
    const probs = [mk('a', 'Hard'), mk('b', 'Easy')]
    const { assignments } = generateSchedule(probs, weekdayCfg('2099-01-31', 1.5, '2099-01-02'))
    expect(assignments).toEqual({ a: '2099-01-02', b: '2099-01-05' })
  })
  it('never assigns new problems to weekends when weekdays-only is enabled', () => {
    const probs = Array.from({ length: 10 }, (_, i) => mk('p' + i, 'Medium'))
    const { assignments } = generateSchedule(probs, weekdayCfg('2099-01-31', 1.5))
    expect(Object.values(assignments).every(date => !isWeekend(date))).toBe(true)
  })
  it('keeps weekend dates available when weekdays-only is disabled', () => {
    const probs = [mk('a', 'Hard'), mk('b', 'Easy')]
    const { assignments } = generateSchedule(probs, cfg('2099-01-31', 1.5, '2099-01-02'))
    expect(assignments).toEqual({ a: '2099-01-02', b: '2099-01-03' })
  })
  it('throws when startDate is before today', () => {
    const yesterday = todayISO()
    const past = new Date(yesterday + 'T00:00:00'); past.setDate(past.getDate() - 1)
    const pastISO = past.toISOString().slice(0, 10)
    expect(() => generateSchedule([mk('a', 'Easy')], cfg('2099-12-31', 2, pastISO)))
      .toThrow(/before today/)
  })
  it('throws when startDate equals deadline', () => {
    expect(() => generateSchedule([mk('a', 'Easy')], cfg('2099-02-10', 2, '2099-02-10')))
      .toThrow(/before the deadline/)
  })
  it('throws when startDate is after deadline', () => {
    expect(() => generateSchedule([mk('a', 'Easy')], cfg('2099-02-10', 2, '2099-03-10')))
      .toThrow(/before the deadline/)
  })
  it('throws when deadline is in the past', () => {
    expect(() => generateSchedule([mk('a', 'Easy')], cfg('2000-01-01', 2, '2099-01-01')))
      .toThrow(/in the future/)
  })
  it('throws when hoursPerDay < 0.5', () => {
    expect(() => generateSchedule([mk('a', 'Easy')], cfg('2099-01-31', 0))).toThrow(/0.5/)
  })
  it('warns when over capacity', () => {
    const probs = Array.from({ length: 100 }, (_, i) => mk('p' + i, 'Hard'))
    const { warnings, extendedDeadline } = generateSchedule(probs, cfg('2099-01-10', 2))
    expect(warnings.length).toBeGreaterThan(0)
    expect(extendedDeadline).toBeTruthy()
  })
  it('extends the deadline when whole-problem packing needs another day', () => {
    const probs = [mk('a', 'Medium'), mk('b', 'Medium'), mk('c', 'Medium')]
    const { assignments, warnings, extendedDeadline } = generateSchedule(probs, cfg('2099-01-02', 1.5))

    expect(assignments).toEqual({ a: '2099-01-01', b: '2099-01-02', c: '2099-01-03' })
    expect(extendedDeadline).toBe('2099-01-03')
    expect(warnings).toEqual([
      'Schedule extended from 2099-01-02 to 2099-01-03 because the problems require 3 days at 1.5 hours/day.',
    ])
  })
  it('does not extend a deadline when the packed schedule fits', () => {
    const probs = [mk('a', 'Medium'), mk('b', 'Medium')]
    const result = generateSchedule(probs, cfg('2099-01-02', 1.5))

    expect(result.extendedDeadline).toBeUndefined()
    expect(result.warnings).toEqual([])
  })
  it('calculates extensions from unsolved and attempted problems during regeneration', () => {
    const probs = [mk('solved', 'Hard'), mk('attempted', 'Medium'), mk('unsolved', 'Medium'), mk('unsolved-2', 'Medium')]
    const existing: Record<string, ProblemProgress> = {
      solved: { problemId: 'solved', status: 'solved', notes: '', lastUpdated: '2099-01-01', scheduledDate: '2098-01-01', requeueCount: 0 },
      attempted: { problemId: 'attempted', status: 'attempted', notes: '', lastUpdated: '2099-01-01', scheduledDate: '2098-01-02', requeueCount: 0 },
      unsolved: { problemId: 'unsolved', status: 'not-started', notes: '', lastUpdated: '2099-01-01', scheduledDate: '2098-01-03', requeueCount: 0 },
      'unsolved-2': { problemId: 'unsolved-2', status: 'not-started', notes: '', lastUpdated: '2099-01-01', scheduledDate: '2098-01-04', requeueCount: 0 },
    }

    const result = generateSchedule(probs, cfg('2099-01-02', 1.5), existing)

    expect(result.assignments.solved).toBe('2098-01-01')
    expect(result.assignments.attempted).toBe('2099-01-01')
    expect(result.assignments.unsolved).toBe('2099-01-02')
    expect(result.assignments['unsolved-2']).toBe('2099-01-03')
    expect(result.extendedDeadline).toBe('2099-01-03')
    expect(result.warnings).toEqual([
      'Schedule extended from 2099-01-02 to 2099-01-03 because the problems require 3 days at 1.5 hours/day.',
    ])
  })
  it('extends a weekday-only schedule past a weekend with study-day counts', () => {
    const probs = [mk('a', 'Hard'), mk('b', 'Hard'), mk('c', 'Hard')]
    const result = generateSchedule(probs, weekdayCfg('2099-01-05', 1.5, '2099-01-02'))

    expect(result.assignments).toEqual({ a: '2099-01-02', b: '2099-01-05', c: '2099-01-06' })
    expect(result.extendedDeadline).toBe('2099-01-06')
    expect(result.warnings).toEqual([
      'Schedule extended from 2099-01-05 to 2099-01-06 because the problems require 3 days at 1.5 hours/day.',
    ])
  })
  it('preserves solved weekend history while rescheduling active problems on weekdays', () => {
    const probs = [mk('solved', 'Easy'), mk('active', 'Easy')]
    const existing: Record<string, ProblemProgress> = {
      solved: { problemId: 'solved', status: 'solved', notes: '', lastUpdated: '2099-01-01', scheduledDate: '2099-01-04', requeueCount: 0 },
      active: { problemId: 'active', status: 'attempted', notes: '', lastUpdated: '2099-01-01', scheduledDate: '2099-01-02', requeueCount: 0 },
    }
    const { assignments } = generateSchedule(probs, weekdayCfg('2099-01-31', 2, '2099-01-03'), existing)

    expect(assignments.solved).toBe('2099-01-04')
    expect(assignments.active).toBe('2099-01-05')
  })
  it('regeneration preserves solved, reschedules unsolved from startDate', () => {
    const probs = [mk('a', 'Easy'), mk('b', 'Easy')]
    const existing: Record<string, ProblemProgress> = {
      a: { problemId: 'a', status: 'solved', notes: '', lastUpdated: '2099-01-01', scheduledDate: '2099-01-05', requeueCount: 0 },
      b: { problemId: 'b', status: 'not-started', notes: '', lastUpdated: '2099-01-01', scheduledDate: '2099-01-05', requeueCount: 0 },
    }
    const { assignments } = generateSchedule(probs, cfg('2099-12-31', 2, '2099-06-01'), existing)
    expect(assignments.a).toBe('2099-01-05') // preserved (historical)
    expect(assignments.b).toBe('2099-06-01') // rescheduled from chosen start
  })
})

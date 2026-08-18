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
    const { warnings } = generateSchedule(probs, cfg('2099-01-10', 2))
    expect(warnings.length).toBeGreaterThan(0)
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

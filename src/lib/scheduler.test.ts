import { describe, it, expect } from 'vitest'
import { generateSchedule, totalStudyMinutes, DIFFICULTY_MINUTES } from './scheduler'
import type { Problem, ScheduleConfig, ProblemProgress } from '../types'

const mk = (n: string, d: Problem['difficulty']): Problem => ({
  id: n, learningPath: 'DS', topic: 'T', section: 'S', name: n, difficulty: d, url: 'x',
})
const cfg = (deadline: string, hoursPerDay = 2): ScheduleConfig => ({
  deadline, hoursPerDay, weekdaysOnly: false,
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
  it('throws when deadline is in the past', () => {
    expect(() => generateSchedule([mk('a', 'Easy')], cfg('2000-01-01'))).toThrow(/future/)
  })
  it('throws when hoursPerDay < 0.5', () => {
    expect(() => generateSchedule([mk('a', 'Easy')], cfg('2099-01-31', 0))).toThrow(/0.5/)
  })
  it('warns when over capacity', () => {
    const probs = Array.from({ length: 100 }, (_, i) => mk('p' + i, 'Hard'))
    const { warnings } = generateSchedule(probs, cfg('2026-07-10', 2))
    expect(warnings.length).toBeGreaterThan(0)
  })
  it('regeneration preserves solved, reschedules unsolved', () => {
    const probs = [mk('a', 'Easy'), mk('b', 'Easy')]
    const existing: Record<string, ProblemProgress> = {
      a: { problemId: 'a', status: 'solved', notes: '', lastUpdated: '2099-01-01', scheduledDate: '2099-01-05', requeueCount: 0 },
      b: { problemId: 'b', status: 'not-started', notes: '', lastUpdated: '2099-01-01', scheduledDate: '2099-01-05', requeueCount: 0 },
    }
    const { assignments } = generateSchedule(probs, cfg('2099-12-31'), existing)
    expect(assignments.a).toBe('2099-01-05') // preserved
    expect(assignments.b).not.toBe('2099-01-05') // rescheduled
  })
})

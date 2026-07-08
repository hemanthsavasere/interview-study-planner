import { describe, it, expect } from 'vitest'
import { processRequeue } from './requeue'
import type { Problem, ProblemProgress, ScheduleConfig } from '../types'

const cfg: ScheduleConfig = { deadline: '2099-12-31', hoursPerDay: 2, weekdaysOnly: true }
const prob = (id: string): Problem => ({ id, learningPath: 'DS', topic: 'T', section: 'S', name: id, difficulty: 'Easy', url: 'x' })

const solved = (id: string, lastUpdated: string, requeueDate?: string): ProblemProgress => ({
  problemId: id, status: 'solved', notes: '', lastUpdated, scheduledDate: '2099-01-01', requeueDate, requeueCount: 0,
})

describe('requeue', () => {
  it('schedules solved-not-confident to next weekend >=7d out', () => {
    const today = '2099-01-15' // Friday
    const r = processRequeue({ a: solved('a', '2099-01-08') }, [prob('a')], cfg, today)
    expect(r.a.requeueDate).toBeTruthy()
    expect(r.a.requeueCount).toBe(1)
    const d = new Date(r.a.requeueDate + 'T00:00:00')
    expect(d.getDay() === 6 || d.getDay() === 0).toBe(true)
    expect(r.a.requeueDate >= '2099-01-15').toBe(true)
  })
  it('past requeueDate -> reschedule +7d, increment', () => {
    const today = '2099-02-01'
    const r = processRequeue({ a: solved('a', '2099-01-01', '2099-01-10') }, [prob('a')], cfg, today)
    expect(r.a.requeueCount).toBe(1)
    expect(r.a.requeueDate > today).toBe(true)
  })
  it('confident excluded', () => {
    const r = processRequeue({ a: { ...solved('a', '2099-01-01'), status: 'confident' } }, [prob('a')], cfg, '2099-02-01')
    expect(r.a.requeueDate).toBeUndefined()
  })
  it('not-started/attempted excluded', () => {
    const r = processRequeue({ a: { ...solved('a', '2099-01-01'), status: 'attempted' } }, [prob('a')], cfg, '2099-02-01')
    expect(r.a.requeueDate).toBeUndefined()
  })
  it('deadline passed + no unsolved -> daily fallback', () => {
    const today = '2100-01-01'
    const past: ScheduleConfig = { ...cfg, deadline: '2099-12-31' }
    const r = processRequeue({ a: solved('a', '2099-12-01') }, [prob('a')], past, today)
    expect(r.a.requeueDate).toBe('2100-01-02')
  })
  it('no unsolved problems -> daily fallback', () => {
    const today = '2099-06-01'
    const r = processRequeue({ a: solved('a', '2099-05-20') }, [prob('a')], cfg, today)
    expect(r.a.requeueDate).toBe('2099-06-02')
  })
})

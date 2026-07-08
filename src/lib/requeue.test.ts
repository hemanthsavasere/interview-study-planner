import { describe, it, expect } from 'vitest'
import { processRequeue, nextReviewDay, weekendOf } from './requeue'
import type { Problem, ProblemProgress, ScheduleConfig } from '../types'

const cfg: ScheduleConfig = { deadline: '2099-12-31', hoursPerDay: 2, weekdaysOnly: true }
const prob = (id: string): Problem => ({ id, learningPath: 'DS', topic: 'T', section: 'S', name: id, difficulty: 'Easy', url: 'x' })

const solved = (id: string, lastUpdated: string, requeueDate?: string): ProblemProgress => ({
  problemId: id, status: 'solved', notes: '', lastUpdated, scheduledDate: '2099-01-01', requeueDate, requeueCount: 0,
})

describe('requeue', () => {
  it('schedules solved-not-confident to next weekend >=7d out', () => {
    const today = '2099-01-15' // Friday
    const r = processRequeue({ a: solved('a', '2099-01-08'), b: { problemId: 'b', status: 'not-started', notes: '', lastUpdated: '2099-01-01', scheduledDate: '2099-01-01' } }, [prob('a'), prob('b')], cfg, today)
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
  it('missed review (weekly cadence) lands on a weekend >= today', () => {
    const today = '2099-01-13'
    const r = processRequeue(
      {
        a: solved('a', '2099-01-01', '2099-01-05'),
        b: { problemId: 'b', status: 'not-started', notes: '', lastUpdated: '2099-01-01', scheduledDate: '2099-01-01' },
      },
      [prob('a'), prob('b')],
      cfg,
      today,
    )
    expect(r.a.requeueCount).toBe(1)
    const wd = new Date(r.a.requeueDate + 'T12:00:00').getDay()
    expect(wd === 6 || wd === 0).toBe(true)
    expect(r.a.requeueDate >= today).toBe(true)
  })
  it('deadline passed + no unsolved -> daily fallback lands on weekend', () => {
    const today = '2100-01-01' // Friday
    expect(new Date(today + 'T12:00:00').getDay()).toBe(5)
    const past: ScheduleConfig = { ...cfg, deadline: '2099-12-31' }
    const r = processRequeue({ a: solved('a', '2099-12-01') }, [prob('a')], past, today)
    expect(r.a.requeueDate).toBe('2100-01-02') // Saturday
    expect(new Date(r.a.requeueDate + 'T12:00:00').getDay()).toBe(6)
  })
  it('no unsolved problems -> daily fallback lands on weekend', () => {
    const today = '2099-06-01' // Monday
    expect(new Date(today + 'T12:00:00').getDay()).toBe(1)
    const r = processRequeue({ a: solved('a', '2099-05-20') }, [prob('a')], cfg, today)
    expect(r.a.requeueDate).toBe('2099-06-06')
    expect(new Date(r.a.requeueDate + 'T12:00:00').getDay()).toBe(6)
  })
})

describe('nextReviewDay', () => {
  it('Wednesday -> next Saturday', () => {
    expect(new Date('2099-01-14T12:00:00').getDay()).toBe(3)
    expect(nextReviewDay('2099-01-14')).toBe('2099-01-17')
  })
  it('Friday -> next Saturday', () => {
    // 2099-01-16 is a Friday
    expect(new Date('2099-01-16T12:00:00').getDay()).toBe(5)
    expect(nextReviewDay('2099-01-16')).toBe('2099-01-17')
  })
  it('Saturday -> following Sunday', () => {
    // 2099-01-17 is a Saturday
    expect(new Date('2099-01-17T12:00:00').getDay()).toBe(6)
    expect(nextReviewDay('2099-01-17')).toBe('2099-01-18')
  })
  it('Sunday -> next Saturday', () => {
    // 2099-01-18 is a Sunday
    expect(new Date('2099-01-18T12:00:00').getDay()).toBe(0)
    expect(nextReviewDay('2099-01-18')).toBe('2099-01-24')
  })
})

describe('weekendOf', () => {
  it('mid-week Wednesday -> this Sat/Sun', () => {
    // 2099-01-14 is a Wednesday
    expect(weekendOf('2099-01-14')).toEqual({ sat: '2099-01-17', sun: '2099-01-18' })
  })
  it('on-Saturday -> same Sat/Sun', () => {
    expect(weekendOf('2099-01-17')).toEqual({ sat: '2099-01-17', sun: '2099-01-18' })
  })
  it('on-Sunday -> same weekend (yesterday Sat / today Sun)', () => {
    expect(weekendOf('2099-01-18')).toEqual({ sat: '2099-01-17', sun: '2099-01-18' })
  })
  it('on-Monday -> this coming Sat/Sun', () => {
    // 2099-01-12 is a Monday
    expect(new Date('2099-01-12T12:00:00').getDay()).toBe(1)
    expect(weekendOf('2099-01-12')).toEqual({ sat: '2099-01-17', sun: '2099-01-18' })
  })
})

import { describe, it, expect } from 'vitest'
import { applyAssignments } from './assignments'
import type { ProblemProgress } from '../types'

const solved = (id: string, scheduledDate: string, notes = ''): ProblemProgress => ({
  problemId: id, status: 'solved', notes, lastUpdated: '2099-01-01', scheduledDate, requeueCount: 0,
})
const unsolved = (id: string, scheduledDate: string, status: ProblemProgress['status'] = 'not-started'): ProblemProgress => ({
  problemId: id, status, notes: '', lastUpdated: '2099-01-01', scheduledDate, requeueCount: 0,
})

describe('applyAssignments', () => {
  it('reassigns scheduledDate for unsolved problems (overrides old date)', () => {
    const { progress } = applyAssignments(
      { b: unsolved('b', '2099-01-05') },
      { b: '2099-06-01' },
      '2099-06-01T00:00:00Z',
    )
    expect(progress.b.scheduledDate).toBe('2099-06-01')
    expect(progress.b.status).toBe('not-started')
  })

  it('preserves solved status and notes', () => {
    const { progress } = applyAssignments(
      { a: solved('a', '2099-01-05', 'nice') },
      { a: '2099-01-05' },
      '2099-06-01T00:00:00Z',
    )
    expect(progress.a.scheduledDate).toBe('2099-01-05')
    expect(progress.a.status).toBe('solved')
    expect(progress.a.notes).toBe('nice')
  })

  it('preserves lastUpdated on existing progress', () => {
    const { progress } = applyAssignments(
      { a: solved('a', '2099-01-05') },
      { a: '2099-06-01' },
      '2099-06-01T00:00:00Z',
    )
    expect(progress.a.lastUpdated).toBe('2099-01-01')
  })

  it('preserves attempted status while rescheduling', () => {
    const { progress } = applyAssignments(
      { c: unsolved('c', '2099-01-05', 'attempted') },
      { c: '2099-06-02' },
      '2099-06-01T00:00:00Z',
    )
    expect(progress.c.status).toBe('attempted')
    expect(progress.c.scheduledDate).toBe('2099-06-02')
  })

  it('adds new problems with defaults', () => {
    const { progress } = applyAssignments({}, { d: '2099-06-03' }, '2099-06-01T00:00:00Z')
    expect(progress.d).toMatchObject({
      problemId: 'd', status: 'not-started', notes: '', scheduledDate: '2099-06-03', requeueCount: 0,
    })
  })

  it('keeps generatedAt', () => {
    const { generatedAt } = applyAssignments({}, {}, '2099-06-01T00:00:00Z')
    expect(generatedAt).toBe('2099-06-01T00:00:00Z')
  })
})

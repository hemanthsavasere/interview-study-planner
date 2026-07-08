import { describe, it, expect } from 'vitest'
import { flattenProblems, sectionStats, nodeStats } from './stats'
import type { Problem, ProblemProgress } from '../types'

const p = (id: string): Problem => ({
  id, learningPath: 'DS', topic: 'T', section: 'S', name: id, difficulty: 'Easy', url: 'x',
})
const pr = (id: string, status: ProblemProgress['status']): ProblemProgress => ({
  problemId: id, status, notes: '', lastUpdated: '2099-01-01', requeueCount: 0,
})

describe('flattenProblems', () => {
  it('flattens nested topic→section→problem', () => {
    const tree = {
      A: { X: [p('1'), p('2')], Y: [p('3')] },
      B: { Z: [p('4')] },
    }
    expect(flattenProblems(tree).map(x => x.id)).toEqual(['1', '2', '3', '4'])
  })
  it('empty tree -> []', () => {
    expect(flattenProblems({})).toEqual([])
  })
})

describe('sectionStats', () => {
  it('counts solved/confident/total + masteryPct', () => {
    const probs = [p('1'), p('2'), p('3'), p('4')]
    const progress = {
      '1': pr('1', 'solved'),
      '2': pr('2', 'confident'),
      '3': pr('3', 'attempted'),
      '4': pr('4', 'not-started'),
    }
    expect(sectionStats(probs, progress)).toEqual({ solved: 2, confident: 1, total: 4, masteryPct: 25 })
  })
  it('empty problems -> zeros', () => {
    expect(sectionStats([], {})).toEqual({ solved: 0, confident: 0, total: 0, masteryPct: 0 })
  })
})

describe('nodeStats', () => {
  it('counts solved+total only', () => {
    const probs = [p('1'), p('2'), p('3')]
    const progress = { '1': pr('1', 'solved'), '2': pr('2', 'confident'), '3': pr('3', 'attempted') }
    expect(nodeStats(probs, progress)).toEqual({ solved: 2, total: 3 })
  })
  it('missing progress entry counts as not solved', () => {
    expect(nodeStats([p('1')], {})).toEqual({ solved: 0, total: 1 })
  })
})

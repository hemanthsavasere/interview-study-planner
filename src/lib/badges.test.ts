import { describe, it, expect } from 'vitest'
import { difficultyClass, statusClass, STATUS_LABEL } from './badges'
import type { Difficulty, Status } from '../types'

describe('difficultyClass', () => {
  const cases: [Difficulty, RegExp][] = [
    ['Easy', /--diff-easy-bg/],
    ['Medium', /--diff-medium-bg/],
    ['Hard', /--diff-hard-bg/],
    ['Fundamental', /--diff-fundamental-bg/],
  ]
  for (const [d, re] of cases) {
    it(`${d} returns token bg + fg classes`, () => {
      const cls = difficultyClass(d)
      expect(cls).toMatch(re)
      expect(cls).toMatch(new RegExp(re.source.replace('bg', 'fg')))
    })
  }
})

describe('statusClass', () => {
  const cases: [Status, RegExp][] = [
    ['not-started', /--status-todo-bg/],
    ['attempted', /--status-tried-bg/],
    ['solved', /--status-solved-bg/],
    ['confident', /--status-mastered-bg/],
  ]
  for (const [s, re] of cases) {
    it(`${s} returns token bg + fg classes`, () => {
      const cls = statusClass(s)
      expect(cls).toMatch(re)
      expect(cls).toMatch(new RegExp(re.source.replace('bg', 'fg')))
    })
  }
})

describe('STATUS_LABEL', () => {
  it('maps every status to a short label', () => {
    expect(STATUS_LABEL).toEqual({
      'not-started': 'Todo',
      'attempted': 'Tried',
      'solved': 'Solved',
      'confident': 'Mastered',
    })
  })
})

import { describe, it, expect } from 'vitest'
import { parseProblems, slugify } from './parseProblems'

const CSV = `Learning Path,Topic,Section,Problem Name,Difficulty,URL
Data Structures,Array,Pattern: Two Pointers,Flip Characters,Easy,https://x/y
Data Structures,Array,Pattern: Two Pointers,Flip Characters,Easy,https://x/z
Algorithms,DP,Basic,Three Sum,Medium,https://x/w`

describe('parseProblems', () => {
  it('maps columns to Problem fields', () => {
    const p = parseProblems(CSV)
    expect(p).toHaveLength(3)
    expect(p[0]).toMatchObject({
      learningPath: 'Data Structures', topic: 'Array',
      section: 'Pattern: Two Pointers', name: 'Flip Characters',
      difficulty: 'Easy', url: 'https://x/y',
    })
  })
  it('slugifies id and dedupes collisions', () => {
    const p = parseProblems(CSV)
    expect(p[0].id).toBe('flip-characters')
    expect(p[1].id).toBe('flip-characters-2')
  })
  it('skips rows with unknown difficulty', () => {
    const bad = CSV + '\nData Structures,X,Y,Z,Banana,https://x'
    expect(parseProblems(bad)).toHaveLength(3)
  })
  it('slugify trims and kebab-cases', () => {
    expect(slugify('  Three Sum! ')).toBe('three-sum')
  })
})

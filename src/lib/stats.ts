import type { Problem, ProblemProgress } from '../types'

export function flattenProblems(topics: Record<string, Record<string, Problem[]>>): Problem[] {
  const all: Problem[] = []
  for (const sections of Object.values(topics)) {
    for (const probs of Object.values(sections)) {
      for (const p of probs) all.push(p)
    }
  }
  return all
}

export function sectionStats(problems: Problem[], progress: Record<string, ProblemProgress>) {
  let solved = 0, confident = 0
  for (const p of problems) {
    const s = progress[p.id]?.status
    if (s === 'solved' || s === 'confident') solved++
    if (s === 'confident') confident++
  }
  const total = problems.length
  return { solved, confident, total, masteryPct: total ? Math.round((confident / total) * 100) : 0 }
}

export function nodeStats(problems: Problem[], progress: Record<string, ProblemProgress>) {
  let total = 0, solved = 0
  for (const p of problems) {
    total++
    const s = progress[p.id]?.status
    if (s === 'solved' || s === 'confident') solved++
  }
  return { solved, total }
}

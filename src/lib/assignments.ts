import type { ProblemProgress } from '../types'

export function isActiveAssignment(progress: ProblemProgress): boolean {
  return progress.status === 'not-started' || progress.status === 'attempted'
}

export function applyAssignments(
  progress: Record<string, ProblemProgress>,
  assignments: Record<string, string>,
  generatedAt: string,
): { progress: Record<string, ProblemProgress>; generatedAt: string } {
  const next = { ...progress }
  for (const [id, date] of Object.entries(assignments)) {
    next[id] = {
      problemId: id, status: 'not-started', notes: '', requeueCount: 0,
      ...progress[id],
      scheduledDate: date,
      lastUpdated: progress[id]?.lastUpdated ?? new Date().toISOString(),
    }
  }
  return { progress: next, generatedAt }
}

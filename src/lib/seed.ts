import type { AppState } from '../types'
export function seedState(problems: { id: string }[]): AppState {
  const today = new Date().toISOString().slice(0, 10)
  const progress: AppState['progress'] = {}
  problems.slice(0, 5).forEach(p => {
    progress[p.id] = { problemId: p.id, status: 'not-started', notes: '', lastUpdated: today, scheduledDate: today, requeueCount: 0 }
  })
  return { schemaVersion: 1, config: { deadline: '', hoursPerDay: 2, weekdaysOnly: true }, progress, generatedAt: today }
}

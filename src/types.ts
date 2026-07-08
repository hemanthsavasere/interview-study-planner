export type Difficulty = 'Fundamental' | 'Easy' | 'Medium' | 'Hard'
export type Status = 'not-started' | 'attempted' | 'solved' | 'confident'

export interface Problem {
  id: string; learningPath: string; topic: string; section: string
  name: string; difficulty: Difficulty; url: string
}
export interface ProblemProgress {
  problemId: string; status: Status; notes: string; lastUpdated: string
  scheduledDate?: string; requeueDate?: string; requeueCount: number
}
export interface ScheduleConfig {
  deadline: string; hoursPerDay: number; weekdaysOnly: boolean
}
export interface AppState {
  schemaVersion: number; config: ScheduleConfig
  progress: Record<string, ProblemProgress>; generatedAt: string
}

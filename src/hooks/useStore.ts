import { useCallback, useEffect, useState } from 'react'
import type { AppState, ProblemProgress, ScheduleConfig } from '../types'
import { loadState, saveState, freshState } from '../lib/storage'

export function useStore() {
  const [state, setState] = useState<AppState>(() => loadState())

  useEffect(() => { saveState(state) }, [state])

  const updateProgress = useCallback((problemId: string, patch: Partial<ProblemProgress>) => {
    setState(s => ({
      ...s,
      progress: {
        ...s.progress,
        [problemId]: {
          problemId, status: 'not-started', notes: '', lastUpdated: new Date().toISOString(),
          requeueCount: 0, ...s.progress[problemId], ...patch,
        },
      },
    }))
  }, [])

  const setConfig = useCallback((config: ScheduleConfig) => {
    setState(s => ({ ...s, config }))
  }, [])

  const applyAssignments = useCallback((assignments: Record<string, string>, generatedAt: string) => {
    setState(s => {
      const progress = { ...s.progress }
      for (const [id, date] of Object.entries(assignments)) {
        progress[id] = {
          problemId: id, status: 'not-started', notes: '',
          lastUpdated: new Date().toISOString(), scheduledDate: date, requeueCount: 0,
          ...s.progress[id],
        }
      }
      return { ...s, progress, generatedAt }
    })
  }, [])

  const resetAll = useCallback(() => setState(freshState()), [])
  const loadFromImport = useCallback((imp: AppState) => setState(imp), [])

  return { state, updateProgress, setConfig, applyAssignments, resetAll, loadFromImport }
}

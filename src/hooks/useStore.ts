import { useCallback, useEffect, useState } from 'react'
import type { AppState, Problem, ProblemProgress, ScheduleConfig } from '../types'
import { loadState, saveState, freshState } from '../lib/storage'
import { processRequeue } from '../lib/requeue'

function todayISO() { return new Date().toISOString().slice(0, 10) }

export function useStore(problems: Problem[]) {
  const [state, setState] = useState<AppState>(() => loadState())

  useEffect(() => { saveState(state) }, [state])

  useEffect(() => {
    setState(s => ({ ...s, progress: processRequeue(s.progress, problems, s.config, todayISO()) }))
  }, [])

  const updateProgress = useCallback((problemId: string, patch: Partial<ProblemProgress>) => {
    setState(s => {
      const merged = {
        ...s.progress[problemId],
        problemId, status: 'not-started', notes: '', lastUpdated: new Date().toISOString(), requeueCount: 0,
        ...s.progress[problemId], ...patch,
      } as ProblemProgress
      const next = { ...s, progress: { ...s.progress, [problemId]: merged } }
      return { ...next, progress: processRequeue(next.progress, problems, next.config, todayISO()) }
    })
  }, [problems])

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

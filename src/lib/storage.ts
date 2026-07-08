import type { AppState } from '../types'
export const SCHEMA_VERSION = 1
const KEY = 'isp-state'

export function freshState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    config: { deadline: '', hoursPerDay: 2, weekdaysOnly: true },
    progress: {}, generatedAt: '',
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return freshState()
    const parsed = JSON.parse(raw) as AppState
    if (parsed.schemaVersion !== SCHEMA_VERSION) return freshState()
    return parsed
  } catch {
    return freshState()
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(KEY, JSON.stringify(state))
}

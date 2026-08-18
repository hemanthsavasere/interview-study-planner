import { describe, it, expect, beforeEach } from 'vitest'
import { loadState, saveState, freshState, SCHEMA_VERSION } from './storage'

beforeEach(() => localStorage.clear())

describe('storage', () => {
  it('freshState has current schemaVersion', () => {
    expect(freshState().schemaVersion).toBe(SCHEMA_VERSION)
  })
  it('loadState returns fresh when empty', () => {
    expect(loadState()).toEqual(freshState())
  })
  it('save then load round-trips', () => {
    const s = freshState(); s.config.deadline = '2099-12-31'
    saveState(s)
    expect(loadState().config.deadline).toBe('2099-12-31')
  })
  it('freshState sets startDate to empty string', () => {
    expect(freshState().config.startDate).toBe('')
  })
  it('save then load round-trips startDate', () => {
    const s = freshState(); s.config.startDate = '2099-06-01'
    saveState(s)
    expect(loadState().config.startDate).toBe('2099-06-01')
  })
  it('loadState tolerates persisted state without startDate', () => {
    const legacy = freshState(); delete (legacy.config as { startDate?: string }).startDate
    saveState(legacy)
    const loaded = loadState()
    expect(loaded.config.startDate).toBeUndefined()
  })
  it('corrupt JSON -> fresh', () => {
    localStorage.setItem('isp-state', '{not json')
    expect(loadState()).toEqual(freshState())
  })
  it('schema mismatch -> fresh', () => {
    localStorage.setItem('isp-state', JSON.stringify({ ...freshState(), schemaVersion: 999 }))
    expect(loadState()).toEqual(freshState())
  })
})

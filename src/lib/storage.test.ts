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
  it('corrupt JSON -> fresh', () => {
    localStorage.setItem('isp-state', '{not json')
    expect(loadState()).toEqual(freshState())
  })
  it('schema mismatch -> fresh', () => {
    localStorage.setItem('isp-state', JSON.stringify({ ...freshState(), schemaVersion: 999 }))
    expect(loadState()).toEqual(freshState())
  })
})

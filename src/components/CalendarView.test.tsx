import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CalendarView } from './CalendarView'
import { applyAssignments } from '../lib/assignments'
import { generateSchedule } from '../lib/scheduler'
import { addDaysISO, todayISO } from '../lib/date'
import type { AppState, Problem, ProblemProgress } from '../types'
import type { useStore } from '../hooks/useStore'

describe('CalendarView', () => {
  it('hides a solved problem retained as schedule history after regeneration', () => {
    const today = todayISO()
    const problems: Problem[] = [
      { id: 'solved', learningPath: 'DS', topic: 'T', section: 'S', name: 'Solved problem', difficulty: 'Easy', url: 'x' },
      { id: 'open', learningPath: 'DS', topic: 'T', section: 'S', name: 'Open problem', difficulty: 'Easy', url: 'x' },
    ]
    const existing: Record<string, ProblemProgress> = {
      solved: { problemId: 'solved', status: 'solved', notes: '', lastUpdated: today, scheduledDate: today, requeueCount: 0 },
      open: { problemId: 'open', status: 'not-started', notes: '', lastUpdated: today, scheduledDate: today, requeueCount: 0 },
    }
    const config = { startDate: addDaysISO(today, 1), deadline: addDaysISO(today, 30), hoursPerDay: 2, weekdaysOnly: false }
    const { assignments } = generateSchedule(problems, config, existing)
    const progress = applyAssignments(existing, assignments, `${today}T00:00:00Z`).progress
    expect(progress.solved.scheduledDate).toBe(today)
    expect(progress.open.scheduledDate).toBe(addDaysISO(today, 1))
    const state: AppState = { schemaVersion: 1, config, progress, generatedAt: `${today}T00:00:00Z` }
    const store = {
      state,
      updateProgress: vi.fn(),
      setConfig: vi.fn(),
      applyAssignments: vi.fn(),
      resetAll: vi.fn(),
      loadFromImport: vi.fn(),
    } as unknown as ReturnType<typeof useStore>

    const { container } = render(<CalendarView problems={problems} store={store} />)
    const day = String(new Date(`${today}T12:00:00`).getDate())
    const dayButton = [...container.querySelectorAll('button')]
      .find(button => button.querySelector('span')?.textContent === day)
    expect(dayButton).toBeDefined()
    fireEvent.click(dayButton!)

    expect(screen.queryByText('Solved problem')).not.toBeInTheDocument()
  })
})

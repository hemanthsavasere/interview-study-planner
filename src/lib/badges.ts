import type { Difficulty, Status } from '../types'

export function difficultyClass(diff: Difficulty): string {
  switch (diff) {
    case 'Easy': return 'bg-[var(--diff-easy-bg)] text-[var(--diff-easy-fg)]'
    case 'Medium': return 'bg-[var(--diff-medium-bg)] text-[var(--diff-medium-fg)]'
    case 'Hard': return 'bg-[var(--diff-hard-bg)] text-[var(--diff-hard-fg)]'
    case 'Fundamental': return 'bg-[var(--diff-fundamental-bg)] text-[var(--diff-fundamental-fg)]'
  }
}

export function statusClass(status: Status): string {
  switch (status) {
    case 'not-started': return 'bg-[var(--status-todo-bg)] text-[var(--status-todo-fg)]'
    case 'attempted': return 'bg-[var(--status-tried-bg)] text-[var(--status-tried-fg)]'
    case 'solved': return 'bg-[var(--status-solved-bg)] text-[var(--status-solved-fg)]'
    case 'confident': return 'bg-[var(--status-mastered-bg)] text-[var(--status-mastered-fg)]'
  }
}

export const STATUS_LABEL: Record<Status, string> = {
  'not-started': 'Todo',
  'attempted': 'Tried',
  'solved': 'Solved',
  'confident': 'Mastered',
}

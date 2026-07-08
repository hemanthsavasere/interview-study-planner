import type { AppState, Problem } from '../types'

export async function syncToFiles(state: AppState, problems: Problem[]): Promise<{ ok: boolean; error?: string }> {
  const notes: Record<string, string> = {}
  const byId = new Map(problems.map(p => [p.id, p]))
  for (const p of Object.values(state.progress)) {
    if (!p.notes.trim()) continue
    const prob = byId.get(p.problemId); if (!prob) continue
    const rel = `notes/${prob.learningPath}/${prob.topic}/${p.problemId}.md`
    notes[rel] = p.notes
  }
  const res = await fetch('/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progress: state, notes }) })
  return res.json()
}

export async function loadFromFiles(): Promise<AppState | null> {
  const res = await fetch('/load')
  if (!res.ok) return null
  return res.json()
}

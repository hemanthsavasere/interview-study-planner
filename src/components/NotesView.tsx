import ReactMarkdown from 'react-markdown'
import { useState, useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Input } from './ui/input'
import { Button } from './ui/button'
import type { Problem, Difficulty, Status } from '../types'
import type { ProblemProgress } from '../types'

const STATUS_LABEL: Record<string, string> = {
  'not-started': 'Todo',
  'attempted': 'Tried',
  'solved': 'Solved',
  'confident': 'Mastered',
}

const DIFF_COLOR: Record<string, string> = {
  Easy: 'bg-green-500', Medium: 'bg-amber-500', Hard: 'bg-red-500', Fundamental: 'bg-slate-500',
}

const STATUS_COLOR: Record<string, string> = {
  'not-started': 'bg-gray-300 text-gray-700',
  'attempted': 'bg-yellow-300 text-yellow-800',
  'solved': 'bg-blue-500 text-white',
  'confident': 'bg-green-600 text-white',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function NotesView({ problems, store }: {
  problems: Problem[]
  store: ReturnType<typeof import('../hooks/useStore').useStore>
}) {
  const [topicFilter, setTopicFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const byId = useMemo(() => new Map(problems.map(p => [p.id, p])), [problems])

  const noted = useMemo(() =>
    Object.values(store.state.progress).filter(p => p.notes.trim()),
  [store.state.progress])

  const topics = useMemo(() =>
    [...new Set(noted.map(p => byId.get(p.problemId)?.topic).filter(Boolean))].sort() as string[],
  [noted, byId])

  const difficulties: Difficulty[] = ['Fundamental', 'Easy', 'Medium', 'Hard']
  const statuses: Status[] = ['not-started', 'attempted', 'solved', 'confident']

  const filtered = useMemo(() =>
    noted.filter(p => {
      const prob = byId.get(p.problemId)
      if (!prob) return false
      if (topicFilter && prob.topic !== topicFilter) return false
      if (statusFilter && p.status !== statusFilter) return false
      if (difficultyFilter && prob.difficulty !== difficultyFilter) return false
      if (search && !prob.name.toLowerCase().includes(search.toLowerCase()) && !p.notes.toLowerCase().includes(search.toLowerCase()))
        return false
      return true
    }),
  [noted, byId, topicFilter, statusFilter, difficultyFilter, search])

  function startEdit(id: string, current: string) {
    setEditing(id)
    setDraft(current)
  }

  function saveEdit(id: string) {
    store.updateProgress(id, { notes: draft, lastUpdated: new Date().toISOString() })
    setEditing(null)
    setDraft('')
  }

  function cancelEdit() {
    setEditing(null)
    setDraft('')
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Notes</h2>

      <div className="flex flex-wrap gap-3 items-center">
        <Select value={topicFilter} onValueChange={setTopicFilter}>
          <SelectTrigger size="sm" className="w-40">
            <SelectValue placeholder="All topics" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All topics</SelectItem>
            {topics.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger size="sm" className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            {statuses.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s] ?? s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger size="sm" className="w-40">
            <SelectValue placeholder="All difficulties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All difficulties</SelectItem>
            {difficulties.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>

        <Input
          placeholder="Search by name or notes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />

        {(topicFilter || statusFilter || difficultyFilter || search) && (
          <Button variant="ghost" size="xs" onClick={() => { setTopicFilter(''); setStatusFilter(''); setDifficultyFilter(''); setSearch('') }}>
            Clear filters
          </Button>
        )}
      </div>

      {noted.length === 0 ? (
        <p className="text-muted-foreground">No notes yet. Add notes to problems to see them here.</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No notes match your filters.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map(p => {
            const prob = byId.get(p.problemId)
            if (!prob) return null
            const isEditing = editing === p.problemId
            return (
              <div key={p.problemId} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => window.open(prob.url, '_blank')}
                      className="font-semibold text-left hover:underline"
                    >
                      {prob.name}
                    </button>
                    <span className={`text-xs px-1.5 py-0.5 rounded text-white ${DIFF_COLOR[prob.difficulty]}`}>
                      {prob.difficulty}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_COLOR[p.status]}`}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                    <span className="text-xs text-muted-foreground">{prob.topic}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDate(p.lastUpdated)}
                  </span>
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      className="w-full min-h-32 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none"
                    />
                    <div className="flex gap-2">
                      <Button size="xs" onClick={() => saveEdit(p.problemId)}>Save</Button>
                      <Button size="xs" variant="ghost" onClick={cancelEdit}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                      <ReactMarkdown>{p.notes}</ReactMarkdown>
                    </div>
                    <Button size="xs" variant="outline" className="mt-2" onClick={() => startEdit(p.problemId, p.notes)}>
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

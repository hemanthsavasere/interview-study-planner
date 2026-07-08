import ReactMarkdown from 'react-markdown'
import { useState, useMemo } from 'react'
import { Search, Filter, CircleDot, Signal, X, Pencil, Check, StickyNote } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card, CardContent } from './ui/card'
import type { Problem, Difficulty, Status } from '../types'
import { difficultyClass, statusClass, STATUS_LABEL } from '../lib/badges'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
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

  const anyFilter = !!(topicFilter || statusFilter || difficultyFilter || search)

  function startEdit(id: string, current: string) { setEditing(id); setDraft(current) }
  function saveEdit(id: string) {
    store.updateProgress(id, { notes: draft, lastUpdated: new Date().toISOString() })
    setEditing(null); setDraft('')
  }
  function cancelEdit() { setEditing(null); setDraft('') }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3 flex flex-wrap gap-3 items-center">
          <Select value={topicFilter} onValueChange={setTopicFilter}>
            <SelectTrigger size="sm" className="w-44">
              <Filter className="size-4" /><SelectValue placeholder="All topics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All topics</SelectItem>
              {topics.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger size="sm" className="w-44">
              <CircleDot className="size-4" /><SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              {statuses.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger size="sm" className="w-44">
              <Signal className="size-4" /><SelectValue placeholder="All difficulties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All difficulties</SelectItem>
              {difficulties.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 max-w-xs" />
          </div>

          {anyFilter && (
            <Button variant="ghost" size="sm" onClick={() => { setTopicFilter(''); setStatusFilter(''); setDifficultyFilter(''); setSearch('') }}>
              <X className="size-4" /> Clear
            </Button>
          )}
        </CardContent>
      </Card>

      {noted.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-muted-foreground">
          <StickyNote className="size-10 mb-2 text-primary/60" />
          <p className="text-sm">No notes yet. Add notes to problems to see them here.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes match your filters.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map(p => {
            const prob = byId.get(p.problemId)
            if (!prob) return null
            const isEditing = editing === p.problemId
            return (
              <Card key={p.problemId}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => window.open(prob.url, '_blank', 'noopener,noreferrer')}
                        className="font-semibold text-left hover:text-primary hover:underline">
                        {prob.name}
                      </button>
                      <Badge className={difficultyClass(prob.difficulty)}>{prob.difficulty}</Badge>
                      <Badge className={statusClass(p.status)}>{STATUS_LABEL[p.status]}</Badge>
                      <span className="text-xs bg-muted text-muted-foreground rounded-full px-2">{prob.topic}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{formatDate(p.lastUpdated)}</span>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea value={draft} onChange={e => setDraft(e.target.value)}
                        className="w-full min-h-32 rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(p.problemId)}><Check className="size-4" /> Save</Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="size-4" /> Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="border-l-2 border-primary/30 pl-3 text-sm leading-relaxed text-foreground/90">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{p.notes}</ReactMarkdown>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => startEdit(p.problemId, p.notes)}>
                        <Pencil className="size-4" /> Edit
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

type Tab = 'today' | 'calendar' | 'topics' | 'notes' | 'settings'
export function Sidebar({ active, onTab, solved, total }: {
  active: Tab; onTab: (t: Tab) => void; solved: number; total: number
}) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'today', label: 'Today' }, { id: 'calendar', label: 'Calendar' },
    { id: 'topics', label: 'Topics' }, { id: 'notes', label: 'Notes' },
    { id: 'settings', label: 'Settings' },
  ]
  const pct = total ? Math.round((solved / total) * 100) : 0
  return (
    <aside className="w-60 border-r p-4 flex flex-col">
      <h1 className="text-lg font-bold mb-6">Interview Planner</h1>
      <nav className="flex-1 space-y-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => onTab(t.id)}
            className={`w-full text-left px-3 py-2 rounded ${active === t.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
            {t.label}
          </button>
        ))}
      </nav>
      <footer className="text-sm text-muted-foreground">{solved}/{total} solved ({pct}%)</footer>
    </aside>
  )
}

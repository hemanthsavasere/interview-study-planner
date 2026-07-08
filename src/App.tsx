import { useState } from 'react'
import { useStore } from './hooks/useStore'
import { parseProblems } from './lib/parseProblems'
import csv from './data/problems.csv?raw'
import { Sidebar } from './components/Sidebar'
import { TodayView } from './components/TodayView'
import { CalendarView } from './components/CalendarView'
import { SettingsView } from './components/SettingsView'
import { TopicsView } from './components/TopicsView'
const problems = parseProblems(csv)

export default function App() {
  const store = useStore(problems)
  const [tab, setTab] = useState<'today' | 'calendar' | 'topics' | 'notes' | 'settings'>('today')
  const solved = Object.values(store.state.progress).filter(p => p.status === 'solved' || p.status === 'confident').length

  return (
    <div className="flex h-screen">
      <Sidebar active={tab} onTab={setTab} solved={solved} total={problems.length} />
      <main className="flex-1 overflow-auto p-6">
        {tab === 'today' ? <TodayView problems={problems} store={store} />
         : tab === 'calendar' ? <CalendarView problems={problems} store={store} />
         : tab === 'topics' ? <TopicsView problems={problems} store={store} />
         : tab === 'settings' ? <SettingsView problems={problems} store={store} />
          : <p className="text-muted-foreground">Coming soon</p>}
      </main>
    </div>
  )
}

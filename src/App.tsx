import { useState } from 'react'
import { toast } from 'sonner'
import { useStore } from './hooks/useStore'
import { parseProblems } from './lib/parseProblems'
import csv from './data/problems.csv?raw'
import { Sidebar, type Tab } from './components/Sidebar'
import { AppHeader } from './components/AppHeader'
import { TodayView } from './components/TodayView'
import { ReviewsView } from './components/ReviewsView'
import { CalendarView } from './components/CalendarView'
import { SettingsView } from './components/SettingsView'
import { TopicsView } from './components/TopicsView'
import { NotesView } from './components/NotesView'

const { problems, skipped } = parseProblems(csv)
if (skipped > 0) toast.warning(`${skipped} CSV rows skipped`)

const TITLES: Record<Tab, string> = {
  today: 'Today', reviews: 'Reviews', calendar: 'Calendar', topics: 'Topics', notes: 'Notes', settings: 'Settings',
}

export default function App() {
  const store = useStore(problems)
  const [tab, setTab] = useState<Tab>('today')
  const solved = Object.values(store.state.progress).filter(p => p.status === 'solved' || p.status === 'confident').length

  return (
    <div className="flex h-screen">
      <Sidebar active={tab} onTab={setTab} solved={solved} total={problems.length} />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader title={TITLES[tab]} solved={solved} total={problems.length} />
        <main className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
            {tab === 'today' ? <TodayView problems={problems} store={store} />
              : tab === 'reviews' ? <ReviewsView problems={problems} store={store} />
              : tab === 'calendar' ? <CalendarView problems={problems} store={store} />
              : tab === 'topics' ? <TopicsView problems={problems} store={store} />
              : tab === 'notes' ? <NotesView problems={problems} store={store} />
              : <SettingsView problems={problems} store={store} />}
          </div>
        </main>
      </div>
    </div>
  )
}

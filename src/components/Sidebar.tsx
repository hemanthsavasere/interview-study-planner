import type { ComponentType } from 'react'
import { CalendarDays, CalendarRange, Layers, StickyNote, Settings, Sun, Moon, RotateCw } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Progress } from './ui/progress'
import { cn } from '../lib/utils'

export type Tab = 'today' | 'reviews' | 'calendar' | 'topics' | 'notes' | 'settings'

const TABS: { id: Tab; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'today', label: 'Today', icon: CalendarDays },
  { id: 'reviews', label: 'Reviews', icon: RotateCw },
  { id: 'calendar', label: 'Calendar', icon: CalendarRange },
  { id: 'topics', label: 'Topics', icon: Layers },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ active, onTab, solved, total }: {
  active: Tab; onTab: (t: Tab) => void; solved: number; total: number
}) {
  const { resolvedTheme, setTheme } = useTheme()
  const pct = total ? Math.round((solved / total) * 100) : 0
  return (
    <aside className="w-60 border-r flex flex-col bg-background">
      <div className="flex items-center gap-2 px-4 h-14 border-b">
        <span className="bg-primary rounded-md size-5" />
        <span className="font-bold tracking-tight">Interview Planner</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {TABS.map(t => {
          const Icon = t.icon
          const on = active === t.id
          return (
            <button key={t.id} onClick={() => onTab(t.id)} aria-current={on ? 'page' : undefined}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm border-l-2 transition-colors',
                on
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'border-transparent hover:bg-accent text-muted-foreground',
              )}>
              <Icon className="size-4" />
              <span>{t.label}</span>
            </button>
          )
        })}
      </nav>
      <footer className="p-3 border-t space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span className="tabular-nums">{solved}/{total}</span>
          </div>
          <Progress value={pct} className="h-2" />
          <div className="text-xs text-muted-foreground text-right tabular-nums">{pct}%</div>
        </div>
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent text-muted-foreground"
        >
          {resolvedTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          <span>{resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </footer>
    </aside>
  )
}

import { Progress } from './ui/progress'

export function AppHeader({ title, solved, total }: {
  title: string; solved: number; total: number
}) {
  const pct = total ? Math.round((solved / total) * 100) : 0
  return (
    <header className="sticky top-0 z-30 h-14 border-b backdrop-blur bg-background/80 flex items-center justify-between px-6">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground tabular-nums">{solved} / {total} solved</span>
        <Progress value={pct} className="w-24 h-2" />
      </div>
    </header>
  )
}

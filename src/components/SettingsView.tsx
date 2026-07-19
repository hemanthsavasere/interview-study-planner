import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Separator } from './ui/separator'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog'
import { toast } from 'sonner'
import { generateSchedule } from '../lib/scheduler'
import { syncToFiles, loadFromFiles } from '../lib/sync'
import type { Problem, AppState } from '../types'

export function SettingsView({ problems, store }: { problems: Problem[]; store: ReturnType<typeof import('../hooks/useStore').useStore> }) {
  const [deadline, setDeadline] = useState(store.state.config.deadline)
  const [hours, setHours] = useState(String(store.state.config.hoursPerDay))
  const [weekdays, setWeekdays] = useState(store.state.config.weekdaysOnly)
  const [err, setErr] = useState('')
  const [warn, setWarn] = useState<string[] | null>(null)
  const [importedData, setImportedData] = useState<AppState | null>(null)

  const scheduledCount = Object.values(store.state.progress).filter(p => p.scheduledDate).length
  const solvedCount = Object.values(store.state.progress).filter(p => p.status === 'solved' || p.status === 'confident').length

  function run(regen: boolean) {
    setErr(''); setWarn(null)
    try {
      const h = Number(hours)
      if (!isFinite(h) || h < 0.5) { setErr('Hours must be at least 0.5'); return }
      if (!deadline) { setErr('Please set a deadline'); return }
      const cfg = { deadline, hoursPerDay: h, weekdaysOnly: weekdays }
      const { assignments, warnings } = generateSchedule(problems, cfg, regen ? store.state.progress : undefined)
      store.setConfig(cfg)
      store.applyAssignments(assignments, new Date().toISOString())
      if (warnings.length) setWarn(warnings)
      else toast.success(regen ? 'Schedule regenerated' : 'Schedule generated')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setErr(msg); toast.error(msg)
    }
  }

  async function handleSync() {
    try {
      const res = await syncToFiles(store.state, problems)
      if (res.ok) toast.success('Synced to files')
      else toast.error(res.error ?? 'Sync failed')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sync failed')
    }
  }

  async function handleImport() {
    const data = await loadFromFiles()
    if (!data) { toast.error('No progress file found'); return }
    setImportedData(data)
  }

  function confirmImport() {
    if (!importedData) return
    store.loadFromImport(importedData)
    setImportedData(null)
    toast.success('Progress imported from files')
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule</CardTitle>
          <CardDescription>Set your deadline and study pace.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="deadline">Deadline</Label>
            <Input id="deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="hours">Hours per day</Label>
            <Input id="hours" type="number" min={0.5} step={0.5} value={hours} onChange={e => setHours(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="weekdays" checked={weekdays} onCheckedChange={setWeekdays} />
            <Label htmlFor="weekdays">Weekdays only (for requeue)</Label>
          </div>
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
        </CardContent>
        <CardFooter className="gap-2">
          <Button onClick={() => run(false)}>Generate Schedule</Button>
          <Button variant="outline" onClick={() => run(true)}>Regenerate (unsolved)</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sync</CardTitle>
          <CardDescription>Sync <code>progress.json</code> and <code>notes/</code> with local files (dev server only).</CardDescription>
        </CardHeader>
        <CardFooter className="gap-2">
          <Button variant="outline" onClick={handleSync}>Sync to Files</Button>
          <Button variant="outline" onClick={handleImport}>Import from Files</Button>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Button variant="destructive" onClick={() => { if (confirm('Reset all progress?')) { store.resetAll(); toast.success('Reset') } }}>
            Reset All Progress
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardContent className="p-4 grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
          <div className="text-muted-foreground">Schedule generated</div>
          <div className="text-right tabular-nums">{store.state.generatedAt || '—'}</div>
          <div className="text-muted-foreground">Total scheduled</div>
          <div className="text-right tabular-nums">{scheduledCount}</div>
          <div className="text-muted-foreground">Total solved</div>
          <div className="text-right tabular-nums">{solvedCount}</div>
        </CardContent>
      </Card>

      <Dialog open={!!importedData} onOpenChange={o => !o && setImportedData(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import progress</DialogTitle>
            <DialogDescription>Import progress from files? This will overwrite your current progress.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportedData(null)}>Cancel</Button>
            <Button onClick={confirmImport}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!warn} onOpenChange={o => !o && setWarn(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule warnings</DialogTitle></DialogHeader>
          <ul className="text-sm list-disc pl-4">{warn?.map((w, i) => <li key={i}>{w}</li>)}</ul>
          <DialogFooter><Button onClick={() => setWarn(null)}>OK</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

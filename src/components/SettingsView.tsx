import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog'
import { toast } from 'sonner'
import { generateSchedule } from '../lib/scheduler'
import { syncToFiles, loadFromFiles } from '../lib/sync'
import type { Problem } from '../types'
import type { AppState } from '../types'

export function SettingsView({ problems, store }: { problems: Problem[]; store: ReturnType<typeof import('../hooks/useStore').useStore> }) {
  const [deadline, setDeadline] = useState(store.state.config.deadline)
  const [hours, setHours] = useState(String(store.state.config.hoursPerDay))
  const [weekdays, setWeekdays] = useState(store.state.config.weekdaysOnly)
  const [err, setErr] = useState('')
  const [warn, setWarn] = useState<string[] | null>(null)
  const [importedData, setImportedData] = useState<AppState | null>(null)

  function run(regen: boolean) {
    setErr('')
    setWarn(null)
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
      setErr(msg)
      toast.error(msg)
    }
  }

  async function handleSync() {
    const res = await syncToFiles(store.state, problems)
    if (res.ok) toast.success('Synced to files')
    else toast.error(res.error ?? 'Sync failed')
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
    <div className="max-w-md space-y-4">
      <h2 className="text-xl font-bold">Settings</h2>
      <div>
        <Label htmlFor="deadline">Deadline</Label>
        <Input id="deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="hours">Hours per day</Label>
        <Input id="hours" type="number" min={0.5} step={0.5} value={hours} onChange={e => setHours(e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        <Switch id="weekdays" checked={weekdays} onCheckedChange={setWeekdays} />
        <Label htmlFor="weekdays">Weekdays only (for requeue)</Label>
      </div>
      {err && <p role="alert" className="text-sm text-red-500">{err}</p>}
      <div className="flex gap-2">
        <Button onClick={() => run(false)}>Generate Schedule</Button>
        <Button variant="outline" onClick={() => run(true)}>Regenerate (unsolved)</Button>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleSync}>Sync to Files</Button>
        <Button variant="outline" onClick={handleImport}>Import from Files</Button>
      </div>
      <Button variant="destructive" onClick={() => { if (confirm('Reset all progress?')) { store.resetAll(); toast.success('Reset') } }}>
        Reset All Progress
      </Button>

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

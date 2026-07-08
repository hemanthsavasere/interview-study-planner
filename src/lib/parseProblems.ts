import type { Problem, Difficulty } from '../types'

const VALID: Difficulty[] = ['Fundamental', 'Easy', 'Medium', 'Hard']

export function slugify(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function parseProblems(csv: string): { problems: Problem[]; skipped: number } {
  const lines = csv.split(/\r?\n/).filter(l => l.trim())
  const seen = new Map<string, number>()
  const out: Problem[] = []
  let skipped = 0
  for (let i = 1; i < lines.length; i++) {
    const [learningPath, topic, section, name, diff, url] = lines[i].split(',')
    if (!VALID.includes(diff as Difficulty)) {
      console.warn(`parseProblems: skipping row ${i} unknown difficulty "${diff}"`)
      skipped++
      continue
    }
    let id = slugify(name)
    const n = seen.get(id) ?? 0
    seen.set(id, n + 1)
    if (n > 0) id = `${id}-${n + 1}`
    out.push({ id, learningPath, topic, section, name, difficulty: diff as Difficulty, url })
  }
  return { problems: out, skipped }
}

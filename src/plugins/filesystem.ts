import type { Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

export function filesystemPlugin(root: string): Plugin {
  return {
    name: 'filesystem-sync',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? ''
        if (url === '/save' && req.method === 'POST') {
          let body = ''
          for await (const c of req) body += c
          try {
            const { progress, notes } = JSON.parse(body)
            fs.writeFileSync(path.join(root, 'progress.json'), JSON.stringify(progress, null, 2))
            for (const [rel, content] of Object.entries(notes as Record<string, string>)) {
              const fp = path.join(root, rel)
              fs.mkdirSync(path.dirname(fp), { recursive: true })
              fs.writeFileSync(fp, content)
            }
            res.end(JSON.stringify({ ok: true }))
          } catch (e) {
            res.end(JSON.stringify({ ok: false, error: String(e) }))
          }
          return
        }
        if (url === '/load' && req.method === 'GET') {
          const fp = path.join(root, 'progress.json')
          if (!fs.existsSync(fp)) { res.statusCode = 404; res.end(); return }
          res.end(fs.readFileSync(fp, 'utf-8'))
          return
        }
        next()
      })
    },
  }
}

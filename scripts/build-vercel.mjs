import { build } from 'esbuild'
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

console.log('Building Vercel output...')

rmSync('.vercel/output', { recursive: true, force: true })
mkdirSync('.vercel/output/static', { recursive: true })
mkdirSync('.vercel/output/functions/ssr.func', { recursive: true })

// Copy client assets; exclude index.html (SSR generates HTML per-request)
if (existsSync('dist/client')) {
  cpSync('dist/client', '.vercel/output/static', { recursive: true })
  try { rmSync('.vercel/output/static/index.html') } catch {}
}

// Locate the server entry — TanStack Start names it after the input file ('server.js')
// but fall back to scanning if needed.
const serverDir = 'dist/server'
if (!existsSync(serverDir)) {
  throw new Error(`${serverDir}/ not found — did vite build complete?`)
}

const candidates = readdirSync(serverDir).filter(f => f.endsWith('.js') && !f.endsWith('.map'))
const serverFile =
  candidates.find(f => f === 'server.js') ??
  candidates.find(f => f === 'index.js') ??
  candidates[0]

if (!serverFile) {
  throw new Error(`No .js files in ${serverDir}/. Files: ${readdirSync(serverDir).join(', ')}`)
}

const serverEntry = join(serverDir, serverFile)
console.log(`Server entry: ${serverEntry}`)

// Bundle server into a single file for Vercel's Node.js streaming runtime.
// TanStack Start exports { default: { fetch(request): Response } }.
await build({
  stdin: {
    contents: `import h from './${serverEntry}'; export default req => h.fetch(req)`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '.vercel/output/functions/ssr.func/index.js',
  logLevel: 'warning',
})

writeFileSync(
  '.vercel/output/functions/ssr.func/.vc-config.json',
  JSON.stringify({
    runtime: 'nodejs22.x',
    handler: 'index.js',
    launcherType: 'Nodejs',
    supportsResponseStreaming: true,
  })
)

writeFileSync(
  '.vercel/output/config.json',
  JSON.stringify({
    version: 3,
    routes: [
      { handle: 'filesystem' },
      { src: '/(.*)', dest: '/ssr' },
    ],
  })
)

console.log('✓ .vercel/output/ ready')

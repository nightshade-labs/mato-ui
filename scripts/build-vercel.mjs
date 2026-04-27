import { build } from 'esbuild'
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'

console.log('Building Vercel output...')

rmSync('.vercel/output', { recursive: true, force: true })
mkdirSync('.vercel/output/static', { recursive: true })
mkdirSync('.vercel/output/functions/ssr.func', { recursive: true })

// Copy client assets; exclude index.html (SSR generates HTML per-request)
if (existsSync('dist/client')) {
  cpSync('dist/client', '.vercel/output/static', { recursive: true })
  try { rmSync('.vercel/output/static/index.html') } catch {}
}

// Bundle server into a single file for Vercel's Node.js runtime.
// TanStack Start exports { default: { fetch(request): Response } },
// which matches Vercel's streaming Node.js handler format.
await build({
  stdin: {
    contents: `import h from './dist/server/index.js'; export default req => h.fetch(req)`,
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

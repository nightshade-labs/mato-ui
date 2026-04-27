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

// Locate the server entry built by vite
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

console.log(`Server entry: ${serverDir}/${serverFile}`)

// Write a real entry file so esbuild can use outdir + splitting
// (splitting: true ensures dynamic import chunks are co-located in the func dir)
const entryFile = '_vercel_entry.mjs'
// Vercel's Node.js launcher passes a Node.js IncomingMessage, not a Web API Request.
// We convert it manually before handing off to TanStack Start.
writeFileSync(
  entryFile,
  `import h from './${join(serverDir, serverFile).replaceAll('\\\\', '/')}';

export default async (req, _res) => {
  const proto = req.headers['x-forwarded-proto'] ?? 'https';
  const host = req.headers['x-forwarded-host'] ?? req.headers['host'] ?? 'localhost';
  const url = proto + '://' + host + req.url;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach(v => headers.append(key, v));
    else if (value != null) headers.set(key, value);
  }

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const request = new Request(url, {
    method: req.method,
    headers,
    ...(hasBody ? { body: req, duplex: 'half' } : {}),
  });

  return h.fetch(request);
};
`
)

try {
  await build({
    entryPoints: { index: entryFile },
    bundle: true,
    platform: 'node',
    format: 'esm',
    splitting: true,
    outdir: '.vercel/output/functions/ssr.func',
    logLevel: 'warning',
    // react-dom/server.node.js is CJS and calls require('util') at runtime.
    // In an ESM bundle `require` is undefined, so we inject it into every chunk.
    banner: {
      js: "import { createRequire } from 'module';\nconst require = createRequire(import.meta.url);",
    },
  })
} finally {
  rmSync(entryFile)
}

// Node.js requires explicit "type": "module" to load .js files as ESM
writeFileSync(
  '.vercel/output/functions/ssr.func/package.json',
  JSON.stringify({ type: 'module' })
)

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

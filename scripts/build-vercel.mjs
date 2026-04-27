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

const serverPath = join(serverDir, serverFile).replaceAll('\\', '/')
console.log(`Server entry: ${serverPath}`)

// Vercel's Node.js launcher passes a Node.js IncomingMessage, not a Web API Request.
// We convert it, call TanStack Start's fetch handler, then pipe the Response body
// into the Node.js ServerResponse so Vercel can reliably stream it back.
const entryFile = '_vercel_entry.mjs'
writeFileSync(entryFile, `
import h from './${serverPath}';

export default async (req, res) => {
  const proto = req.headers['x-forwarded-proto'] ?? 'https';
  const host  = req.headers['x-forwarded-host'] ?? req.headers['host'] ?? 'localhost';
  const url   = proto + '://' + host + req.url;

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) v.forEach(x => headers.append(k, x));
    else if (v != null) headers.set(k, v);
  }

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const webRequest = new Request(url, {
    method: req.method,
    headers,
    ...(hasBody ? { body: req, duplex: 'half' } : {}),
  });

  const response = await h.fetch(webRequest);

  res.statusCode = response.status;
  for (const [k, v] of response.headers.entries()) {
    if (k === 'set-cookie') res.appendHeader(k, v);
    else res.setHeader(k, v);
  }

  if (response.body) {
    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    } finally {
      res.end();
    }
  } else {
    res.end();
  }
};
`)

try {
  await build({
    entryPoints: { index: entryFile },
    bundle: true,
    platform: 'node',
    format: 'esm',
    splitting: true,
    outdir: '.vercel/output/functions/ssr.func',
    logLevel: 'warning',
    banner: {
      // react-dom/server.node.js is CJS and calls require() — inject a real
      // require() so esbuild's CJS shim can resolve Node built-ins at runtime.
      js: "import { createRequire } from 'module';\nconst require = createRequire(import.meta.url);",
    },
  })
} finally {
  rmSync(entryFile)
}

// Node.js needs "type":"module" to load .js files as ESM
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

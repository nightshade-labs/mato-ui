import { rootNodeFromAnchor } from '@codama/nodes-from-anchor'
import { renderVisitor } from '@codama/renderers-js'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { visit } from '@codama/visitors-core'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')

const anchorIdl = JSON.parse(
  readFileSync(join(projectRoot, 'src/lib/idl/twob_anchor.json'), 'utf-8'),
)

const codama = rootNodeFromAnchor(anchorIdl)

const jsDir = join(projectRoot, 'src/lib/generated/twob')

await visit(
  codama,
  renderVisitor(jsDir, {
    formatCode: true,
    deleteFolderBeforeRendering: true,
  }),
)

console.log('Generated Kit-native TypeScript client at:', jsDir)

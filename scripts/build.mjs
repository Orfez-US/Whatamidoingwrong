import { cp, mkdir, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const project = dirname(dirname(fileURLToPath(import.meta.url)))
const output = join(project, 'dist')
await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
for (const file of ['index.html', 'style.css', 'game.js']) {
  await cp(join(project, file), join(output, file))
}

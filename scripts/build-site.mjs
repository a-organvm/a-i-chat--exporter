#!/usr/bin/env node
/**
 * build-site.mjs — assemble the static deploy directory for ChatGPT Exporter.
 *
 * Output: dist-site/
 *   ├── index.html           one-click install landing page (from site/index.html)
 *   ├── chatgpt.user.js      the built userscript
 *   └── _headers             Cloudflare Pages headers (correct content-type for *.user.js)
 *
 * Usage:
 *   node scripts/build-site.mjs            # build userscript if missing, then assemble
 *   node scripts/build-site.mjs --build    # always rebuild the userscript first
 *
 * The assembled dist-site/ is what every deploy target (Docker, Vercel, Cloudflare,
 * or any static host) publishes. See docs/deploy.md.
 */
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const userscript = join(root, 'dist', 'chatgpt.user.js')
const outDir = join(root, 'dist-site')
const forceBuild = process.argv.includes('--build')

function log(msg) {
  process.stdout.write(`[build-site] ${msg}\n`)
}

if (forceBuild || !existsSync(userscript)) {
  log(forceBuild ? 'building userscript (--build)…' : 'userscript not found — running build…')
  execSync('pnpm run build', { cwd: root, stdio: 'inherit' })
}

if (!existsSync(userscript))
  throw new Error(`Expected ${userscript} after build, but it is missing.`)

// Fresh output directory.
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

// Userscript.
copyFileSync(userscript, join(outDir, 'chatgpt.user.js'))

// Landing page with version + build-time injected.
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const html = readFileSync(join(root, 'site', 'index.html'), 'utf8')
  .replaceAll('__VERSION__', pkg.version)
  .replaceAll('__BUILT_AT__', new Date().toISOString().slice(0, 10))
writeFileSync(join(outDir, 'index.html'), html)

// Cloudflare Pages headers — serve the userscript as JS so managers detect it.
writeFileSync(join(outDir, '_headers'), [
  '/chatgpt.user.js',
  '  Content-Type: text/javascript; charset=utf-8',
  '  Cache-Control: public, max-age=0, must-revalidate',
  '',
].join('\n'))

log(`assembled → dist-site/ (v${pkg.version})`)
log('  index.html, chatgpt.user.js, _headers')

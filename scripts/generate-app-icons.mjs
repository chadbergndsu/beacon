#!/usr/bin/env node
/**
 * Generate Beacon app icons (PWA + store shells) with sharp.
 *   node scripts/generate-app-icons.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const sharp = require('sharp')

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'icons')
const appDir = path.join(root, 'src', 'app')

fs.mkdirSync(outDir, { recursive: true })

const NAVY = { r: 10, g: 22, b: 40, alpha: 1 } // #0a1628
const SKY = '#0369a1'

function svgFor(size, { maskable = false } = {}) {
  const pad = maskable ? size * 0.18 : size * 0.12
  const inner = size - pad * 2
  const rx = Math.round(inner * 0.22)
  const fontSize = Math.round(inner * 0.52)
  const cy = size / 2 + fontSize * 0.08
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0a1628"/>
  <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${rx}" fill="${SKY}"/>
  <text x="50%" y="${cy}" text-anchor="middle" dominant-baseline="middle"
    font-family="system-ui, -apple-system, Segoe UI, sans-serif"
    font-size="${fontSize}" font-weight="700" fill="#f8fafc">B</text>
</svg>`
}

async function writePng(file, size, opts) {
  const buf = await sharp(Buffer.from(svgFor(size, opts)))
    .png()
    .toBuffer()
  fs.writeFileSync(file, buf)
  console.log('  wrote', path.relative(root, file), `(${size}×${size})`)
}

async function main() {
  console.log('Generating Beacon app icons…')
  await writePng(path.join(outDir, 'icon-192.png'), 192)
  await writePng(path.join(outDir, 'icon-512.png'), 512)
  await writePng(path.join(outDir, 'icon-512-maskable.png'), 512, { maskable: true })
  await writePng(path.join(outDir, 'apple-touch-icon.png'), 180)
  await writePng(path.join(outDir, 'app-store-1024.png'), 1024)
  await writePng(path.join(outDir, 'play-icon-512.png'), 512)

  // Next.js metadata file conventions
  await writePng(path.join(appDir, 'icon.png'), 512)
  await writePng(path.join(appDir, 'apple-icon.png'), 180)

  // Simple feature graphic 1024×500 for Play
  const feature = await sharp({
    create: {
      width: 1024,
      height: 500,
      channels: 3,
      background: NAVY,
    },
  })
    .composite([
      {
        input: await sharp(Buffer.from(svgFor(280))).png().toBuffer(),
        left: 80,
        top: 110,
      },
      {
        input: Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="200">
  <text x="0" y="80" font-family="system-ui,sans-serif" font-size="72" font-weight="700" fill="#f8fafc">Beacon</text>
  <text x="0" y="140" font-family="system-ui,sans-serif" font-size="28" fill="#94a3b8">School suite for any school</text>
</svg>`),
        left: 400,
        top: 160,
      },
    ])
    .png()
    .toBuffer()
  fs.writeFileSync(path.join(outDir, 'play-feature-1024x500.png'), feature)
  console.log('  wrote public/icons/play-feature-1024x500.png')
  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

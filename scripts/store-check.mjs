#!/usr/bin/env node
/**
 * Store / PWA readiness check (no secrets, no store upload).
 *   npm run store:check
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function ok(msg) {
  console.log(`  ✓ ${msg}`)
}
function bad(msg) {
  console.log(`  ✗ ${msg}`)
}
function info(msg) {
  console.log(`  · ${msg}`)
}

const required = [
  'src/app/manifest.ts',
  'public/icons/icon-192.png',
  'public/icons/icon-512.png',
  'public/icons/icon-512-maskable.png',
  'public/icons/apple-touch-icon.png',
  'public/icons/app-store-1024.png',
  'public/icons/play-icon-512.png',
  'public/icons/play-feature-1024x500.png',
  'src/app/privacy/page.tsx',
  'src/app/terms/page.tsx',
  'capacitor.config.cjs',
  'docs/store-launch.md',
  'docs/adr/002-store-shells-capacitor.md',
]

console.log('Beacon store / PWA readiness\n')
let blockers = 0
for (const rel of required) {
  const p = path.join(root, rel)
  if (fs.existsSync(p)) ok(rel)
  else {
    bad(`missing ${rel}`)
    blockers++
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const hasCap =
  Boolean(pkg.dependencies?.['@capacitor/core'] || pkg.devDependencies?.['@capacitor/core'])
if (hasCap) ok('@capacitor/core installed')
else info('@capacitor/core not installed yet — run steps in docs/store-launch.md when building shells')

const hasIos = fs.existsSync(path.join(root, 'ios'))
const hasAndroid = fs.existsSync(path.join(root, 'android'))
if (hasIos) ok('ios/ project present')
else info('ios/ not generated (npx cap add ios)')
if (hasAndroid) ok('android/ project present')
else info('android/ not generated (npx cap add android)')

console.log('\nExternal (cannot automate here)')
info('Apple Developer + App Store Connect listing')
info('Google Play Console listing + Data safety form')
info('Phone screenshots for store listings (see docs/store-launch.md)')
info('Counsel review of /privacy + /terms if required')

console.log('')
if (blockers) {
  console.log(`Result: ${blockers} in-repo blocker(s). Run: npm run icons:generate`)
  process.exit(1)
}
console.log('Result: in-repo store prep OK. Finish accounts + screenshots + cap add on a build machine.')
process.exit(0)

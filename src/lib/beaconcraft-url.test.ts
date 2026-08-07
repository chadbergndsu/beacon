import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  BEACONCRAFT_EXTERNAL_URL,
  beaconCraftAppHref,
  beaconCraftBaseUrl,
  beaconCraftTourUrl,
  isExternalCraftUrl,
} from './beaconcraft-url'

describe('beaconCraftBaseUrl', () => {
  const prev = process.env.NEXT_PUBLIC_BEACONCRAFT_URL

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_BEACONCRAFT_URL
  })

  afterEach(() => {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_BEACONCRAFT_URL
    else process.env.NEXT_PUBLIC_BEACONCRAFT_URL = prev
  })

  it('defaults to same-origin integrated craft when env unset', () => {
    expect(beaconCraftBaseUrl()).toBe('')
    expect(beaconCraftAppHref()).toBe('/craft')
    expect(beaconCraftTourUrl()).toBe('/craft/tour')
    expect(isExternalCraftUrl('/craft/tour')).toBe(false)
  })

  it('ignores legacy localhost:3001 placeholder from old .env.local', () => {
    process.env.NEXT_PUBLIC_BEACONCRAFT_URL = 'http://localhost:3001'
    expect(beaconCraftBaseUrl()).toBe('')
    expect(beaconCraftTourUrl()).toBe('/craft/tour')
  })

  it('respects explicit external craft URL override', () => {
    process.env.NEXT_PUBLIC_BEACONCRAFT_URL = BEACONCRAFT_EXTERNAL_URL
    expect(beaconCraftBaseUrl()).toBe(BEACONCRAFT_EXTERNAL_URL)
    expect(beaconCraftAppHref()).toBe(BEACONCRAFT_EXTERNAL_URL)
    expect(beaconCraftTourUrl()).toBe(`${BEACONCRAFT_EXTERNAL_URL}/?tour=1`)
    expect(isExternalCraftUrl(BEACONCRAFT_EXTERNAL_URL)).toBe(true)
  })

  it('respects explicit local craft URL override', () => {
    process.env.NEXT_PUBLIC_BEACONCRAFT_URL = 'http://127.0.0.1:3002/'
    expect(beaconCraftBaseUrl()).toBe('http://127.0.0.1:3002')
  })
})

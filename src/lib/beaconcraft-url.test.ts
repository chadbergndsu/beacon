import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  BEACONCRAFT_PRODUCTION_URL,
  beaconCraftBaseUrl,
  beaconCraftTourUrl,
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

  it('defaults to production when env unset', () => {
    expect(beaconCraftBaseUrl()).toBe(BEACONCRAFT_PRODUCTION_URL)
    expect(beaconCraftTourUrl()).toBe(`${BEACONCRAFT_PRODUCTION_URL}/?tour=1`)
  })

  it('ignores legacy localhost:3001 placeholder from old .env.local', () => {
    process.env.NEXT_PUBLIC_BEACONCRAFT_URL = 'http://localhost:3001'
    expect(beaconCraftBaseUrl()).toBe(BEACONCRAFT_PRODUCTION_URL)
  })

  it('respects explicit local craft URL override', () => {
    process.env.NEXT_PUBLIC_BEACONCRAFT_URL = 'http://127.0.0.1:3002/'
    expect(beaconCraftBaseUrl()).toBe('http://127.0.0.1:3002')
  })
})

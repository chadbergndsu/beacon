import { describe, expect, it } from 'vitest'
import { toClientError } from './client-error'

describe('toClientError', () => {
  it('maps unique violations', () => {
    expect(toClientError(new Error('duplicate key value violates unique constraint'))).toMatch(
      /already exists/i
    )
  })

  it('hides postgres schema noise', () => {
    expect(toClientError(new Error('relation "foo" does not exist'))).toBe(
      'Could not save. Try again.'
    )
  })

  it('passes short human messages', () => {
    expect(toClientError(new Error('You do not have permission.'))).toMatch(/permission/i)
  })
})

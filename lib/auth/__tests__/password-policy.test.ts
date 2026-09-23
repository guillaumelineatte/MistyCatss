import { describe, expect, it } from 'vitest'

import { checkPasswordPolicy } from '../password-policy'

describe('checkPasswordPolicy', () => {
  it('rejects passwords shorter than 12 characters', () => {
    expect(checkPasswordPolicy('Short1!')).toBe('too_short')
  })

  it('rejects a known common/compromised password', () => {
    expect(checkPasswordPolicy('123456789012')).toBe('too_common')
  })

  it('is case-insensitive against the compromised list', () => {
    expect(checkPasswordPolicy('123456789012'.toUpperCase())).toBe('too_common')
  })

  it('accepts a long, non-common password', () => {
    expect(checkPasswordPolicy('Tr0ub4dor&Zebra!Kayak')).toBeNull()
  })
})

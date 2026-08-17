import { describe, expect, it } from 'vitest'

import { buildPeriodDays } from './date'

describe('buildPeriodDays', () => {
  it('строит ровно семь последовательных дат', () => {
    expect(buildPeriodDays('2026-08-29')).toEqual([
      '2026-08-29',
      '2026-08-30',
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
    ])
  })
})

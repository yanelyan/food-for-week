import { describe, expect, it } from 'vitest'

import { buildPeriodDays } from './date'

describe('buildPeriodDays', () => {
  it('строит последовательный период по включительным границам', () => {
    expect(buildPeriodDays('2026-08-29', '2026-09-04')).toEqual([
      '2026-08-29',
      '2026-08-30',
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
    ])
  })

  it('поддерживает окно планирования на девять недель', () => {
    const days = buildPeriodDays('2026-08-23', '2026-10-24')

    expect(days).toHaveLength(63)
    expect(days[0]).toBe('2026-08-23')
    expect(days.at(-1)).toBe('2026-10-24')
  })
})

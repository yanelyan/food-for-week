import { describe, expect, it, vi } from 'vitest'

import type { UserSettings } from '../types'
import { syncSettingsTimeZone } from './timeZone'

describe('syncSettingsTimeZone', () => {
  it('обновляет устаревший часовой пояс аккаунта', async () => {
    const settings: UserSettings = { purchase_weekday: 4, timezone_name: 'UTC' }
    const updateSettings = vi.fn().mockResolvedValue({
      purchase_weekday: 4,
      timezone_name: 'Europe/Moscow',
    })

    const result = await syncSettingsTimeZone(settings, updateSettings, 'Europe/Moscow')

    expect(updateSettings).toHaveBeenCalledWith(4, 'Europe/Moscow')
    expect(result.timezone_name).toBe('Europe/Moscow')
  })

  it('не делает лишний запрос для актуального пояса или до выбора дня закупок', async () => {
    const updateSettings = vi.fn()

    await syncSettingsTimeZone(
      { purchase_weekday: 4, timezone_name: 'Europe/Moscow' },
      updateSettings,
      'Europe/Moscow',
    )
    await syncSettingsTimeZone(
      { purchase_weekday: null, timezone_name: 'UTC' },
      updateSettings,
      'Europe/Moscow',
    )

    expect(updateSettings).not.toHaveBeenCalled()
  })
})

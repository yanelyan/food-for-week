import type { UserSettings } from '../types'

type SettingsUpdater = (purchaseWeekday: number, timeZoneName: string) => Promise<UserSettings>

export function detectDeviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export async function syncSettingsTimeZone(
  settings: UserSettings,
  updateSettings: SettingsUpdater,
  detectedTimeZone = detectDeviceTimeZone(),
): Promise<UserSettings> {
  if (
    settings.purchase_weekday === null ||
    !detectedTimeZone ||
    settings.timezone_name === detectedTimeZone
  ) {
    return settings
  }

  return updateSettings(settings.purchase_weekday, detectedTimeZone)
}

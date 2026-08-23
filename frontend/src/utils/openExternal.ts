export function openExternal(url: string): void {
  const telegram = window.Telegram?.WebApp
  if (telegram?.openLink) {
    telegram.openLink(url)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

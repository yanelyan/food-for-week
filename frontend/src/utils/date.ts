export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

export function formatDateValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function buildPeriodDays(start: string, end: string): string[] {
  const result: string[] = []
  const startDate = parseLocalDate(start)
  const endDate = parseLocalDate(end)
  const numberOfDays = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1
  for (let index = 0; index < numberOfDays; index += 1) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)
    result.push(formatDateValue(date))
  }
  return result
}

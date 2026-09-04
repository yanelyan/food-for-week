export function parseOptionalQuantity(value: string): number | null {
  const cleaned = value.trim()
  if (!cleaned) return null

  const normalized = cleaned.replace(',', '.')
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
    throw new Error('Введите количество числом, например 1,5')
  }

  const quantity = Number(normalized)
  if (!Number.isFinite(quantity)) {
    throw new Error('Введите корректное количество')
  }
  return quantity
}

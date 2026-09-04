// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ShoppingItem } from '../types'
import { ShoppingScreen } from './ShoppingScreen'

afterEach(cleanup)

function item(
  name: string,
  checked: boolean,
  isPantry: boolean,
  conversionHint: string | null = null,
): ShoppingItem {
  return {
    ingredient_id: isPantry ? 2 : 1,
    name,
    display_amount: '1 шт.',
    amounts: [{ quantity: 1, unit: 'шт.', note: null }],
    conversion_hint: conversionHint,
    checked,
    is_pantry: isPantry,
  }
}

describe('ShoppingScreen', () => {
  it('не перечёркивает отмеченные домашние продукты', async () => {
    const onToggle = vi.fn().mockResolvedValue(undefined)
    const onManagePantry = vi.fn()
    const onAddToPantry = vi.fn().mockResolvedValue(undefined)
    const onRemoveFromPantry = vi.fn().mockResolvedValue(undefined)
    render(
      <ShoppingScreen
        shopping={{
          period: { start: '2026-09-05', end: '2026-09-11' },
          purchase_weekday: 4,
          items: [item('Яблоко', true, false)],
          pantry_items: [item('Соль', true, true)],
        }}
        onToggle={onToggle}
        onReset={vi.fn()}
        onChangePurchaseDay={vi.fn()}
        onManagePantry={onManagePantry}
        onAddToPantry={onAddToPantry}
        onRemoveFromPantry={onRemoveFromPantry}
      />,
    )

    expect(screen.getByText('Яблоко').className).toContain('line-through')
    expect(screen.getByText('Соль').className).not.toContain('line-through')

    fireEvent.click(screen.getByRole('button', { name: 'Убрать отметку Соль' }))
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ name: 'Соль' }))

    fireEvent.click(screen.getByRole('button', { name: 'Открыть список «Должно быть дома»' }))
    expect(onManagePantry).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: 'Добавить Яблоко в домашние продукты' }))
    await waitFor(() =>
      expect(onAddToPantry).toHaveBeenCalledWith(expect.objectContaining({ name: 'Яблоко' })),
    )

    const removeButton = screen.getByRole('button', {
      name: 'Убрать Соль из домашних продуктов',
    }) as HTMLButtonElement
    await waitFor(() => expect(removeButton.disabled).toBe(false))
    fireEvent.click(removeButton)
    expect(onRemoveFromPantry).toHaveBeenCalledWith(expect.objectContaining({ name: 'Соль' }))
  })

  it('показывает вход в персональный список даже без продуктов текущей недели', () => {
    render(
      <ShoppingScreen
        shopping={{
          period: { start: '2026-09-05', end: '2026-09-11' },
          purchase_weekday: 4,
          items: [],
          pantry_items: [],
        }}
        onToggle={vi.fn()}
        onReset={vi.fn()}
        onChangePurchaseDay={vi.fn()}
        onManagePantry={vi.fn()}
        onAddToPantry={vi.fn()}
        onRemoveFromPantry={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Открыть список «Должно быть дома»' })).toBeTruthy()
    expect(screen.getByText('Нажмите, чтобы настроить персональный список')).toBeTruthy()
  })

  it('показывает перевод единиц рядом с основным количеством', () => {
    render(
      <ShoppingScreen
        shopping={{
          period: { start: '2026-09-05', end: '2026-09-11' },
          purchase_weekday: 4,
          items: [item('Куриное филе', false, false, 'Примерно: 400 г')],
          pantry_items: [
            item('Петрушка', true, true, 'Эквивалент только для части количества: 8 г'),
          ],
        }}
        onToggle={vi.fn()}
        onReset={vi.fn()}
        onChangePurchaseDay={vi.fn()}
        onManagePantry={vi.fn()}
        onAddToPantry={vi.fn()}
        onRemoveFromPantry={vi.fn()}
      />,
    )

    const chickenRow = screen.getByTestId('shopping-1')
    const parsleyRow = screen.getByTestId('shopping-2')
    expect(within(chickenRow).getByText('1 шт.')).toBeTruthy()
    expect(within(chickenRow).getByText('≈ 400 г')).toBeTruthy()
    expect(within(parsleyRow).getByText('частично ≈ 8 г')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Показать перевод единиц' })).toBeNull()
  })
})

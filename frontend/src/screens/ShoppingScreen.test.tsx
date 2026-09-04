// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ShoppingItem } from '../types'
import { ShoppingScreen } from './ShoppingScreen'

afterEach(cleanup)

function item(name: string, checked: boolean, isPantry: boolean): ShoppingItem {
  return {
    ingredient_id: isPantry ? 2 : 1,
    name,
    display_amount: '1 шт.',
    amounts: [{ quantity: 1, unit: 'шт.', note: null }],
    conversion_hint: null,
    checked,
    is_pantry: isPantry,
  }
}

describe('ShoppingScreen', () => {
  it('не перечёркивает отмеченные домашние продукты', () => {
    const onToggle = vi.fn().mockResolvedValue(undefined)
    const onManagePantry = vi.fn()
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
      />,
    )

    expect(screen.getByText('Яблоко').className).toContain('line-through')
    expect(screen.getByText('Соль').className).not.toContain('line-through')

    fireEvent.click(screen.getByRole('button', { name: 'Убрать отметку Соль' }))
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ name: 'Соль' }))

    fireEvent.click(screen.getByRole('button', { name: 'Открыть список «Должно быть дома»' }))
    expect(onManagePantry).toHaveBeenCalledOnce()
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
      />,
    )

    expect(screen.getByRole('button', { name: 'Открыть список «Должно быть дома»' })).toBeTruthy()
    expect(screen.getByText('Нажмите, чтобы настроить персональный список')).toBeTruthy()
  })
})

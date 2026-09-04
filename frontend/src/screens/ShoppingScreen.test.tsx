// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ShoppingItem } from '../types'
import { ShoppingScreen } from './ShoppingScreen'

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
      />,
    )

    expect(screen.getByText('Яблоко').className).toContain('line-through')
    expect(screen.getByText('Соль').className).not.toContain('line-through')

    fireEvent.click(screen.getByRole('button', { name: 'Убрать отметку Соль' }))
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ name: 'Соль' }))
  })
})

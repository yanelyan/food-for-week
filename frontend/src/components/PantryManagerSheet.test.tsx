// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PantryManagerSheet } from './PantryManagerSheet'

describe('PantryManagerSheet', () => {
  it('добавляет продукт и позволяет убрать сохранённый', async () => {
    const onAdd = vi.fn().mockResolvedValue(true)
    const onRemove = vi.fn().mockResolvedValue(undefined)
    render(
      <PantryManagerSheet
        open
        products={[{ id: 1, name: 'Кофе', normalized_name: 'кофе' }]}
        loading={false}
        saving={false}
        onClose={vi.fn()}
        onAdd={onAdd}
        onRemove={onRemove}
      />,
    )

    fireEvent.change(screen.getByLabelText('Название продукта'), { target: { value: 'Чай' } })
    fireEvent.click(screen.getByRole('button', { name: 'Добавить домашний продукт' }))
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith('Чай'))

    fireEvent.click(screen.getByRole('button', { name: 'Убрать Кофе из домашних продуктов' }))
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ name: 'Кофе' }))
  })
})

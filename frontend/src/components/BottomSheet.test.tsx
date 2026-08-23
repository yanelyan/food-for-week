// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BottomSheet } from './BottomSheet'

describe('BottomSheet', () => {
  it('рендерится поверх приложения и разрешает обычную вертикальную прокрутку', () => {
    render(
      <BottomSheet open title="Редактор" onClose={vi.fn()}>
        <div>Последний ингредиент</div>
      </BottomSheet>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Редактор' })
    expect(dialog.parentElement?.className).toContain('fixed')
    expect(dialog.className).toContain('overflow-y-auto')
    expect(dialog.className).toContain('touch-pan-y')
    expect(dialog.hasAttribute('data-no-page-swipe')).toBe(true)
  })
})

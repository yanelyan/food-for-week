// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { RecipesScreen } from './RecipesScreen'

describe('RecipesScreen', () => {
  it('добавляет карточку в план без отдельной перекрывающей кнопки', () => {
    const onPlan = vi.fn()
    render(
      <RecipesScreen
        recipes={[
          {
            id: 1,
            title: 'Тестовый салат',
            meal_types: ['lunch'],
            source_url: 'https://food.ru/recipes/1-test',
            image_url: null,
            ingredient_count: 3,
            created_at: '2026-08-23T10:00:00Z',
          },
        ]}
        loading={false}
        importOpen={false}
        importJob={null}
        filter="all"
        selectionLabel={null}
        onFilterChange={vi.fn()}
        onOpenImport={vi.fn()}
        onCloseImport={vi.fn()}
        onImport={vi.fn()}
        onPlan={onPlan}
        onEdit={vi.fn()}
        onCancelSelection={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'В план' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Добавить Тестовый салат в план' }))
    expect(onPlan).toHaveBeenCalledOnce()
  })
})

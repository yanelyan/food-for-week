import type { MealType, Tab } from './types'

export const TAB_ORDER: Tab[] = ['shopping', 'plan', 'recipes']

export const TAB_LABELS: Record<Tab, string> = {
  shopping: 'Покупки',
  plan: 'Неделя',
  recipes: 'Рецепты',
}

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  dessert: 'Десерт',
}

export const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'dessert']

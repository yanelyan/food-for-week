import type {
  ImportJob,
  MealType,
  PantryProduct,
  Plan,
  PlannedRecipe,
  Recipe,
  RecipeSummary,
  ShoppingItem,
  ShoppingList,
  UserSettings,
} from './types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const initData = window.Telegram?.WebApp?.initData
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(initData ? { 'X-Telegram-Init-Data': initData } : {}),
      ...options.headers,
    },
  })
  if (!response.ok) {
    let message = 'Что-то пошло не так'
    try {
      const payload = (await response.json()) as { detail?: string }
      message = payload.detail ?? message
    } catch {
      // The fallback message is intentionally used for non-JSON errors.
    }
    throw new ApiError(message, response.status)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}

export const api = {
  listRecipes: () => request<RecipeSummary[]>('/recipes'),
  getRecipe: (id: number) => request<Recipe>(`/recipes/${id}`),
  importRecipe: (url: string) =>
    request<ImportJob>('/recipes/import', { method: 'POST', body: JSON.stringify({ url }) }),
  getImportJob: (id: string) => request<ImportJob>(`/recipes/imports/${id}`),
  listImportJobs: () => request<ImportJob[]>('/recipes/imports/recent'),
  updateRecipeMeals: (recipeId: number, mealTypes: MealType[]) =>
    request<Recipe>(`/recipes/${recipeId}`, {
      method: 'PATCH',
      body: JSON.stringify({ meal_types: mealTypes }),
    }),
  updateIngredient: (
    recipeId: number,
    ingredientId: number,
    payload: {
      name: string
      quantity: number | null
      unit: string | null
      note: string | null
      is_pantry: boolean
    },
  ) =>
    request<Recipe>(`/recipes/${recipeId}/ingredients/${ingredientId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getPlan: () => request<Plan>('/plan'),
  addToPlan: (recipeId: number, plannedDate: string, mealType: MealType) =>
    request<PlannedRecipe>('/plan', {
      method: 'POST',
      body: JSON.stringify({ recipe_id: recipeId, planned_date: plannedDate, meal_type: mealType }),
    }),
  removeFromPlan: (id: number) => request<void>(`/plan/${id}`, { method: 'DELETE' }),
  clearCurrentWeek: () => request<void>('/plan/current-week', { method: 'DELETE' }),
  getShoppingList: () => request<ShoppingList>('/shopping-list'),
  updateShoppingCheck: (ingredientId: number, checked: boolean) =>
    request<ShoppingItem>(`/shopping-list/${ingredientId}`, {
      method: 'PATCH',
      body: JSON.stringify({ checked }),
    }),
  resetShopping: () => request<void>('/shopping-list/reset', { method: 'POST' }),
  listPantryProducts: () => request<PantryProduct[]>('/shopping-list/pantry'),
  addPantryProduct: (name: string) =>
    request<PantryProduct>('/shopping-list/pantry', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  removePantryProduct: (id: number) =>
    request<void>(`/shopping-list/pantry/${id}`, { method: 'DELETE' }),
  getSettings: () => request<UserSettings>('/settings'),
  updateSettings: (purchaseWeekday: number, timezoneName: string) =>
    request<UserSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify({ purchase_weekday: purchaseWeekday, timezone_name: timezoneName }),
    }),
}

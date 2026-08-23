export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'dessert'
export type Tab = 'shopping' | 'plan' | 'recipes'
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface RecipeSummary {
  id: number
  title: string
  meal_types: MealType[]
  source_url: string
  image_url: string | null
  ingredient_count: number
  created_at: string
}

export interface RecipeIngredient {
  id: number
  ingredient_id: number
  name: string
  normalized_name: string
  source_text: string
  quantity: number | null
  unit: string | null
  note: string | null
  alternative_quantity: number | null
  alternative_unit: string | null
  is_pantry: boolean
}

export interface Recipe extends Omit<RecipeSummary, 'ingredient_count'> {
  source_yield: string | null
  ingredients: RecipeIngredient[]
}

export interface PlanPeriod {
  start: string
  end: string
}

export interface PlannedRecipe {
  id: number
  planned_date: string
  meal_type: MealType
  recipe: RecipeSummary
}

export interface Plan {
  period: PlanPeriod
  today: string
  purchase_weekday: number
  items: PlannedRecipe[]
}

export interface ShoppingAmount {
  quantity: number | null
  unit: string | null
  note: string | null
}

export interface ShoppingItem {
  ingredient_id: number
  name: string
  display_amount: string
  amounts: ShoppingAmount[]
  conversion_hint: string | null
  checked: boolean
  is_pantry: boolean
}

export interface ShoppingList {
  period: PlanPeriod
  purchase_weekday: number
  items: ShoppingItem[]
  pantry_items: ShoppingItem[]
}

export interface UserSettings {
  purchase_weekday: number | null
  timezone_name: string
}

export interface ImportJob {
  id: string
  source_url: string
  status: ImportStatus
  recipe_id: number | null
  error_message: string | null
  created_at: string
  updated_at: string
}

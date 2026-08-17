import { ExternalLink, LoaderCircle, Save } from 'lucide-react'
import { useEffect, useState } from 'react'

import { api } from '../api'
import { MEAL_LABELS, MEAL_ORDER } from '../constants'
import type { MealType, Recipe, RecipeIngredient } from '../types'
import { BottomSheet } from './BottomSheet'

interface Props {
  recipeId: number | null
  onClose: () => void
  onSaved: () => Promise<void>
  onError: (message: string) => void
}

function IngredientForm({
  recipeId,
  ingredient,
  onSaved,
  onError,
}: {
  recipeId: number
  ingredient: RecipeIngredient
  onSaved: (recipe: Recipe) => void
  onError: (message: string) => void
}) {
  const [name, setName] = useState(ingredient.name)
  const [quantity, setQuantity] = useState(
    ingredient.quantity === null ? '' : String(ingredient.quantity),
  )
  const [unit, setUnit] = useState(ingredient.unit ?? '')
  const [note, setNote] = useState(ingredient.note ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const recipe = await api.updateIngredient(recipeId, ingredient.id, {
        name,
        quantity: quantity === '' ? null : Number(quantity.replace(',', '.')),
        unit: unit || null,
        note: note || null,
      })
      onSaved(recipe)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Не удалось сохранить ингредиент')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-3">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="mb-2 w-full rounded-xl border border-sky-100 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-sky-400"
        aria-label="Название ингредиента"
      />
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <input
          value={quantity}
          inputMode="decimal"
          onChange={(event) => setQuantity(event.target.value)}
          placeholder="Кол-во"
          className="min-w-0 rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
        />
        <input
          value={unit}
          onChange={(event) => setUnit(event.target.value)}
          placeholder="Единица"
          className="min-w-0 rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving || !name.trim()}
          className="grid size-10 place-items-center rounded-xl bg-sky-500 text-white disabled:opacity-50"
          aria-label="Сохранить ингредиент"
        >
          {saving ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}
        </button>
      </div>
      <input
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Например: по вкусу"
        className="mt-2 w-full rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
      />
    </div>
  )
}

export function RecipeEditorSheet({ recipeId, onClose, onSaved, onError }: Props) {
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!recipeId) {
      setRecipe(null)
      return
    }
    setLoading(true)
    api
      .getRecipe(recipeId)
      .then(setRecipe)
      .catch((error) => onError(error instanceof Error ? error.message : 'Не удалось открыть рецепт'))
      .finally(() => setLoading(false))
  }, [recipeId, onError])

  const updateMeal = async (mealType: MealType) => {
    if (!recipe) return
    try {
      const updated = await api.updateRecipeMeal(recipe.id, mealType)
      setRecipe(updated)
      await onSaved()
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Не удалось изменить категорию')
    }
  }

  return (
    <BottomSheet open={recipeId !== null} title={recipe?.title ?? 'Рецепт'} onClose={onClose}>
      {loading || !recipe ? (
        <div className="grid min-h-40 place-items-center text-sky-500">
          <LoaderCircle className="animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Категория
            </label>
            <select
              value={recipe.meal_type}
              onChange={(event) => updateMeal(event.target.value as MealType)}
              className="w-full rounded-2xl border border-sky-100 bg-white px-4 py-3 outline-none focus:border-sky-400"
            >
              {MEAL_ORDER.map((meal) => (
                <option key={meal} value={meal}>
                  {MEAL_LABELS[meal]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Ингредиенты</h3>
              <span className="text-xs text-slate-400">Можно исправить ошибки импорта</span>
            </div>
            <div className="space-y-2">
              {recipe.ingredients.map((ingredient) => (
                <IngredientForm
                  key={ingredient.id}
                  recipeId={recipe.id}
                  ingredient={ingredient}
                  onSaved={(updated) => {
                    setRecipe(updated)
                    void onSaved()
                  }}
                  onError={onError}
                />
              ))}
            </div>
          </div>
          <a
            href={recipe.source_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl border border-sky-200 py-3 font-semibold text-sky-700"
          >
            Открыть оригинал <ExternalLink size={17} />
          </a>
        </div>
      )}
    </BottomSheet>
  )
}

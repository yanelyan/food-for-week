import {
  ArrowRight,
  ChevronRight,
  ExternalLink,
  LoaderCircle,
  Pencil,
  Plus,
  Send,
  Utensils,
} from 'lucide-react'
import { useRef, useState } from 'react'

import { BottomSheet } from '../components/BottomSheet'
import { RecipeImage } from '../components/RecipeImage'
import { MEAL_LABELS, MEAL_ORDER } from '../constants'
import type { ImportJob, MealType, RecipeSummary } from '../types'
import { openExternal } from '../utils/openExternal'

type RecipeFilter = MealType | 'all'

interface Props {
  recipes: RecipeSummary[]
  loading: boolean
  importOpen: boolean
  importJob: ImportJob | null
  filter: RecipeFilter
  selectionLabel: string | null
  onFilterChange: (filter: RecipeFilter) => void
  onOpenImport: () => void
  onCloseImport: () => void
  onImport: (url: string) => Promise<void>
  onPlan: (recipe: RecipeSummary) => void
  onEdit: (recipeId: number) => void
  onCancelSelection: () => void
}

function SwipeRecipeCard({
  recipe,
  selecting,
  onPlan,
  onEdit,
}: {
  recipe: RecipeSummary
  selecting: boolean
  onPlan: () => void
  onEdit: () => void
}) {
  const start = useRef<{ x: number; y: number } | null>(null)
  const [offset, setOffset] = useState(0)

  return (
    <article
      data-testid={`recipe-${recipe.id}`}
      data-no-page-swipe
      className={`relative overflow-hidden rounded-[1.5rem] bg-sky-500 shadow-sm ${
        selecting ? 'selection-breathe ring-2 ring-sky-300 ring-offset-2' : ''
      }`}
      onTouchStart={(event) => {
        const touch = event.touches[0]
        start.current = { x: touch.clientX, y: touch.clientY }
      }}
      onTouchMove={(event) => {
        if (!start.current) return
        const touch = event.touches[0]
        const dx = touch.clientX - start.current.x
        const dy = touch.clientY - start.current.y
        if (dx > 0 && Math.abs(dx) > Math.abs(dy)) setOffset(Math.min(96, dx))
      }}
      onTouchEnd={() => {
        if (offset > 68) onPlan()
        setOffset(0)
        start.current = null
      }}
    >
      <div className="absolute inset-y-0 left-0 flex w-24 items-center justify-center gap-1 text-sm font-bold text-white">
        В план <ArrowRight size={17} />
      </div>
      <div
        className="relative flex overflow-hidden border border-sky-100 bg-white transition-transform duration-200"
        style={{ transform: `translateX(${offset}px)` }}
      >
        <button
          type="button"
          onClick={() => (selecting ? onPlan() : openExternal(recipe.source_url))}
          className="flex min-w-0 flex-1 items-center text-left"
        >
          <RecipeImage src={recipe.image_url} alt={recipe.title} className="h-28 w-28 shrink-0" />
          <div className="min-w-0 flex-1 px-4 py-3">
            <div className="flex flex-wrap gap-1">
              {recipe.meal_types.map((mealType) => (
                <span
                  key={mealType}
                  className="inline-flex rounded-full bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-700"
                >
                  {MEAL_LABELS[mealType]}
                </span>
              ))}
            </div>
            <h2 className="mt-2 line-clamp-2 font-bold leading-5 text-slate-900">{recipe.title}</h2>
            <p className="mt-1 text-xs text-slate-400">{recipe.ingredient_count} ингредиентов</p>
          </div>
          {selecting ? (
            <ChevronRight className="mr-3 shrink-0 text-sky-300" size={20} />
          ) : (
            <ExternalLink className="mr-3 shrink-0 text-sky-300" size={18} />
          )}
        </button>
        <button
          type="button"
          onClick={onPlan}
          className="absolute bottom-2 right-2 rounded-xl bg-sky-500 px-3 py-2 text-xs font-bold text-white shadow-md shadow-sky-200"
        >
          В план
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white/90 text-slate-500 shadow-sm"
          aria-label={`Редактировать ${recipe.title}`}
        >
          <Pencil size={14} />
        </button>
      </div>
    </article>
  )
}

export function RecipesScreen({
  recipes,
  loading,
  importOpen,
  importJob,
  filter,
  selectionLabel,
  onFilterChange,
  onOpenImport,
  onCloseImport,
  onImport,
  onPlan,
  onEdit,
  onCancelSelection,
}: Props) {
  const [url, setUrl] = useState('')
  const busy = importJob?.status === 'pending' || importJob?.status === 'processing'
  const filteredRecipes =
    filter === 'all' ? recipes : recipes.filter((recipe) => recipe.meal_types.includes(filter))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!url.trim() || busy) return
    await onImport(url.trim())
    setUrl('')
  }

  return (
    <section className="min-h-full px-4 pb-28 pt-5">
      <header>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-sky-600">
            {selectionLabel ?? 'Ваша коллекция'}
          </p>
          {selectionLabel && (
            <button
              type="button"
              onClick={onCancelSelection}
              className="text-xs font-bold text-sky-600"
            >
              Отмена
            </button>
          )}
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Рецепты</h1>
        <p className="mt-1 text-sm text-slate-500">
          {selectionLabel ? 'Нажмите на рецепт или смахните его вправо' : 'Нажмите «В план», чтобы добавить рецепт'}
        </p>
      </header>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-3 [scrollbar-width:none]">
        <button
          type="button"
          onClick={() => onFilterChange('all')}
          className={`min-w-16 rounded-2xl px-3 py-2.5 text-xs font-bold transition ${
            filter === 'all'
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-200'
              : 'border border-sky-100 bg-white text-slate-500'
          }`}
        >
          Все
        </button>
        {MEAL_ORDER.map((mealType) => (
          <button
            key={mealType}
            type="button"
            onClick={() => onFilterChange(mealType)}
            className={`min-w-fit rounded-2xl px-3 py-2.5 text-xs font-bold transition ${
              filter === mealType
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-200'
                : 'border border-sky-100 bg-white text-slate-500'
            }`}
          >
            {MEAL_LABELS[mealType]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid min-h-64 place-items-center text-sky-500">
          <LoaderCircle className="animate-spin" size={28} />
        </div>
      ) : recipes.length === 0 ? (
        <div className="mt-12 rounded-[2rem] border border-dashed border-sky-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-sky-100 text-sky-600">
            <Utensils size={30} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Рецептов пока нет</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Добавьте ссылку с поддерживаемого сайта — продукты загрузятся автоматически.
          </p>
          <button
            type="button"
            onClick={onOpenImport}
            className="mt-5 rounded-2xl bg-sky-500 px-5 py-3 font-bold text-white shadow-lg shadow-sky-200"
          >
            Добавить первый рецепт
          </button>
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="mt-12 rounded-[2rem] border border-dashed border-sky-200 bg-white p-7 text-center text-sm text-slate-500">
          Нет рецептов для выбранного приёма пищи.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecipes.map((recipe) => (
            <SwipeRecipeCard
              key={recipe.id}
              recipe={recipe}
              selecting={selectionLabel !== null}
              onPlan={() => onPlan(recipe)}
              onEdit={() => onEdit(recipe.id)}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onOpenImport}
        className="fixed bottom-24 right-5 z-20 grid size-15 place-items-center rounded-full bg-sky-500 text-white shadow-xl shadow-sky-300 transition active:scale-95 sm:absolute"
        aria-label="Добавить рецепт"
      >
        <Plus size={27} />
      </button>

      <BottomSheet open={importOpen} title="Добавить рецепт" onClose={onCloseImport}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="recipe-url">
              Ссылка на рецепт
            </label>
            <input
              id="recipe-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://.../recipe/..."
              disabled={busy}
              className="w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3.5 outline-none transition placeholder:text-slate-300 focus:border-sky-400 focus:bg-white"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Food.ru', 'https://food.ru/recipes'],
              ['Рамблер/Еда', 'https://eda.rambler.ru/recepty'],
              ['Gastronom.ru', 'https://www.gastronom.ru/recipe'],
              ['Яндекс Лавка', 'https://lavka.yandex.ru/recipes2'],
            ].map(([label, sourceUrl]) => (
              <button
                key={label}
                type="button"
                onClick={() => openExternal(sourceUrl)}
                className="flex items-center justify-between rounded-2xl border border-slate-100 px-3 py-3 text-left text-xs font-semibold text-slate-600"
              >
                {label} <ChevronRight size={15} />
              </button>
            ))}
          </div>
          {importJob?.status === 'failed' && (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {importJob.error_message ?? 'Не удалось добавить рецепт'}
            </p>
          )}
          <button
            type="submit"
            disabled={!url.trim() || busy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 py-3.5 font-bold text-white shadow-lg shadow-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <>
                <LoaderCircle className="animate-spin" size={19} /> Обрабатываем рецепт…
              </>
            ) : (
              <>
                <Send size={18} /> Добавить рецепт
              </>
            )}
          </button>
          {busy && (
            <p className="text-center text-xs leading-5 text-slate-400">
              Окно можно закрыть — импорт продолжится в фоне.
            </p>
          )}
        </form>
      </BottomSheet>
    </section>
  )
}

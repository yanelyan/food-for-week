import { ChevronRight, LoaderCircle, Pencil, Plus, Send, Utensils } from 'lucide-react'
import { useState } from 'react'

import { MEAL_LABELS } from '../constants'
import type { ImportJob, RecipeSummary } from '../types'
import { BottomSheet } from '../components/BottomSheet'
import { RecipeImage } from '../components/RecipeImage'

interface Props {
  recipes: RecipeSummary[]
  loading: boolean
  importOpen: boolean
  importJob: ImportJob | null
  onOpenImport: () => void
  onCloseImport: () => void
  onImport: (url: string) => Promise<void>
  onSelect: (recipe: RecipeSummary) => void
  onEdit: (recipeId: number) => void
}

export function RecipesScreen({
  recipes,
  loading,
  importOpen,
  importJob,
  onOpenImport,
  onCloseImport,
  onImport,
  onSelect,
  onEdit,
}: Props) {
  const [url, setUrl] = useState('')
  const busy = importJob?.status === 'pending' || importJob?.status === 'processing'

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!url.trim() || busy) return
    await onImport(url.trim())
    setUrl('')
  }

  return (
    <section className="min-h-full px-4 pb-28 pt-5">
      <header className="mb-5">
        <p className="text-sm font-semibold text-sky-600">Ваша коллекция</p>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Рецепты</h1>
        <p className="mt-1 text-sm text-slate-500">Нажмите на блюдо, чтобы добавить его в неделю</p>
      </header>

      {loading ? (
        <div className="grid min-h-64 place-items-center text-sky-500">
          <LoaderCircle className="animate-spin" size={28} />
        </div>
      ) : recipes.length === 0 ? (
        <div className="mt-16 rounded-[2rem] border border-dashed border-sky-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-sky-100 text-sky-600">
            <Utensils size={30} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Рецептов пока нет</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Добавьте ссылку с food.ru — продукты загрузятся автоматически.
          </p>
          <button
            type="button"
            onClick={onOpenImport}
            className="mt-5 rounded-2xl bg-sky-500 px-5 py-3 font-bold text-white shadow-lg shadow-sky-200"
          >
            Добавить первый рецепт
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {recipes.map((recipe) => (
            <article
              key={recipe.id}
              data-testid={`recipe-${recipe.id}`}
              className="group relative flex overflow-hidden rounded-[1.5rem] border border-sky-100 bg-white shadow-sm transition active:scale-[.99]"
            >
              <button
                type="button"
                onClick={() => onSelect(recipe)}
                className="flex min-w-0 flex-1 items-center text-left"
              >
                <RecipeImage src={recipe.image_url} alt={recipe.title} className="h-28 w-28 shrink-0" />
                <div className="min-w-0 flex-1 px-4 py-3">
                  <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700">
                    {MEAL_LABELS[recipe.meal_type]}
                  </span>
                  <h2 className="mt-2 line-clamp-2 font-bold leading-5 text-slate-900">
                    {recipe.title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">{recipe.ingredient_count} ингредиентов</p>
                </div>
                <ChevronRight className="mr-3 shrink-0 text-sky-300" size={20} />
              </button>
              <button
                type="button"
                onClick={() => onEdit(recipe.id)}
                className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white/90 text-slate-500 shadow-sm"
                aria-label={`Редактировать ${recipe.title}`}
              >
                <Pencil size={14} />
              </button>
            </article>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onOpenImport}
        className="absolute bottom-24 right-5 z-20 grid size-15 place-items-center rounded-full bg-sky-500 text-white shadow-xl shadow-sky-300 transition active:scale-95"
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
              placeholder="https://food.ru/recipes/..."
              disabled={busy}
              className="w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3.5 outline-none transition placeholder:text-slate-300 focus:border-sky-400 focus:bg-white"
              required
            />
          </div>
          <a
            href="https://food.ru/recipes"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3 text-sm font-semibold text-slate-600"
          >
            <span>Поддерживается food.ru</span>
            <ChevronRight size={17} />
          </a>
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

import { LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { api } from './api'
import { BottomNavigation } from './components/BottomNavigation'
import { RecipeEditorSheet } from './components/RecipeEditorSheet'
import { Toast, type ToastData, type ToastKind } from './components/Toast'
import { useSwipeNavigation } from './hooks/useSwipeNavigation'
import { PlanScreen } from './screens/PlanScreen'
import { RecipesScreen } from './screens/RecipesScreen'
import { ShoppingScreen } from './screens/ShoppingScreen'
import type { ImportJob, MealType, Plan, RecipeSummary, ShoppingList, Tab } from './types'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('plan')
  const [recipes, setRecipes] = useState<RecipeSummary[]>([])
  const [plan, setPlan] = useState<Plan | null>(null)
  const [shopping, setShopping] = useState<ShoppingList | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeSummary | null>(null)
  const [editorRecipeId, setEditorRecipeId] = useState<number | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importJob, setImportJob] = useState<ImportJob | null>(null)
  const [toast, setToast] = useState<ToastData | null>(null)
  const toastTimer = useRef<number | null>(null)
  const scrollContainer = useRef<HTMLDivElement | null>(null)
  const swipeHandlers = useSwipeNavigation(activeTab, setActiveTab)

  const showToast = useCallback((message: string, kind: ToastKind = 'success') => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), message, kind })
    toastTimer.current = window.setTimeout(() => setToast(null), 4200)
  }, [])
  const showError = useCallback((message: string) => showToast(message, 'error'), [showToast])

  const refreshRecipes = useCallback(async () => {
    setRecipes(await api.listRecipes())
  }, [])

  const refreshPlanAndShopping = useCallback(async () => {
    const [nextPlan, nextShopping] = await Promise.all([api.getPlan(), api.getShoppingList()])
    setPlan(nextPlan)
    setShopping(nextShopping)
  }, [])

  useEffect(() => {
    scrollContainer.current?.scrollTo({ top: 0 })
  }, [activeTab])

  useEffect(() => {
    window.Telegram?.WebApp?.ready()
    window.Telegram?.WebApp?.expand()
    Promise.all([refreshRecipes(), refreshPlanAndShopping()])
      .catch((error) => showToast(error instanceof Error ? error.message : 'Не удалось загрузить данные', 'error'))
      .finally(() => setLoading(false))
  }, [refreshPlanAndShopping, refreshRecipes, showToast])

  useEffect(() => {
    if (!importJob || !['pending', 'processing'].includes(importJob.status)) return
    const timer = window.setInterval(async () => {
      try {
        const job = await api.getImportJob(importJob.id)
        setImportJob(job)
        if (job.status === 'completed') {
          window.clearInterval(timer)
          setImportOpen(false)
          await refreshRecipes()
          showToast('Рецепт добавлен')
        } else if (job.status === 'failed') {
          window.clearInterval(timer)
          if (!importOpen) showToast(job.error_message ?? 'Ошибка импорта', 'error')
        }
      } catch (error) {
        window.clearInterval(timer)
        showToast(error instanceof Error ? error.message : 'Не удалось проверить импорт', 'error')
      }
    }, 1200)
    return () => window.clearInterval(timer)
  }, [importJob, importOpen, refreshRecipes, showToast])

  const startImport = async (url: string) => {
    try {
      setImportJob(await api.importRecipe(url))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось начать импорт'
      setImportJob({
        id: 'local-error',
        source_url: url,
        status: 'failed',
        recipe_id: null,
        error_message: message,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
  }

  const selectRecipe = (recipe: RecipeSummary) => {
    setSelectedRecipe(recipe)
    setActiveTab('plan')
    showToast('Теперь выберите день и приём пищи', 'info')
  }

  const addToPlan = async (date: string, mealType: MealType) => {
    if (!selectedRecipe) return
    try {
      await api.addToPlan(selectedRecipe.id, date, mealType)
      const recipeTitle = selectedRecipe.title
      setSelectedRecipe(null)
      await refreshPlanAndShopping()
      showToast(`«${recipeTitle}» добавлен в план`)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось добавить блюдо', 'error')
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-sky-50 text-sky-500">
        <div className="text-center">
          <LoaderCircle className="mx-auto animate-spin" size={32} />
          <p className="mt-3 text-sm font-semibold">Собираем вашу неделю…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-sky-100 to-cyan-50 sm:grid sm:place-items-center sm:p-6">
      <div className="relative mx-auto h-dvh w-full max-w-[480px] overflow-hidden bg-[#f7fbfd] sm:h-[min(900px,calc(100dvh-3rem))] sm:rounded-[2.25rem] sm:border sm:border-white sm:shadow-2xl sm:shadow-sky-200/70">
        <Toast toast={toast} onClose={() => setToast(null)} />
        <div
          ref={scrollContainer}
          className="h-full overflow-y-auto overscroll-contain pb-20 [scrollbar-width:none]"
          {...swipeHandlers}
        >
          {activeTab === 'shopping' && (
            <ShoppingScreen
              shopping={shopping}
              onToggle={async (item) => {
                try {
                  await api.updateShoppingCheck(item.ingredient_id, !item.checked)
                  await refreshPlanAndShopping()
                } catch (error) {
                  showToast(error instanceof Error ? error.message : 'Не удалось обновить список', 'error')
                }
              }}
              onReset={async () => {
                try {
                  await api.resetShopping()
                  await refreshPlanAndShopping()
                  showToast('Галочки сброшены')
                } catch (error) {
                  showToast(error instanceof Error ? error.message : 'Не удалось сбросить список', 'error')
                }
              }}
            />
          )}
          {activeTab === 'plan' && (
            <PlanScreen
              plan={plan}
              selectedRecipe={selectedRecipe}
              onCancelSelection={() => setSelectedRecipe(null)}
              onAdd={addToPlan}
              onRemove={async (id) => {
                try {
                  await api.removeFromPlan(id)
                  await refreshPlanAndShopping()
                  showToast('Блюдо убрано из плана')
                } catch (error) {
                  showToast(error instanceof Error ? error.message : 'Не удалось убрать блюдо', 'error')
                }
              }}
              onNeedRecipe={() => setActiveTab('recipes')}
            />
          )}
          {activeTab === 'recipes' && (
            <RecipesScreen
              recipes={recipes}
              loading={false}
              importOpen={importOpen}
              importJob={importJob}
              onOpenImport={() => {
                setImportJob(null)
                setImportOpen(true)
              }}
              onCloseImport={() => setImportOpen(false)}
              onImport={startImport}
              onSelect={selectRecipe}
              onEdit={setEditorRecipeId}
            />
          )}
        </div>
        <BottomNavigation activeTab={activeTab} onChange={setActiveTab} />
        <RecipeEditorSheet
          recipeId={editorRecipeId}
          onClose={() => setEditorRecipeId(null)}
          onSaved={async () => {
            await refreshRecipes()
            await refreshPlanAndShopping()
            showToast('Изменения сохранены')
          }}
          onError={showError}
        />
      </div>
    </main>
  )
}

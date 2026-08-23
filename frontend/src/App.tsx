import { LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { api } from './api'
import { BottomNavigation } from './components/BottomNavigation'
import { PurchaseDaySheet } from './components/PurchaseDaySheet'
import { RecipeEditorSheet } from './components/RecipeEditorSheet'
import { Toast, type ToastData, type ToastKind } from './components/Toast'
import { MEAL_LABELS, TAB_ORDER } from './constants'
import { useSwipeNavigation } from './hooks/useSwipeNavigation'
import { PlanScreen, type PlanFocusRequest } from './screens/PlanScreen'
import { RecipesScreen } from './screens/RecipesScreen'
import { ShoppingScreen } from './screens/ShoppingScreen'
import type {
  ImportJob,
  MealType,
  Plan,
  RecipeSummary,
  ShoppingList,
  Tab,
  UserSettings,
} from './types'
import { parseLocalDate } from './utils/date'

interface PendingSlot {
  date: string
  mealType: MealType
}

function selectionLabel(slot: PendingSlot): string {
  const date = parseLocalDate(slot.date)
  const formatted = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(date)
  return `Выберите блюдо: ${MEAL_LABELS[slot.mealType].toLowerCase()}, ${formatted}`
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('plan')
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right'>('left')
  const [recipes, setRecipes] = useState<RecipeSummary[]>([])
  const [plan, setPlan] = useState<Plan | null>(null)
  const [shopping, setShopping] = useState<ShoppingList | null>(null)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeSummary | null>(null)
  const [pendingSlot, setPendingSlot] = useState<PendingSlot | null>(null)
  const [planFocus, setPlanFocus] = useState<PlanFocusRequest | null>(null)
  const [recipeFilter, setRecipeFilter] = useState<MealType | 'all'>('all')
  const [editorRecipeId, setEditorRecipeId] = useState<number | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [purchaseDayOpen, setPurchaseDayOpen] = useState(false)
  const [savingPurchaseDay, setSavingPurchaseDay] = useState(false)
  const [importJob, setImportJob] = useState<ImportJob | null>(null)
  const [toast, setToast] = useState<ToastData | null>(null)
  const toastTimer = useRef<number | null>(null)
  const scrollContainer = useRef<HTMLDivElement | null>(null)

  const showToast = useCallback((message: string, kind: ToastKind = 'success') => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), message, kind })
    toastTimer.current = window.setTimeout(() => setToast(null), 4200)
  }, [])
  const showError = useCallback((message: string) => showToast(message, 'error'), [showToast])

  const navigate = useCallback(
    (tab: Tab) => {
      if (tab === activeTab) return
      setTransitionDirection(TAB_ORDER.indexOf(tab) > TAB_ORDER.indexOf(activeTab) ? 'left' : 'right')
      setActiveTab(tab)
    },
    [activeTab],
  )
  const swipeHandlers = useSwipeNavigation(activeTab, navigate)

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
    const load = async () => {
      try {
        const nextSettings = await api.getSettings()
        setSettings(nextSettings)
        await refreshRecipes()
        if (nextSettings.purchase_weekday === null) {
          setPurchaseDayOpen(true)
        } else {
          await refreshPlanAndShopping()
        }
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Не удалось загрузить данные', 'error')
      } finally {
        setLoading(false)
      }
    }
    void load()
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

  const addRecipeToPlan = async (recipe: RecipeSummary, date: string, mealType: MealType) => {
    try {
      await api.addToPlan(recipe.id, date, mealType)
      setSelectedRecipe(null)
      setPendingSlot(null)
      await refreshPlanAndShopping()
      setPlanFocus({ date, mealType, key: Date.now() })
      navigate('plan')
      showToast(`«${recipe.title}» добавлен: ${MEAL_LABELS[mealType].toLowerCase()}`)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось добавить блюдо', 'error')
    }
  }

  const chooseRecipeForPlan = (recipe: RecipeSummary) => {
    if (pendingSlot) {
      void addRecipeToPlan(recipe, pendingSlot.date, pendingSlot.mealType)
      return
    }
    setSelectedRecipe(recipe)
    navigate('plan')
    showToast('Теперь выберите день и приём пищи', 'info')
  }

  const savePurchaseDay = async (weekday: number) => {
    if (
      settings?.purchase_weekday !== null &&
      settings?.purchase_weekday !== weekday &&
      !window.confirm('Период списка изменится, а текущие галочки будут сброшены. Продолжить?')
    ) {
      return
    }
    setSavingPurchaseDay(true)
    try {
      const timezoneName = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      const nextSettings = await api.updateSettings(weekday, timezoneName)
      setSettings(nextSettings)
      await refreshPlanAndShopping()
      setPurchaseDayOpen(false)
      showToast('День закупок сохранён')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось сохранить день', 'error')
    } finally {
      setSavingPurchaseDay(false)
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
          <div key={activeTab} className={`screen-enter-${transitionDirection}`}>
            {activeTab === 'shopping' && (
              <ShoppingScreen
                shopping={shopping}
                onChangePurchaseDay={() => setPurchaseDayOpen(true)}
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
                focusRequest={planFocus}
                onCancelSelection={() => setSelectedRecipe(null)}
                onAdd={async (date, mealType) => {
                  if (selectedRecipe) await addRecipeToPlan(selectedRecipe, date, mealType)
                }}
                onRemove={async (id) => {
                  try {
                    await api.removeFromPlan(id)
                    await refreshPlanAndShopping()
                    showToast('Блюдо убрано из плана')
                  } catch (error) {
                    showToast(error instanceof Error ? error.message : 'Не удалось убрать блюдо', 'error')
                  }
                }}
                onNeedRecipe={(date, mealType) => {
                  setPendingSlot({ date, mealType })
                  setRecipeFilter(mealType)
                  navigate('recipes')
                }}
                onChangePurchaseDay={() => setPurchaseDayOpen(true)}
              />
            )}
            {activeTab === 'recipes' && (
              <RecipesScreen
                recipes={recipes}
                loading={false}
                importOpen={importOpen}
                importJob={importJob}
                filter={recipeFilter}
                selectionLabel={pendingSlot ? selectionLabel(pendingSlot) : null}
                onFilterChange={setRecipeFilter}
                onOpenImport={() => {
                  setImportJob(null)
                  setImportOpen(true)
                }}
                onCloseImport={() => setImportOpen(false)}
                onImport={startImport}
                onPlan={chooseRecipeForPlan}
                onEdit={setEditorRecipeId}
                onCancelSelection={() => setPendingSlot(null)}
              />
            )}
          </div>
        </div>
        <BottomNavigation activeTab={activeTab} onChange={navigate} />
        <RecipeEditorSheet
          recipeId={editorRecipeId}
          onClose={() => setEditorRecipeId(null)}
          onSaved={async () => {
            await refreshRecipes()
            if (settings?.purchase_weekday !== null) await refreshPlanAndShopping()
            showToast('Изменения сохранены')
          }}
          onError={showError}
        />
        <PurchaseDaySheet
          open={purchaseDayOpen}
          currentDay={settings?.purchase_weekday ?? null}
          required={settings?.purchase_weekday === null}
          saving={savingPurchaseDay}
          onClose={() => setPurchaseDayOpen(false)}
          onSave={savePurchaseDay}
        />
      </div>
    </main>
  )
}

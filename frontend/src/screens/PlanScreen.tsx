import { CalendarDays, ChevronLeft, ExternalLink, Trash2, UtensilsCrossed } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { RecipeImage } from '../components/RecipeImage'
import { PURCHASE_DAY_LABELS } from '../components/PurchaseDaySheet'
import { MEAL_LABELS, MEAL_ORDER } from '../constants'
import type { MealType, Plan, PlannedRecipe, RecipeSummary } from '../types'
import { buildPeriodDays, formatPeriodDate, parseLocalDate } from '../utils/date'
import { openExternal } from '../utils/openExternal'

const DAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

function dishCount(value: number): string {
  const lastTwo = value % 100
  const last = value % 10
  if (lastTwo >= 11 && lastTwo <= 14) return `${value} блюд`
  if (last === 1) return `${value} блюдо`
  if (last >= 2 && last <= 4) return `${value} блюда`
  return `${value} блюд`
}

function pythonWeekday(date: Date): number {
  return (date.getDay() + 6) % 7
}

function PlannedCard({ item, onRemove }: { item: PlannedRecipe; onRemove: () => void }) {
  const startX = useRef<number | null>(null)
  const [offset, setOffset] = useState(0)

  return (
    <div
      data-no-page-swipe
      className="relative overflow-hidden rounded-2xl bg-rose-500"
      onTouchStart={(event) => {
        startX.current = event.touches[0].clientX
      }}
      onTouchMove={(event) => {
        if (startX.current === null) return
        setOffset(Math.max(-88, Math.min(0, event.touches[0].clientX - startX.current)))
      }}
      onTouchEnd={() => {
        if (offset < -62) onRemove()
        setOffset(0)
        startX.current = null
      }}
    >
      <div className="absolute inset-y-0 right-0 flex w-20 items-center justify-center text-white">
        <Trash2 size={20} />
      </div>
      <div
        className="relative flex items-center gap-3 bg-white p-2.5 transition-transform"
        style={{ transform: `translateX(${offset}px)` }}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            openExternal(item.recipe.source_url)
          }}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <RecipeImage
            src={item.recipe.image_url}
            alt={item.recipe.title}
            className="size-14 shrink-0 rounded-xl"
          />
          <p className="min-w-0 flex-1 line-clamp-2 text-sm font-bold text-slate-800">
            {item.recipe.title}
          </p>
          <ExternalLink className="shrink-0 text-sky-300" size={16} />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
          className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-300 hover:bg-rose-50 hover:text-rose-500"
          aria-label="Убрать блюдо"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}

export interface PlanFocusRequest {
  date: string
  mealType: MealType
  key: number
}

interface Props {
  plan: Plan | null
  selectedRecipe: RecipeSummary | null
  focusRequest: PlanFocusRequest | null
  onCancelSelection: () => void
  onAdd: (date: string, mealType: MealType) => Promise<void>
  onRemove: (id: number) => Promise<void>
  onClearCurrentWeek: () => Promise<void>
  onNeedRecipe: (date: string, mealType: MealType) => void
  onChangePurchaseDay: () => void
}

export function PlanScreen({
  plan,
  selectedRecipe,
  focusRequest,
  onCancelSelection,
  onAdd,
  onRemove,
  onClearCurrentWeek,
  onNeedRecipe,
  onChangePurchaseDay,
}: Props) {
  const days = useMemo(
    () => (plan ? buildPeriodDays(plan.period.start, plan.period.end) : []),
    [plan],
  )
  const [selectedDate, setSelectedDate] = useState('')
  const dayButtons = useRef<Record<string, HTMLButtonElement | null>>({})
  const mealBlocks = useRef<Record<string, HTMLElement | null>>({})

  useEffect(() => {
    if (!plan) return
    const nextDate = focusRequest?.date ?? plan.today
    if (days.includes(nextDate)) setSelectedDate(nextDate)
  }, [days, focusRequest, plan])

  useEffect(() => {
    if (!selectedDate) return
    dayButtons.current[selectedDate]?.scrollIntoView({ behavior: 'smooth', inline: 'center' })
  }, [selectedDate])

  useEffect(() => {
    if (!focusRequest || selectedDate !== focusRequest.date) return
    window.setTimeout(() => {
      mealBlocks.current[focusRequest.mealType]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 120)
  }, [focusRequest, selectedDate])

  const selectedDateObject = selectedDate ? parseLocalDate(selectedDate) : null

  return (
    <section className="min-h-full pb-28 pt-5">
      <header className="px-4">
        <button
          type="button"
          onClick={onChangePurchaseDay}
          className="text-left text-sm font-semibold text-sky-600"
        >
          {plan ? `Ваш день закупок — ${PURCHASE_DAY_LABELS[plan.purchase_weekday].toLowerCase()}` : 'День закупок'}
        </button>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Моя неделя</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
          <CalendarDays size={15} />{' '}
          {plan
            ? `${formatPeriodDate(plan.period.start)} — ${formatPeriodDate(plan.period.end)}`
            : 'Период не выбран'}
        </p>
      </header>

      <div className="mt-5 flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
        {days.map((dateValue) => {
          const date = parseLocalDate(dateValue)
          const active = selectedDate === dateValue
          const past = Boolean(plan && dateValue < plan.today)
          const purchaseDay = Boolean(plan && pythonWeekday(date) === plan.purchase_weekday)
          return (
            <button
              key={dateValue}
              ref={(element) => {
                dayButtons.current[dateValue] = element
              }}
              type="button"
              disabled={past}
              onClick={() => setSelectedDate(dateValue)}
              className={`relative flex min-w-15 flex-col items-center rounded-2xl px-3 py-2.5 transition ${
                active
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-200'
                  : 'border border-sky-100 bg-white text-slate-500'
              } ${purchaseDay ? 'ring-2 ring-cyan-400 ring-offset-2' : ''} ${
                past ? 'cursor-not-allowed opacity-40' : ''
              }`}
            >
              <span className="text-[11px] font-bold uppercase">{DAYS[date.getDay()]}</span>
              <span className="mt-0.5 text-xl font-black">{date.getDate()}</span>
            </button>
          )
        })}
      </div>

      {selectedDateObject && (
        <p className="px-4 pt-1 text-sm font-semibold text-slate-500">
          {selectedDateObject.getDate()} {MONTHS[selectedDateObject.getMonth()]}
        </p>
      )}

      {selectedRecipe && (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sky-900">
          <ChevronLeft size={18} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-sky-600">Выберите приём пищи</p>
            <p className="truncate text-sm font-bold">{selectedRecipe.title}</p>
          </div>
          <button type="button" onClick={onCancelSelection} className="text-xs font-bold text-sky-600">
            Отмена
          </button>
        </div>
      )}

      <div className="space-y-3 px-4 pt-4">
        {MEAL_ORDER.map((mealType) => {
          const items =
            plan?.items.filter(
              (item) => item.planned_date === selectedDate && item.meal_type === mealType,
            ) ?? []
          return (
            <section
              key={mealType}
              ref={(element) => {
                mealBlocks.current[mealType] = element
              }}
              data-testid={`meal-${mealType}`}
              className={`rounded-[1.65rem] border p-3.5 transition ${
                selectedRecipe
                  ? 'selection-breathe cursor-pointer border-sky-300 bg-sky-50/80 ring-2 ring-sky-100'
                  : 'border-sky-100 bg-white'
              }`}
              onClick={() => {
                if (selectedRecipe) void onAdd(selectedDate, mealType)
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-black text-slate-800">{MEAL_LABELS[mealType]}</h2>
                <span className="text-xs font-semibold text-slate-400">
                  {items.length ? dishCount(items.length) : 'Не выбрано'}
                </span>
              </div>
              {items.length > 0 && (
                <div className="mb-2 space-y-2">
                  {items.map((item) => (
                    <PlannedCard key={item.id} item={item} onRemove={() => void onRemove(item.id)} />
                  ))}
                </div>
              )}
              <button
                type="button"
                aria-label={
                  selectedRecipe
                    ? `Добавить «${selectedRecipe.title}»`
                    : items.length
                      ? `Выбрать ещё рецепт для ${MEAL_LABELS[mealType].toLowerCase()}`
                      : `Выбрать рецепт для ${MEAL_LABELS[mealType].toLowerCase()}`
                }
                onClick={(event) => {
                  event.stopPropagation()
                  if (selectedRecipe) void onAdd(selectedDate, mealType)
                  else onNeedRecipe(selectedDate, mealType)
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-sky-200 py-3.5 text-sm font-semibold text-sky-500"
              >
                <UtensilsCrossed size={17} />
                {selectedRecipe
                  ? `Добавить «${selectedRecipe.title}»`
                  : items.length
                    ? 'Выбрать ещё рецепт'
                    : 'Выбрать рецепт'}
              </button>
            </section>
          )
        })}
      </div>
      <div className="px-4 pt-8">
        <button
          type="button"
          onClick={() => void onClearCurrentWeek()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white py-3.5 text-sm font-bold text-rose-500"
        >
          <Trash2 size={17} /> Очистить меню текущей недели
        </button>
      </div>
    </section>
  )
}

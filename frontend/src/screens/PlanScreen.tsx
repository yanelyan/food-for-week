import { CalendarDays, ChevronLeft, Trash2, UtensilsCrossed } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { MEAL_LABELS, MEAL_ORDER } from '../constants'
import type { MealType, Plan, PlannedRecipe, RecipeSummary } from '../types'
import { buildPeriodDays, parseLocalDate } from '../utils/date'
import { RecipeImage } from '../components/RecipeImage'

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
        <RecipeImage
          src={item.recipe.image_url}
          alt={item.recipe.title}
          className="size-14 shrink-0 rounded-xl"
        />
        <p className="min-w-0 flex-1 line-clamp-2 text-sm font-bold text-slate-800">
          {item.recipe.title}
        </p>
        <button
          type="button"
          onClick={onRemove}
          className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-300 hover:bg-rose-50 hover:text-rose-500"
          aria-label="Убрать блюдо"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}

interface Props {
  plan: Plan | null
  selectedRecipe: RecipeSummary | null
  onCancelSelection: () => void
  onAdd: (date: string, mealType: MealType) => Promise<void>
  onRemove: (id: number) => Promise<void>
  onNeedRecipe: () => void
}

export function PlanScreen({
  plan,
  selectedRecipe,
  onCancelSelection,
  onAdd,
  onRemove,
  onNeedRecipe,
}: Props) {
  const days = useMemo(() => (plan ? buildPeriodDays(plan.period.start) : []), [plan])
  const [selectedDate, setSelectedDate] = useState('')

  useEffect(() => {
    if (days.length > 0 && !days.includes(selectedDate)) setSelectedDate(days[0])
  }, [days, selectedDate])

  const selectedDateObject = selectedDate ? parseLocalDate(selectedDate) : null

  return (
    <section className="min-h-full pb-28 pt-5">
      <header className="px-4">
        <p className="text-sm font-semibold text-sky-600">План на семь дней</p>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Моя неделя</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
          <CalendarDays size={15} />
          {plan ? `${plan.period.start.split('-').reverse().join('.')} — ${plan.period.end.split('-').reverse().join('.')}` : 'Загрузка…'}
        </p>
      </header>

      <div className="mt-5 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        {days.map((dateValue) => {
          const date = parseLocalDate(dateValue)
          const active = selectedDate === dateValue
          return (
            <button
              key={dateValue}
              type="button"
              onClick={() => setSelectedDate(dateValue)}
              className={`flex min-w-15 flex-col items-center rounded-2xl px-3 py-2.5 transition ${
                active
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-200'
                  : 'border border-sky-100 bg-white text-slate-500'
              }`}
            >
              <span className="text-[11px] font-bold uppercase">{DAYS[date.getDay()]}</span>
              <span className="mt-0.5 text-xl font-black">{date.getDate()}</span>
            </button>
          )
        })}
      </div>

      {selectedDateObject && (
        <p className="px-4 pt-2 text-sm font-semibold text-slate-500">
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
              data-testid={`meal-${mealType}`}
              className={`rounded-[1.65rem] border p-3.5 transition ${
                selectedRecipe
                  ? 'cursor-pointer border-sky-300 bg-sky-50/80 ring-2 ring-sky-100'
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
              {items.length ? (
                <div className="space-y-2">
                  {items.map((item) => (
                    <PlannedCard key={item.id} item={item} onRemove={() => void onRemove(item.id)} />
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    if (selectedRecipe) void onAdd(selectedDate, mealType)
                    else onNeedRecipe()
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-sky-200 py-4 text-sm font-semibold text-sky-500"
                >
                  <UtensilsCrossed size={17} />
                  {selectedRecipe ? `Добавить «${selectedRecipe.title}»` : 'Выбрать рецепт'}
                </button>
              )}
            </section>
          )
        })}
      </div>
    </section>
  )
}

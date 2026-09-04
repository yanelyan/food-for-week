import { Check, Home, Info, RotateCcw, ShoppingBasket } from 'lucide-react'
import { useState } from 'react'

import { BottomSheet } from '../components/BottomSheet'
import { PURCHASE_DAY_AFTER_IN } from '../components/PurchaseDaySheet'
import type { ShoppingItem, ShoppingList } from '../types'
import { formatPeriodDate } from '../utils/date'

interface Props {
  shopping: ShoppingList | null
  onToggle: (item: ShoppingItem) => Promise<void>
  onReset: () => Promise<void>
  onChangePurchaseDay: () => void
}

function ItemRows({
  items,
  onToggle,
  onHint,
  strikeChecked = true,
}: {
  items: ShoppingItem[]
  onToggle: (item: ShoppingItem) => Promise<void>
  onHint: (item: ShoppingItem) => void
  strikeChecked?: boolean
}) {
  return items.map((item, index) => (
    <div
      key={item.ingredient_id}
      data-testid={`shopping-${item.ingredient_id}`}
      className={`flex items-center gap-3 px-4 py-4 ${index ? 'border-t border-sky-50' : ''}`}
    >
      <button
        type="button"
        onClick={() => void onToggle(item)}
        className={`grid size-7 shrink-0 place-items-center rounded-lg border-2 transition ${
          item.checked
            ? 'border-sky-500 bg-sky-500 text-white'
            : 'border-sky-200 bg-white text-transparent'
        }`}
        aria-label={item.checked ? `Убрать отметку ${item.name}` : `Отметить ${item.name}`}
      >
        <Check size={17} strokeWidth={3} />
      </button>
      <button
        type="button"
        onClick={() => void onToggle(item)}
        className="min-w-0 flex-1 text-left"
      >
        <p
          className={`font-semibold transition ${
            item.checked && strikeChecked ? 'text-slate-300 line-through' : 'text-slate-800'
          }`}
        >
          {item.name}
        </p>
        <p
          className={`mt-0.5 text-sm ${
            item.checked && strikeChecked ? 'text-slate-300' : 'text-slate-500'
          }`}
        >
          {item.display_amount}
        </p>
      </button>
      {item.conversion_hint && (
        <button
          type="button"
          onClick={() => onHint(item)}
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-500"
          aria-label="Показать перевод единиц"
        >
          <Info size={17} />
        </button>
      )}
    </div>
  ))
}

export function ShoppingScreen({
  shopping,
  onToggle,
  onReset,
  onChangePurchaseDay,
}: Props) {
  const [hint, setHint] = useState<ShoppingItem | null>(null)
  const checked = shopping?.items.filter((item) => item.checked).length ?? 0
  const total = shopping?.items.length ?? 0
  const pantryItems = shopping?.pantry_items ?? []

  return (
    <section className="min-h-full px-4 pb-28 pt-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onChangePurchaseDay}
            className="text-left text-sm font-semibold text-sky-600"
          >
            {shopping
              ? `Не забудьте закупиться в ${PURCHASE_DAY_AFTER_IN[shopping.purchase_weekday]}`
              : 'День закупок'}
          </button>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Список покупок</h1>
          <p className="mt-1 text-sm text-slate-500">
            {total ? `Куплено ${checked} из ${total}` : 'Основной список пока пуст'}
          </p>
          {shopping && (
            <p className="mt-1 text-xs font-semibold text-slate-400">
              {formatPeriodDate(shopping.period.start)} — {formatPeriodDate(shopping.period.end)}
            </p>
          )}
        </div>
        {total > 0 && (
          <button
            type="button"
            onClick={() => void onReset()}
            className="grid size-11 shrink-0 place-items-center rounded-2xl border border-sky-100 bg-white text-sky-600"
            aria-label="Сбросить галочки"
          >
            <RotateCcw size={18} />
          </button>
        )}
      </header>

      {total > 0 && (
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-sky-100">
          <div
            className="h-full rounded-full bg-sky-500 transition-all duration-300"
            style={{ width: `${(checked / total) * 100}%` }}
          />
        </div>
      )}

      {!shopping || (total === 0 && pantryItems.length === 0) ? (
        <div className="mt-16 rounded-[2rem] border border-dashed border-sky-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-sky-100 text-sky-600">
            <ShoppingBasket size={30} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Список пока пуст</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Добавьте рецепты в план — продукты появятся здесь автоматически.
          </p>
        </div>
      ) : (
        <>
          {total > 0 && (
            <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-sky-100 bg-white shadow-sm">
              <ItemRows items={shopping.items} onToggle={onToggle} onHint={setHint} />
            </div>
          )}

          {pantryItems.length > 0 && (
            <section className="mt-7">
              <div className="mb-3 flex items-center gap-2 px-1">
                <div className="grid size-8 place-items-center rounded-xl bg-cyan-100 text-cyan-700">
                  <Home size={17} />
                </div>
                <div>
                  <h2 className="font-black text-slate-900">Должно быть дома</h2>
                  <p className="text-xs text-slate-400">Снимите галочку, если продукт закончился</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-[1.75rem] border border-cyan-100 bg-white shadow-sm">
                <ItemRows
                  items={pantryItems}
                  onToggle={onToggle}
                  onHint={setHint}
                  strikeChecked={false}
                />
              </div>
            </section>
          )}
        </>
      )}

      <BottomSheet open={hint !== null} title="Перевод единиц" onClose={() => setHint(null)}>
        {hint && (
          <div className="rounded-2xl bg-sky-50 p-4">
            <p className="font-bold text-slate-900">{hint.name}</p>
            <p className="mt-1 text-sm text-slate-600">В списке: {hint.display_amount}</p>
            <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-sky-700">
              {hint.conversion_hint}
            </p>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              Подсказка сохраняет эквивалент из источника или показывает проверенный перевод меры.
            </p>
          </div>
        )}
      </BottomSheet>
    </section>
  )
}

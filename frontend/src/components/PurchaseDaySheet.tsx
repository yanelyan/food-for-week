import { CalendarCheck, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

import { BottomSheet } from './BottomSheet'

export const PURCHASE_DAY_LABELS = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
]

export const PURCHASE_DAY_AFTER_IN = [
  'понедельник',
  'вторник',
  'среду',
  'четверг',
  'пятницу',
  'субботу',
  'воскресенье',
]

interface Props {
  open: boolean
  currentDay: number | null
  required: boolean
  saving: boolean
  onClose: () => void
  onSave: (weekday: number) => Promise<void>
}

export function PurchaseDaySheet({
  open,
  currentDay,
  required,
  saving,
  onClose,
  onSave,
}: Props) {
  const [selectedDay, setSelectedDay] = useState<number | null>(currentDay)

  useEffect(() => {
    if (open) setSelectedDay(currentDay)
  }, [currentDay, open])

  return (
    <BottomSheet
      open={open}
      title={required ? 'Выберите день закупок' : 'Изменить день закупок'}
      onClose={onClose}
      dismissible={!required}
    >
      <div className="mb-5 flex gap-3 rounded-2xl bg-sky-50 p-4 text-sm leading-5 text-slate-600">
        <CalendarCheck className="mt-0.5 shrink-0 text-sky-500" size={21} />
        <p>
          Список будет учитывать блюда со следующего дня после закупки до следующего дня закупки
          включительно.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {PURCHASE_DAY_LABELS.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setSelectedDay(index)}
            className={`rounded-2xl border px-3 py-3 text-sm font-bold transition ${
              selectedDay === index
                ? 'border-sky-500 bg-sky-500 text-white shadow-lg shadow-sky-200'
                : 'border-sky-100 bg-white text-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={selectedDay === null || saving}
        onClick={() => selectedDay !== null && void onSave(selectedDay)}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 py-3.5 font-bold text-white shadow-lg shadow-sky-200 disabled:opacity-50"
      >
        {saving && <LoaderCircle className="animate-spin" size={18} />}
        Продолжить
      </button>
    </BottomSheet>
  )
}

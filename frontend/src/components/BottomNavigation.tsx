import { BookOpen, CalendarDays, ShoppingBasket } from 'lucide-react'

import { TAB_LABELS, TAB_ORDER } from '../constants'
import type { Tab } from '../types'

const ICONS = {
  shopping: ShoppingBasket,
  plan: CalendarDays,
  recipes: BookOpen,
}

interface Props {
  activeTab: Tab
  onChange: (tab: Tab) => void
}

export function BottomNavigation({ activeTab, onChange }: Props) {
  return (
    <nav className="absolute inset-x-0 bottom-0 z-30 border-t border-sky-100 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
      <div className="grid grid-cols-3 gap-2">
        {TAB_ORDER.map((tab) => {
          const Icon = ICONS[tab]
          const active = tab === activeTab
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onChange(tab)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-sky-400 ${
                active ? 'bg-sky-100 text-sky-700' : 'text-slate-400 active:bg-slate-100'
              }`}
            >
              <Icon size={21} strokeWidth={active ? 2.5 : 2} />
              {TAB_LABELS[tab]}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

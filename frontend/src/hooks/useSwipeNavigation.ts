import { useRef } from 'react'

import type { Tab } from '../types'
import { TAB_ORDER } from '../constants'

export function useSwipeNavigation(activeTab: Tab, onChange: (tab: Tab) => void) {
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  return {
    onTouchStart: (event: React.TouchEvent<HTMLElement>) => {
      const touch = event.touches[0]
      const target = event.target as HTMLElement
      if (
        touch.clientX < 24 ||
        target.closest('button, a, input, select, textarea, [data-no-page-swipe]')
      ) {
        touchStart.current = null
        return
      }
      touchStart.current = { x: touch.clientX, y: touch.clientY }
    },
    onTouchEnd: (event: React.TouchEvent<HTMLElement>) => {
      if (!touchStart.current) return
      const touch = event.changedTouches[0]
      const dx = touch.clientX - touchStart.current.x
      const dy = touch.clientY - touchStart.current.y
      touchStart.current = null
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.25) return
      const currentIndex = TAB_ORDER.indexOf(activeTab)
      const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1
      if (nextIndex >= 0 && nextIndex < TAB_ORDER.length) {
        onChange(TAB_ORDER[nextIndex])
      }
    },
  }
}

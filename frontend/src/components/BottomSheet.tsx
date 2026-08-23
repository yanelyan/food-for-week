import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  dismissible?: boolean
}

export function BottomSheet({ open, title, onClose, children, dismissible = true }: Props) {
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/30 backdrop-blur-[2px]">
      {dismissible && (
        <button className="absolute inset-0" type="button" aria-label="Закрыть" onClick={onClose} />
      )}
      <section
        data-no-page-swipe
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 mx-auto max-h-[86dvh] w-full max-w-[480px] touch-pan-y overflow-y-auto overscroll-contain rounded-t-[2rem] bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl [-webkit-overflow-scrolling:touch]"
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-500"
              aria-label="Закрыть"
            >
              <X size={20} />
            </button>
          )}
        </div>
        {children}
      </section>
    </div>,
    document.body,
  )
}

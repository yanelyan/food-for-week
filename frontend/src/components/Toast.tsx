import { CheckCircle2, CircleAlert, X } from 'lucide-react'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastData {
  id: number
  message: string
  kind: ToastKind
}

interface Props {
  toast: ToastData | null
  onClose: () => void
}

export function Toast({ toast, onClose }: Props) {
  if (!toast) return null
  const Icon = toast.kind === 'error' ? CircleAlert : CheckCircle2
  return (
    <div className="absolute inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-[70] animate-[toast-in_.2s_ease-out]">
      <div
        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg ${
          toast.kind === 'error'
            ? 'border-rose-200 bg-rose-50 text-rose-800'
            : 'border-sky-200 bg-white text-slate-800'
        }`}
      >
        <Icon className={toast.kind === 'error' ? 'text-rose-500' : 'text-sky-500'} size={21} />
        <p className="min-w-0 flex-1 text-sm font-medium">{toast.message}</p>
        <button type="button" onClick={onClose} aria-label="Закрыть уведомление">
          <X size={18} />
        </button>
      </div>
    </div>
  )
}

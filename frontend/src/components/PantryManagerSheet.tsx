import { Home, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { PantryProduct } from '../types'
import { BottomSheet } from './BottomSheet'

interface Props {
  open: boolean
  products: PantryProduct[]
  loading: boolean
  saving: boolean
  onClose: () => void
  onAdd: (name: string) => Promise<boolean>
  onRemove: (product: PantryProduct) => Promise<void>
}

export function PantryManagerSheet({
  open,
  products,
  loading,
  saving,
  onClose,
  onAdd,
  onRemove,
}: Props) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (!open) setName('')
  }, [open])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const cleaned = name.trim()
    if (!cleaned || saving) return
    if (await onAdd(cleaned)) setName('')
  }

  return (
    <BottomSheet open={open} title="Должно быть дома" onClose={onClose}>
      <div className="rounded-2xl bg-cyan-50 p-4 text-sm leading-5 text-slate-600">
        <div className="flex gap-3">
          <Home className="mt-0.5 shrink-0 text-cyan-600" size={20} />
          <p>
            Добавленные продукты будут попадать сюда во всех сохранённых и будущих рецептах этого
            аккаунта.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-4 flex gap-2">
        <label className="sr-only" htmlFor="pantry-product-name">
          Название продукта
        </label>
        <input
          id="pantry-product-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Например, кофе"
          maxLength={180}
          disabled={saving}
          className="min-w-0 flex-1 rounded-2xl border border-cyan-100 bg-cyan-50/50 px-4 py-3 outline-none transition placeholder:text-slate-300 focus:border-cyan-400 focus:bg-white"
        />
        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="grid size-12 shrink-0 place-items-center rounded-2xl bg-cyan-500 text-white shadow-lg shadow-cyan-100 disabled:opacity-50"
          aria-label="Добавить домашний продукт"
        >
          {saving ? <LoaderCircle className="animate-spin" size={19} /> : <Plus size={22} />}
        </button>
      </form>

      <div className="mt-6">
        <h3 className="text-sm font-black text-slate-900">Ваш список</h3>
        {loading ? (
          <div className="grid min-h-28 place-items-center text-cyan-500">
            <LoaderCircle className="animate-spin" size={24} />
          </div>
        ) : products.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-cyan-200 px-4 py-5 text-center text-sm text-slate-400">
            Пока ничего не добавлено
          </p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-2xl border border-cyan-100">
            {products.map((product, index) => (
              <div
                key={product.id}
                className={`flex items-center gap-3 bg-white px-4 py-3 ${index ? 'border-t border-cyan-50' : ''}`}
              >
                <span className="min-w-0 flex-1 font-semibold text-slate-700">{product.name}</span>
                <button
                  type="button"
                  onClick={() => void onRemove(product)}
                  disabled={saving}
                  className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-300 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"
                  aria-label={`Убрать ${product.name} из домашних продуктов`}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  )
}

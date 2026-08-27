'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'

type Product = {
  id: string
  name: string | null
  product_code: string | null
  stock_quantity: number | null
  boxes: number | null
  image_url: string | null
}

export default function ProductShowcaseClient({
  products,
  isAdmin,
  fallbackImage,
}: {
  products: Product[]
  isAdmin: boolean
  fallbackImage: string
}) {
  const [selected, setSelected] = useState<Product | null>(null)
  const [visible, setVisible] = useState(false) // controls the enter/exit animation
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<Partial<Product>>({})
  const [saving, setSaving] = useState(false)
  const [localProducts, setLocalProducts] = useState<Product[]>(products)

  // Open modal with a smooth pop-in
  const openModal = (p: Product) => {
    setSelected(p)
    setForm(p)
    setIsEditing(false)
    // next tick so the transition can animate from the initial state
    requestAnimationFrame(() => setVisible(true))
  }

  // Close modal with a smooth pop-out, then unmount
  const closeModal = () => {
    setVisible(false)
    setTimeout(() => {
      setSelected(null)
      setIsEditing(false)
    }, 200)
  }

  // Close on ESC key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeModal()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)

    const { error } = await supabase
      .from('products')
      .update({
        name: form.name,
        stock_quantity: form.stock_quantity,
        boxes: form.boxes,
        image_url: form.image_url,
      })
      .eq('id', selected.id)

    setSaving(false)

    if (!error) {
      const updated = { ...selected, ...form } as Product
      setLocalProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      setSelected(updated)
      setIsEditing(false)
    } else {
      alert('Failed to save: ' + error.message)
    }
  }

  return (
    <>
      {/* Carousel */}
      <div className="relative max-w-6xl mx-auto">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-slate-50 to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-slate-50 to-transparent z-10" />

        <div className="flex gap-8 overflow-x-auto snap-x snap-mandatory pb-8 pt-4 px-4 -mx-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {localProducts.map((p) => {
            const isAvailable = !!p.stock_quantity && p.stock_quantity > 0

            return (
              <div
                key={p.id}
                className="snap-center shrink-0 w-[320px] bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 group border border-slate-100 hover:-translate-y-2 hover:rotate-1"
              >
                <div className="h-64 overflow-hidden bg-slate-200 relative">
                  <img
                    src={p.image_url?.trim() || fallbackImage}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    alt={p.name || ''}
                  />
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
                </div>

                <div className="p-7">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-extrabold text-slate-800 leading-tight mb-1">
                        {p.name || 'Unnamed Product'}
                      </h3>
                      <code className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase font-mono">
                        CODE: {p.product_code}
                      </code>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-black ${isAvailable ? 'text-blue-600' : 'text-slate-400'}`}>
                        {p.stock_quantity?.toLocaleString() || '0'}
                        <span className="text-xs font-bold text-slate-400 uppercase ml-1">kg</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-50">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${isAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className={`text-sm font-bold ${isAvailable ? 'text-slate-700' : 'text-red-500'}`}>
                        {isAvailable ? `In Stock · ${p.boxes || 0} boxes` : 'Out of Stock'}
                      </span>
                    </div>
                    <button
                      onClick={() => openModal(p)}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal */}
      {selected && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={closeModal}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

          {/* Card */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl transform transition-all duration-200 ease-out ${
              visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
            }`}
          >
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-slate-600 hover:bg-white hover:text-slate-900 shadow transition-colors"
              aria-label="Close"
            >
              ✕
            </button>

            {/* Image on top */}
            <div className="h-72 bg-slate-200 overflow-hidden relative">
              {isEditing ? (
                <input
                  className="absolute bottom-3 left-3 right-3 text-xs bg-white/90 rounded-lg px-3 py-2 shadow"
                  placeholder="Image URL"
                  value={form.image_url || ''}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                />
              ) : null}
              <img
                src={(isEditing ? form.image_url : selected.image_url)?.trim() || fallbackImage}
                className="w-full h-full object-cover"
                alt={selected.name || ''}
              />
            </div>

            {/* Content below */}
            <div className="p-7">
              <code className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase font-mono">
                CODE: {selected.product_code}
              </code>

              {isEditing ? (
                <input
                  className="mt-2 w-full text-2xl font-extrabold text-slate-800 border-b border-slate-200 focus:border-blue-500 outline-none pb-1"
                  value={form.name || ''}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              ) : (
                <h2 className="mt-2 text-2xl font-extrabold text-slate-800">
                  {selected.name || 'Unnamed Product'}
                </h2>
              )}

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Stock (kg)</p>
                  {isEditing ? (
                    <input
                      type="number"
                      className="w-full text-lg font-black text-blue-600 border-b border-slate-200 focus:border-blue-500 outline-none"
                      value={form.stock_quantity ?? 0}
                      onChange={(e) => setForm({ ...form, stock_quantity: Number(e.target.value) })}
                    />
                  ) : (
                    <p className="text-lg font-black text-blue-600">
                      {selected.stock_quantity?.toLocaleString() || '0'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Boxes</p>
                  {isEditing ? (
                    <input
                      type="number"
                      className="w-full text-lg font-black text-slate-700 border-b border-slate-200 focus:border-blue-500 outline-none"
                      value={form.boxes ?? 0}
                      onChange={(e) => setForm({ ...form, boxes: Number(e.target.value) })}
                    />
                  ) : (
                    <p className="text-lg font-black text-slate-700">{selected.boxes || 0}</p>
                  )}
                </div>
              </div>

              {/* Admin-only controls */}
              {isAdmin && (
                <div className="flex gap-3 mt-8 pt-5 border-t border-slate-100">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm py-2.5 rounded-xl transition-colors"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => {
                          setForm(selected)
                          setIsEditing(false)
                        }}
                        className="px-5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm py-2.5 rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm py-2.5 rounded-xl transition-colors"
                    >
                      Edit Details
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

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
  detail: string | null
}

export default function ProductShowcaseClient({
  products,
  fallbackImage,
}: {
  products: Product[]
  fallbackImage: string
}) {
  // ---------- Auth / Admin state (ทั้งหมดเช็คฝั่ง client ล้วนๆ) ----------
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // ---------- Login popup state ----------
  const [showLogin, setShowLogin] = useState(false)
  const [loginVisible, setLoginVisible] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  // ---------- Product detail modal state ----------
  const [selected, setSelected] = useState<Product | null>(null)
  const [visible, setVisible] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<Partial<Product>>({})
  const [saving, setSaving] = useState(false)
  const [localProducts, setLocalProducts] = useState<Product[]>(products)

  // เช็ค role จากตาราง users แล้วอัปเดต isAdmin
  const refreshAdminStatus = async (userId: string | null) => {
    if (!userId) {
      setIsAdmin(false)
      return
    }
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    // DEBUG: เปิด console (F12) ดูตรงนี้เพื่อหาสาเหตุที่ isAdmin ไม่ true
    console.log('[admin-check] auth uid:', userId)
    console.log('[admin-check] profile row:', profile)
    console.log('[admin-check] error:', error)

    setIsAdmin(profile?.role === 'admin')
  }

  // เช็ค session ตอนโหลดหน้า + ฟังการเปลี่ยนแปลงสถานะ login/logout แบบ realtime
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserEmail(user?.email ?? null)
      await refreshAdminStatus(user?.id ?? null)
      setCheckingAuth(false)
    }
    init()

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUserEmail(session?.user?.email ?? null)
      await refreshAdminStatus(session?.user?.id ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // ---------- Login modal handlers ----------
  const openLogin = () => {
    setLoginError('')
    setEmail('')
    setPassword('')
    setShowLogin(true)
    requestAnimationFrame(() => setLoginVisible(true))
  }

  const closeLogin = () => {
    setLoginVisible(false)
    setTimeout(() => setShowLogin(false), 200)
  }

  const handleLogin = async () => {
    setLoggingIn(true)
    setLoginError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setLoggingIn(false)

    if (error) {
      setLoginError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
      return
    }

    closeLogin()
    // onAuthStateChange ด้านบนจะอัปเดต userEmail / isAdmin ให้อัตโนมัติ
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUserEmail(null)
    setIsAdmin(false)
  }

  // ---------- Product detail modal handlers ----------
  const openModal = (p: Product) => {
    setSelected(p)
    setForm(p)
    setIsEditing(false)
    requestAnimationFrame(() => setVisible(true))
  }

  const closeModal = () => {
    setVisible(false)
    setTimeout(() => {
      setSelected(null)
      setIsEditing(false)
    }, 200)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal()
        closeLogin()
      }
    }
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
        detail: form.detail,
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
      {/* Top-right account bar */}
      <div className="max-w-6xl mx-auto flex justify-end mb-4 -mt-2">
        {checkingAuth ? null : userEmail ? (
          <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-full text-sm shadow-sm border border-slate-200">
            <span className="text-slate-600 font-medium">
              {userEmail} {isAdmin && <span className="text-blue-600 font-bold">· Admin</span>}
            </span>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-500 font-bold transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={openLogin}
            className="px-5 py-2 bg-white text-slate-600 rounded-full text-sm font-bold shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            ← Sign In
          </button>
        )}
      </div>

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

      {/* ---------- Login popup ---------- */}
      {showLogin && (
        <div
          className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-opacity duration-200 ${
            loginVisible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={closeLogin}
        >
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-8 transform transition-all duration-200 ease-out ${
              loginVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
            }`}
          >
            <button
              onClick={closeLogin}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              aria-label="Close"
            >
              ✕
            </button>

            <h2 className="text-2xl font-black text-slate-800 mb-1">
              Happy <span className="text-blue-600">Inventory</span>
            </h2>
            <p className="text-slate-500 text-sm mb-6">เข้าสู่ระบบเพื่อจัดการสต็อกสินค้า</p>

            <label className="text-sm font-bold text-slate-600 mb-1 block">อีเมลพนักงาน</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4 outline-none focus:border-blue-500"
              placeholder="you@example.com"
            />

            <label className="text-sm font-bold text-slate-600 mb-1 block">รหัสผ่าน</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-2 outline-none focus:border-blue-500"
              placeholder="••••••••"
            />

            {loginError && <p className="text-red-500 text-sm font-medium mb-2">{loginError}</p>}

            <button
              onClick={handleLogin}
              disabled={loggingIn}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {loggingIn ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </div>
        </div>
      )}

      {/* ---------- Product detail modal ---------- */}
      {selected && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={closeModal}
        >
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl transform transition-all duration-200 ease-out ${
              visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
            }`}
          >
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-slate-600 hover:bg-white hover:text-slate-900 shadow transition-colors"
              aria-label="Close"
            >
              ✕
            </button>

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

              <div className="mt-5">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">รายละเอียดเพิ่มเติม</p>
                {isEditing ? (
                  <textarea
                    className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg p-2 focus:border-blue-500 outline-none resize-none"
                    rows={4}
                    value={form.detail || ''}
                    onChange={(e) => setForm({ ...form, detail: e.target.value })}
                    placeholder="เช่น วัสดุ, ที่มา, คุณภาพ, หมายเหตุอื่นๆ"
                  />
                ) : (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selected.detail || '—'}</p>
                )}
              </div>

              {/* Admin-only controls — โผล่ทันทีหลัง login เป็น admin สำเร็จ ไม่ต้อง refresh */}
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

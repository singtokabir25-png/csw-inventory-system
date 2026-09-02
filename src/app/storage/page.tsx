'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

type StorageItem = {
  id: string
  name: string
  quantity: number
  deposit_date: string
  duration_value: number
  duration_unit: 'day' | 'week' | 'month'
  due_date: string
  image_url: string | null
  location: string | null
  created_at: string
}

// คำนวณวันครบกำหนดคืนจาก วันที่ฝาก + ระยะเวลา + หน่วย
function calculateDueDate(depositDate: string, value: number, unit: string): Date {
  const d = new Date(depositDate)
  if (unit === 'day') d.setDate(d.getDate() + value)
  else if (unit === 'week') d.setDate(d.getDate() + value * 7)
  else if (unit === 'month') d.setMonth(d.getMonth() + value)
  return d
}

// จำนวนวันที่เหลือก่อนครบกำหนด (ติดลบ = เกินกำหนดแล้ว)
function daysUntil(dueDateStr: string): number {
  const due = new Date(dueDateStr)
  const today = new Date()
  due.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export default function StoragePage() {
  const [items, setItems] = useState<StorageItem[]>([])
  const [role, setRole] = useState<string>('silver')
  const [userName, setUserName] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState({
    name: '',
    quantity: 0,
    deposit_date: new Date().toISOString().slice(0, 10),
    duration_value: 30,
    duration_unit: 'day' as 'day' | 'week' | 'month',
    location: '',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [uploading, setUploading] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function loadData() {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) { router.push('/login'); return }

      setUserId(user.id)
      setUserName(user.email || 'User')

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      const currentRole = profile?.role || 'silver'
      setRole(currentRole)

      // 🔒 จำกัดสิทธิ์: เฉพาะ gold และ admin เท่านั้น
      if (currentRole !== 'gold' && currentRole !== 'admin') {
        router.push('/inventory')
        return
      }

      setCheckingAccess(false)
      fetchItems()
    }
    loadData()
  }, [])

  const fetchItems = async () => {
    const { data } = await supabase
      .from('storage_items')
      .select('*')
      .order('due_date', { ascending: true })
    setItems(data || [])
  }

  const resetForm = () => {
    setForm({
      name: '',
      quantity: 0,
      deposit_date: new Date().toISOString().slice(0, 10),
      duration_value: 30,
      duration_unit: 'day',
      location: '',
    })
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview('')
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  // อัปโหลดรูปขึ้น bucket "products" (bucket เดิมที่ใช้เก็บรูปสินค้าอยู่แล้ว)
  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null
    setUploading(true)
    const ext = imageFile.name.split('.').pop()
    const fileName = `storage-items/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const { error: uploadError } = await supabase.storage.from('products').upload(fileName, imageFile)
    setUploading(false)

    if (uploadError) {
      alert('อัปโหลดรูปไม่สำเร็จ: ' + uploadError.message)
      return null
    }

    const { data } = supabase.storage.from('products').getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleAdd = async () => {
    if (!form.name || form.quantity <= 0 || form.duration_value <= 0) return
    setLoading(true)

    const imageUrl = imageFile ? await uploadImage() : null

    const dueDate = calculateDueDate(form.deposit_date, form.duration_value, form.duration_unit)

    const { error } = await supabase.from('storage_items').insert({
      name: form.name,
      quantity: form.quantity,
      deposit_date: form.deposit_date,
      duration_value: form.duration_value,
      duration_unit: form.duration_unit,
      due_date: dueDate.toISOString().slice(0, 10),
      image_url: imageUrl,
      location: form.location || null,
      created_by: userId,
    })

    setLoading(false)

    if (!error) {
      setShowAddModal(false)
      resetForm()
      fetchItems()
    } else {
      alert('บันทึกไม่สำเร็จ: ' + error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ยืนยันลบรายการนี้?')) return
    const { error } = await supabase.from('storage_items').delete().eq('id', id)
    if (!error) fetchItems()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (checkingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <p className="text-slate-400 font-bold">กำลังตรวจสอบสิทธิ์การเข้าถึง...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar — เหมือนหน้า inventory เป๊ะ + เพิ่มเมนู "ของฝาก" */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 transform shadow-xl md:shadow-none ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0`}>
        <div className="p-6 flex justify-between items-center">
          <h1 className="text-2xl font-black text-blue-600 tracking-tight italic">ERP <span className="text-slate-800">SYSTEM</span></h1>
          <button className="md:hidden text-slate-400" onClick={() => setIsSidebarOpen(false)}>✕</button>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <a href="/inventory" className="flex items-center gap-3 text-slate-500 hover:bg-slate-50 px-4 py-3 rounded-xl transition font-medium">📦 สต็อกสินค้า</a>
          <a href="/storage" className="flex items-center gap-3 bg-blue-50 text-blue-600 px-4 py-3 rounded-xl font-bold">🗄️ ของฝาก</a>
          {(role === 'gold' || role === 'admin') && (
            <a href="/dashboard" className="flex items-center gap-3 text-slate-500 hover:bg-slate-50 px-4 py-3 rounded-xl transition">📊 Dashboard</a>
          )}
          {role === 'admin' && (
            <a href="/admin/users" className="flex items-center gap-3 text-slate-500 hover:bg-slate-50 px-4 py-3 rounded-xl transition font-medium">👥 จัดการพนักงาน</a>
          )}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-4 py-3 mb-2 text-slate-700 bg-slate-50 rounded-2xl">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
              {userName ? userName[0].toUpperCase() : '?'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[11px] font-bold truncate text-black">{userName}</p>
              <p className="text-[9px] uppercase font-black tracking-widest text-slate-400">{role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-500 py-3 rounded-xl font-bold">🚪 ออกจากระบบ</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full md:ml-64 p-4 md:p-10 transition-all">
        <div className="md:hidden flex justify-between items-center mb-6">
          <button onClick={() => setIsSidebarOpen(true)} className="text-2xl p-2 bg-white rounded-xl shadow-sm border">☰</button>
          <span className="font-black text-blue-600">ERP SYSTEM</span>
          <div className="w-10"></div>
        </div>

        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <p className="text-slate-400 font-medium italic underline decoration-blue-500 text-sm">CSW Inventory Management</p>
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">ของฝาก</h2>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full md:w-auto bg-slate-900 text-white px-6 py-4 rounded-2xl font-bold shadow-lg"
          >
            + เพิ่มของฝากใหม่
          </button>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
            <p className="text-slate-400 text-[10px] font-black uppercase mb-1">Total Items</p>
            <h3 className="text-2xl font-black text-slate-800">{items.length} <span className="text-sm font-medium">รายการ</span></h3>
          </div>
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
            <p className="text-slate-400 text-[10px] font-black uppercase mb-1">Near Due (≤7 days)</p>
            <h3 className="text-2xl font-black text-red-500">
              {items.filter((i) => daysUntil(i.due_date) <= 7).length} <span className="text-sm font-medium text-slate-400">รายการ</span>
            </h3>
          </div>
          <div className="bg-blue-600 p-5 rounded-3xl shadow-lg text-white sm:col-span-2 lg:col-span-1">
            <p className="opacity-80 text-[10px] font-black uppercase mb-1">Total Quantity</p>
            <h3 className="text-2xl font-black">{items.reduce((s, i) => s + Number(i.quantity), 0).toLocaleString()}</h3>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-slate-50/30 text-[10px] uppercase tracking-widest text-slate-400 font-black">
                  <th className="px-8 py-6">Item</th>
                  <th className="px-8 py-6 text-right">Quantity</th>
                  <th className="px-8 py-6">Location</th>
                  <th className="px-8 py-6">Deposit Date</th>
                  <th className="px-8 py-6">Due Date</th>
                  <th className="px-8 py-6 text-center">Status</th>
                  <th className="px-8 py-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((item) => {
                  const left = daysUntil(item.due_date)
                  const isUrgent = left <= 7
                  const isOverdue = left < 0
                  return (
                    <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${isUrgent ? 'bg-red-50/40' : ''}`}>
                      <td className="px-8 py-6 flex items-center gap-5">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden flex-shrink-0">
                          {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🗄️</div>}
                        </div>
                        <p className="font-black text-slate-800 text-lg leading-tight">{item.name}</p>
                      </td>
                      <td className="px-8 py-6 text-right font-black text-xl text-slate-900">{Number(item.quantity).toLocaleString()}</td>
                      <td className="px-8 py-6 text-sm text-slate-600 font-bold">{item.location || '—'}</td>
                      <td className="px-8 py-6 text-sm text-slate-500 font-medium">{item.deposit_date}</td>
                      <td className="px-8 py-6 text-sm text-slate-500 font-medium">{item.due_date}</td>
                      <td className="px-8 py-6 text-center">
                        {isOverdue ? (
                          <span className="inline-block px-3 py-1.5 rounded-full text-[10px] font-black uppercase bg-red-600 text-white animate-pulse">
                            เกินกำหนด {Math.abs(left)} วัน
                          </span>
                        ) : isUrgent ? (
                          <span className="inline-block px-3 py-1.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-600">
                            ⚠️ เหลือ {left} วัน
                          </span>
                        ) : (
                          <span className="inline-block px-3 py-1.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-600">
                            เหลือ {left} วัน
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-6 text-center">
                        <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-500 font-bold text-xs">ลบ</button>
                      </td>
                    </tr>
                  )
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-8 py-12 text-center text-slate-400 font-medium">ยังไม่มีรายการของฝาก</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {items.map((item) => {
              const left = daysUntil(item.due_date)
              const isUrgent = left <= 7
              const isOverdue = left < 0
              return (
                <div key={item.id} className={`p-5 flex flex-col gap-3 ${isUrgent ? 'bg-red-50/40' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl border flex-shrink-0 overflow-hidden">
                      {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">🗄️</div>}
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-slate-800 leading-tight">{item.name}</p>
                      <p className="text-sm text-slate-500 mt-1">จำนวน: {Number(item.quantity).toLocaleString()}</p>
                      {item.location && <p className="text-sm text-slate-600 font-bold">📍 {item.location}</p>}
                      <p className="text-[11px] text-slate-400">ฝาก {item.deposit_date} · ครบ {item.due_date}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    {isOverdue ? (
                      <span className="inline-block px-3 py-1.5 rounded-full text-[10px] font-black uppercase bg-red-600 text-white">เกินกำหนด {Math.abs(left)} วัน</span>
                    ) : isUrgent ? (
                      <span className="inline-block px-3 py-1.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-600">⚠️ เหลือ {left} วัน</span>
                    ) : (
                      <span className="inline-block px-3 py-1.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-600">เหลือ {left} วัน</span>
                    )}
                    <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-500 font-bold text-xs">ลบ</button>
                  </div>
                </div>
              )
            })}
            {items.length === 0 && (
              <p className="px-5 py-12 text-center text-slate-400 font-medium">ยังไม่มีรายการของฝาก</p>
            )}
          </div>
        </div>

        {/* Add modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
            <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto [color-scheme:light]" onClick={(e) => e.stopPropagation()}>
              <h4 className="text-xl font-black text-slate-800 mb-6">เพิ่มของฝากใหม่</h4>

              <label className="text-xs font-black uppercase text-slate-400 mb-1 block">ชื่อสินค้า</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4 outline-none focus:border-blue-500 text-slate-800"
                placeholder="เช่น เหล็กม้วน A"
              />

              <label className="text-xs font-black uppercase text-slate-400 mb-1 block">จำนวน</label>
              <input
                type="number"
                value={form.quantity || ''}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4 outline-none focus:border-blue-500 text-slate-800"
                placeholder="0"
              />

              <label className="text-xs font-black uppercase text-slate-400 mb-1 block">วันที่ฝาก</label>
              <input
                type="date"
                value={form.deposit_date}
                onChange={(e) => setForm({ ...form, deposit_date: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4 outline-none focus:border-blue-500 text-slate-800"
              />

              <label className="text-xs font-black uppercase text-slate-400 mb-1 block">ระยะเวลาที่ฝาก</label>
              <div className="flex gap-2 mb-4">
                <input
                  type="number"
                  value={form.duration_value || ''}
                  onChange={(e) => setForm({ ...form, duration_value: Number(e.target.value) })}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-slate-800"
                  placeholder="30"
                />
                <select
                  value={form.duration_unit}
                  onChange={(e) => setForm({ ...form, duration_unit: e.target.value as any })}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold text-slate-800"
                >
                  <option value="day">วัน</option>
                  <option value="week">สัปดาห์</option>
                  <option value="month">เดือน</option>
                </select>
              </div>

              {form.deposit_date && form.duration_value > 0 && (
                <p className="text-xs text-slate-400 mb-4 -mt-2">
                  จะครบกำหนดคืนวันที่: <span className="font-bold text-slate-600">
                    {calculateDueDate(form.deposit_date, form.duration_value, form.duration_unit).toLocaleDateString('th-TH')}
                  </span>
                </p>
              )}

              <label className="text-xs font-black uppercase text-slate-400 mb-1 block">สถานที่จัดเก็บ</label>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4 outline-none focus:border-blue-500 text-slate-800"
                placeholder="เช่น โกดัง 1, โกดังใหม่"
              />

              <label className="text-xs font-black uppercase text-slate-400 mb-1 block">รูปภาพ</label>
              <div className="mb-6">
                {imagePreview ? (
                  <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-200 mb-2">
                    <img src={imagePreview} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        if (imagePreview) URL.revokeObjectURL(imagePreview)
                        setImageFile(null)
                        setImagePreview('')
                      }}
                      className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center text-slate-600 font-bold shadow"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <span className="text-2xl mb-1">📷</span>
                    <span className="text-xs font-bold text-slate-400">แตะเพื่ือเลือกรูปภาพ</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                )}
                {uploading && <p className="text-xs text-blue-500 font-bold mt-2">กำลังอัปโหลดรูป...</p>}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleAdd}
                  disabled={loading || uploading}
                  className="w-full py-4 rounded-xl font-black bg-slate-900 text-white active:scale-95 transition disabled:opacity-60"
                >
                  {loading ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
                <button onClick={() => { setShowAddModal(false); resetForm() }} className="w-full py-2 text-slate-400 font-bold">ยกเลิก</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

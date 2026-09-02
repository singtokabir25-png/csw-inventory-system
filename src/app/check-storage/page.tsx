'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'

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
}

function daysUntil(dueDateStr: string): number {
  const due = new Date(dueDateStr)
  const today = new Date()
  due.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function progressPercent(depositDateStr: string, dueDateStr: string): number {
  const start = new Date(depositDateStr).getTime()
  const end = new Date(dueDateStr).getTime()
  const now = Date.now()
  if (end <= start) return 100
  const pct = ((now - start) / (end - start)) * 100
  return Math.min(100, Math.max(0, pct))
}

// นับตัวเลขไล่ขึ้นสวยๆ ตอนโหลดหน้า
function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let start: number | null = null
    let frame: number
    const step = (ts: number) => {
      if (start === null) start = ts
      const progress = Math.min(1, (ts - start) / duration)
      setValue(Math.round(progress * target))
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])
  return value
}

export default function CheckStoragePage() {
  const [items, setItems] = useState<StorageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [mounted, setMounted] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabase
        .from('storage_items')
        .select('*')
        .order('due_date', { ascending: true })
      setItems(data || [])
      setLoading(false)
      requestAnimationFrame(() => setMounted(true))
    }
    fetchItems()
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return items
    const q = query.trim().toLowerCase()
    return items.filter(
      (i) => i.name.toLowerCase().includes(q) || (i.location || '').toLowerCase().includes(q)
    )
  }, [items, query])

  const totalCount = items.length
  const urgentCount = items.filter((i) => daysUntil(i.due_date) <= 7).length
  const totalQty = items.reduce((s, i) => s + Number(i.quantity), 0)

  const totalAnim = useCountUp(totalCount)
  const urgentAnim = useCountUp(urgentCount)
  const qtyAnim = useCountUp(totalQty)

  const unitLabel = (u: string) => (u === 'day' ? 'วัน' : u === 'week' ? 'สัปดาห์' : 'เดือน')

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute top-40 -right-32 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-6 py-14">
        {/* Header */}
        <header
          className={`text-center mb-12 transition-all duration-700 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}
        >
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4">
            🗄️ Storage Status
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight">
            ตรวจสอบของฝาก
          </h1>
          <p className="text-slate-500 mt-3 font-medium">
            เช็คสถานะของฝากทั้งหมด — เหลือกี่วัน จำนวนเท่าไหร่ ฝากไว้ที่ไหน
          </p>
        </header>

        {/* Stats */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 transition-all duration-700 delay-100 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">รายการทั้งหมด</p>
            <h3 className="text-3xl font-black text-slate-800">{totalAnim}</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">ใกล้ครบกำหนด (≤7 วัน)</p>
            <h3 className={`text-3xl font-black ${urgentCount > 0 ? 'text-red-500' : 'text-slate-800'}`}>{urgentAnim}</h3>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-6 rounded-3xl shadow-lg text-white text-center">
            <p className="opacity-80 text-[10px] font-black uppercase tracking-widest mb-1">จำนวนรวมทั้งหมด</p>
            <h3 className="text-3xl font-black">{qtyAnim.toLocaleString()}</h3>
          </div>
        </div>

        {/* Search */}
        <div
          className={`mb-8 transition-all duration-700 delay-150 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="relative max-w-md mx-auto">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาชื่อสินค้า หรือสถานที่จัดเก็บ..."
              className="w-full bg-white border border-slate-200 rounded-full pl-11 pr-5 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 shadow-sm transition-colors"
            />
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="text-center py-24 text-slate-400 font-bold animate-pulse">กำลังโหลดข้อมูล...</div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-slate-400 font-bold">ไม่พบรายการของฝาก</p>
          </div>
        )}

        {/* Grid of cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item, idx) => {
            const left = daysUntil(item.due_date)
            const isOverdue = left < 0
            const isUrgent = left <= 7 && !isOverdue
            const pct = progressPercent(item.deposit_date, item.due_date)

            const statusColor = isOverdue
              ? 'bg-red-600'
              : isUrgent
              ? 'bg-red-400'
              : left <= 14
              ? 'bg-amber-400'
              : 'bg-emerald-500'

            return (
              <div
                key={item.id}
                style={{ transitionDelay: mounted ? `${idx * 60}ms` : '0ms' }}
                className={`group bg-white rounded-[28px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                } hover:-translate-y-1.5 ${isOverdue ? 'ring-2 ring-red-400' : ''}`}
              >
                {/* Image */}
                <div className="h-44 bg-slate-100 overflow-hidden relative">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      alt={item.name}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-slate-100 to-slate-200">🗄️</div>
                  )}

                  {/* Status badge floating on image */}
                  <div className="absolute top-3 right-3">
                    {isOverdue ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase bg-red-600 text-white shadow-lg animate-pulse">
                        ⏰ เกินกำหนด {Math.abs(left)} วัน
                      </span>
                    ) : isUrgent ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase bg-white text-red-600 shadow-lg animate-pulse">
                        ⚠️ เหลือ {left} วัน
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase bg-white/90 text-emerald-600 shadow">
                        เหลือ {left} วัน
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-lg font-black text-slate-800 leading-tight mb-1">{item.name}</h3>
                  {item.location && (
                    <p className="text-xs font-bold text-blue-500 mb-3">📍 {item.location}</p>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">จำนวน</p>
                      <p className="text-xl font-black text-slate-900">{Number(item.quantity).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase">ระยะเวลาฝาก</p>
                      <p className="text-sm font-bold text-slate-600">{item.duration_value} {unitLabel(item.duration_unit)}</p>
                    </div>
                  </div>

                  {/* Progress bar: deposit date -> due date */}
                  <div className="mb-2">
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${statusColor}`}
                        style={{ width: mounted ? `${pct}%` : '0%' }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>ฝาก {item.deposit_date}</span>
                    <span>ครบ {item.due_date}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <footer className="text-center mt-16 pt-8 border-t border-slate-200">
          <p className="text-slate-400 text-sm font-medium">© หากต้องการต่ออายุสัญญาฝากสินค้าหรือเบิกสินค้าออก กรุณาติดต่อเจ้าหน้าที่ผ่านช่องทาง cswchocksuwit7893csw@gmail.com.</p>
        </footer>
      </div>
    </div>
  )
}

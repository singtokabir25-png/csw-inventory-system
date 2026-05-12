'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  
  const supabase = createClient()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    // 1. ตรวจสอบ Email และ Password ผ่าน Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMsg('อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง')
      setLoading(false)
    } else if (data?.user) {
      // 🔥 2. ถ้า Login สำเร็จ บันทึกประวัติลงตาราง stock_logs ตาม Schema จริง
      try {
        await supabase.from('stock_logs').insert({
          user_id: data.user.id,        // เก็บ ID ของผู้ใช้เพื่อ Join ไปเอา Email/Name
          action_type: 'LOGIN',         // กำหนดประเภทกิจกรรม
          details: `เข้าสู่ระบบจากหน้า Login (${email})` // รายละเอียดกิจกรรม
        })
      } catch (logError) {
        // บันทึก Log ไม่สำเร็จแต่ยังให้เข้าระบบต่อได้
        console.error('Failed to record log:', logError)
      }

      // 3. นำทางไปหน้า Inventory
      router.push('/inventory')
      router.refresh()
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Happy <span className="text-blue-600">Inventory</span>
            </h1>
            <p className="text-slate-500 mt-2">เข้าสู่ระบบเพื่อจัดการสต็อกสินค้า</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {errorMsg && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium animate-shake">
                ⚠️ {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">อีเมลพนักงาน</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all text-slate-800"
                placeholder="name@inventory.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">รหัสผ่าน</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all text-slate-800"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {loading ? 'กำลังตรวจสอบข้อมูล...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          {/* Footer Note */}
          <p className="text-center text-slate-400 text-xs mt-8">
            © 2026 CSW System. All rights reserved.
          </p>
        </div>
      </div>
    </main>
  )
}
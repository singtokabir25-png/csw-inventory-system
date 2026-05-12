'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([])
  const [role, setRole] = useState<string>('silver')
  const [userName, setUserName] = useState<string>('')
  const [userId, setUserId] = useState<string>('') 
  const [loading, setLoading] = useState(false)
  
  const [activeProduct, setActiveProduct] = useState<any>(null)
  const [actionType, setActionType] = useState<'add' | 'sell' | 'use' | null>(null)
  const [amount, setAmount] = useState<number>(0)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function loadData() {
      // ดึงข้อมูล User แบบ Real-time เพื่อความชัวร์
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        router.push('/login')
        return
      }

      setUserId(user.id)
      setUserName(user.email || 'User')
      
      // ดึงข้อมูล Role จาก profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      setRole(profile?.role || 'silver')

      // บันทึก Log การเข้าใช้งานครั้งแรก (ใส่ user_id ให้ครบ)
      await supabase.from('stock_logs').insert({
        user_id: user.id,
        action_type: 'LOGIN',
        details: `เข้าใช้งานระบบ Inventory (${user.email})`
      })

      fetchProducts()
    }
    loadData()
  }, [])

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('product_code')
    setProducts(data || [])
  }

  // ฟังก์ชันช่วยเช็ค ID ก่อนทำรายการ เพื่อป้องกันค่า NULL ไปลง Database
  const getSafeUserId = async () => {
    if (userId) return userId
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id || null
  }

  // --- 🔥 จัดการ BOX ---
  const handleUpdateBox = async (productId: string, currentBoxes: number, change: number) => {
    const currentId = await getSafeUserId()
    if (!currentId) return 

    const newBoxes = Math.max(0, currentBoxes + change)
    const product = products.find(p => p.id === productId)

    const { error } = await supabase.from('products').update({ boxes: newBoxes }).eq('id', productId)
    
    if (!error) {
      await supabase.from('stock_logs').insert({
        user_id: currentId, 
        action_type: 'UPDATE_BOX',
        product_name: product?.name || 'Unknown Product',
        change_amount: change, 
        details: `ปรับจำนวน Box จาก ${currentBoxes} เป็น ${newBoxes} เต๋า`
      })
      fetchProducts()
    }
  }

  // --- 🔥 ทำรายการสต็อก ---
  const handleTransaction = async () => {
    const currentId = await getSafeUserId()
    if (!activeProduct || amount <= 0 || !currentId) return
    setLoading(true)

    let newQuantity = Number(activeProduct.stock_quantity)
    if (actionType === 'add') newQuantity += amount
    else newQuantity -= amount

    const { error } = await supabase
      .from('products')
      .update({ stock_quantity: Math.max(0, newQuantity) })
      .eq('id', activeProduct.id)

    if (!error) {
      const logAmount = actionType === 'add' ? amount : -amount

      await supabase.from('stock_logs').insert({
        user_id: currentId, 
        action_type: actionType === 'add' ? 'ADD' : actionType === 'sell' ? 'SELL' : 'USE',
        product_name: activeProduct.name,
        change_amount: logAmount, 
        details: actionType === 'add' ? 'เติมสต็อกสินค้า' : actionType === 'sell' ? 'ขายสินค้าออก' : 'เบิกวัสดุไปใช้งาน'
      })

      fetchProducts()
      closeModal()
    }
    setLoading(false)
  }

  const closeModal = () => {
    setActiveProduct(null)
    setActionType(null)
    setAmount(0)
  }

  const handleLogout = async () => {
    const currentId = await getSafeUserId()
    if (currentId) {
      await supabase.from('stock_logs').insert({
        user_id: currentId,
        action_type: 'LOGOUT',
        details: 'ออกจากระบบ'
      })
    }
    await supabase.auth.signOut()
    router.push('/login')
  }

  const totalWeight = products.reduce((sum, p) => sum + Number(p.stock_quantity), 0)
  const totalBoxes = products.reduce((sum, p) => sum + Number(p.boxes), 0)

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full shadow-sm z-10">
        <div className="p-6">
          <h1 className="text-2xl font-black text-blue-600 tracking-tight text-center italic">ERP <span className="text-slate-800">SYSTEM</span></h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <a href="/inventory" className="flex items-center gap-3 bg-blue-50 text-blue-600 px-4 py-3 rounded-xl font-bold">📦 สต็อกสินค้า</a>
          {(role === 'gold' || role === 'admin') && (
            <a href="/dashboard" className="flex items-center gap-3 text-slate-500 hover:bg-slate-50 px-4 py-3 rounded-xl transition">📊 Dashboard</a>
          )}
          {role === 'admin' && (
            <>
              <a href="/admin/users" className="flex items-center gap-3 text-slate-500 hover:bg-slate-50 px-4 py-3 rounded-xl transition font-medium">👥 จัดการพนักงาน</a>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-4 py-3 mb-2 text-slate-700">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 ${
              role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {userName ? userName[0] : '?'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[11px] font-bold truncate text-black">{userName || 'Loading...'}</p>
              <p className="text-[9px] uppercase font-black tracking-widest text-slate-400">{role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-500 py-3 rounded-xl font-bold hover:bg-red-100 transition">🚪 ออกจากระบบ</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-10 relative">
        <header className="flex justify-between items-end mb-10">
          <div>
            <p className="text-slate-400 font-medium italic underline decoration-blue-500">CSW Inventory Management</p>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">คลังวัสดุของคุณกบีร์</h2>
          </div>
          {(role === 'gold' || role === 'admin') && (
            <button onClick={() => router.push('/inventory/add')} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:scale-105 transition">
              + เพิ่มสินค้าใหม่
            </button>
          )}
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-black">
            <p className="text-slate-400 text-sm font-bold mb-1 uppercase">Total Weight</p>
            <h3 className="text-3xl font-black">{totalWeight.toLocaleString()} <span className="text-sm font-medium">กก.</span></h3>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-black">
            <p className="text-slate-400 text-sm font-bold mb-1 uppercase">Total Boxes</p>
            <h3 className="text-3xl font-black">{totalBoxes.toLocaleString()} <span className="text-sm font-medium text-blue-500 font-bold">เต๋า</span></h3>
          </div>
          <div className="bg-blue-600 p-6 rounded-3xl shadow-lg text-white">
            <p className="opacity-80 text-sm font-bold mb-1 uppercase">Items Count</p>
            <h3 className="text-3xl font-black">{products.length} <span className="text-sm font-medium">รายการ</span></h3>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-50 bg-slate-50/30 text-[10px] uppercase tracking-widest text-slate-400 font-black">
                  <th className="px-8 py-6">Product Details</th>
                  <th className="px-8 py-6 text-right">Stock (KG)</th>
                  <th className="px-8 py-6 text-center">Box Management</th>
                  <th className="px-8 py-6 text-center">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6 flex items-center gap-5">
                      <div 
                        className="w-16 h-16 bg-slate-100 rounded-2xl flex-shrink-0 border border-slate-200 overflow-hidden cursor-pointer"
                        onClick={() => p.image_url && setSelectedImage(p.image_url)}
                      >
                        {p.image_url ? (
                          <img src={p.image_url} className="w-full h-full object-cover" alt={p.name} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                        )}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-lg leading-tight">{p.name}</p>
                        <p className="text-[11px] font-mono text-blue-500 font-black uppercase tracking-wider">{p.product_code}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right font-black text-2xl text-slate-900">
                      {Number(p.stock_quantity).toLocaleString()}
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="inline-flex items-center bg-slate-100 rounded-2xl p-1 gap-3 border border-slate-200">
                        <button onClick={() => handleUpdateBox(p.id, p.boxes, -1)} className="w-8 h-8 bg-white rounded-xl shadow-sm hover:text-red-500 font-black">-</button>
                        <span className="text-sm font-black w-12 text-black">{p.boxes}</span>
                        <button onClick={() => handleUpdateBox(p.id, p.boxes, 1)} className="w-8 h-8 bg-white rounded-xl shadow-sm hover:text-blue-500 font-black">+</button>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <button onClick={() => { setActiveProduct(p); setActionType('add'); }} className="flex-1 bg-emerald-50 text-emerald-600 px-3 py-2 rounded-xl text-[10px] font-black hover:bg-emerald-600 hover:text-white transition uppercase">เติมของ</button>
                          <button onClick={() => { setActiveProduct(p); setActionType('sell'); }} className="flex-1 bg-amber-50 text-amber-600 px-3 py-2 rounded-xl text-[10px] font-black hover:bg-amber-600 hover:text-white transition uppercase">ขายของ</button>
                        </div>
                        <button onClick={() => { setActiveProduct(p); setActionType('use'); }} className="w-full bg-slate-100 text-slate-600 px-3 py-2 rounded-xl text-[10px] font-black hover:bg-slate-800 hover:text-white transition uppercase italic">🛠️ นำออกไปใช้</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Zoom */}
        {selectedImage && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[200] flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
            <img src={selectedImage} className="max-w-full max-h-full rounded-3xl shadow-2xl animate-in zoom-in duration-300" alt="Zoom" />
          </div>
        )}

        {/* Modal Transaction */}
        {activeProduct && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] p-10 max-w-sm w-full shadow-2xl">
              <div className="text-center mb-8">
                <span className={`inline-block px-4 py-1 rounded-full text-[10px] font-black uppercase mb-3 ${
                  actionType === 'add' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                }`}>
                  {actionType === 'add' ? 'RESTOCK' : actionType === 'sell' ? 'SALE' : 'INTERNAL USE'}
                </span>
                <h4 className="text-2xl font-black text-slate-800">{activeProduct.name}</h4>
              </div>
              <input 
                autoFocus
                type="number" 
                value={amount || ''} 
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full text-5xl font-black text-center bg-slate-50 text-black border-none rounded-3xl py-8 mb-8 focus:ring-4 focus:ring-blue-100"
                placeholder="0"
              />
              <div className="flex flex-col gap-3">
                <button onClick={handleTransaction} disabled={loading || amount <= 0} className="w-full py-4 rounded-2xl font-black shadow-lg bg-slate-900 text-white hover:bg-black transition">
                  {loading ? 'Processing...' : 'ยืนยันทำรายการ'}
                </button>
                <button onClick={closeModal} className="w-full py-4 text-slate-400 font-bold">ยกเลิก</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
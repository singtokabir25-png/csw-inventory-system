// 1. เพิ่มคำสั่งปิด Cache เพื่อให้ข้อมูลอัปเดตตาม Database ทันที
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/utils/supabase/client'

export default async function PublicShowcase() {
  // 2. ดึงข้อมูลสินค้าโดยระบุคอลัมน์ให้ชัดเจนตามชื่อใน Database
  const { data: products } = await supabase
    .from('products')
    .select('id, name, product_code, stock_quantity, boxes, image_url')
    // เรียงลำดับตามรหัสสินค้าจากน้อยไปมาก
    .order('product_code', { ascending: true })

  // URL รูปภาพสำรองกรณีไม่มีรูปสินค้า
  const fallbackImage = "https://images.unsplash.com/photo-1586075010633-2470fd205553?q=80&w=1000&auto=format&fit=crop"

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="max-w-6xl mx-auto mb-10 text-center">
        <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Product Catalog</h1>
        <p className="text-slate-500 mt-2 font-medium">รายการสินค้าและสต็อกล่าสุดในคลังของเรา</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {products?.map((p) => (
          <div key={p.id} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 group border border-slate-100">
            {/* ส่วนรูปภาพสินค้า */}
            <div className="h-64 overflow-hidden bg-slate-200 relative">
              <img 
                // ใช้ .trim() เพื่อป้องกัน Error จากอักขระพิเศษในลิงก์
                src={p.image_url?.trim() || fallbackImage} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                alt={p.name}
              />
              <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
            </div>
            
            {/* ส่วนรายละเอียดสินค้า */}
            <div className="p-7">
              <div className="flex justify-between items-start mb-4">
                <div>
                  {/* 3. ใช้ p.name สำหรับชื่อสินค้า และ p.product_code สำหรับรหัสสินค้า */}
                  <h3 className="text-xl font-extrabold text-slate-800 leading-tight mb-1">
                    {p.name || 'ไม่ระบุชื่อสินค้า'}
                  </h3>
                  <code className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase font-mono">
                    CODE: {p.product_code}
                  </code>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-blue-600">
                    {/* 4. ใช้ p.stock_quantity ให้ตรงตาม Database */}
                    {p.stock_quantity?.toLocaleString() || '0'} 
                    <span className="text-xs font-bold text-slate-400 uppercase ml-1">กก.</span>
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-50">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-bold text-slate-700">พร้อมส่ง {p.boxes || 0} เต๋า</span>
                </div>
                <button className="text-xs font-bold text-blue-600 hover:underline">
                  ดูรายละเอียด
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <footer className="max-w-6xl mx-auto mt-20 pb-10 text-center border-t border-slate-200 pt-10">
        <p className="text-slate-400 text-sm font-medium">© 2026 Happy Inventory System. CSW Logistics Group.</p>
      </footer>
    </div>
  )
}
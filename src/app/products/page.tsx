// app/products/page.tsx
import { supabase } from '@/utils/supabase/client'

export default async function PublicShowcase() {
  // ดึงข้อมูลสินค้ามาแสดงผล (ไม่ต้องเช็คสิทธิ์การเข้าถึง)
  const { data: products } = await supabase
    .from('products')
    .select('*')

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="max-w-6xl mx-auto mb-10 text-center">
        <h1 className="text-4xl font-bold text-slate-800">Product Catalog</h1>
        <p className="text-slate-500 mt-2">รายการสินค้าและสต็อกล่าสุดในคลังของเรา</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {products?.map((p) => (
          <div key={p.id} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group">
            {/* ส่วนรูปภาพสินค้า */}
            <div className="h-64 overflow-hidden bg-slate-200">
              <img 
                src={p.image_url || '/placeholder.png'} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                alt={p.name}
              />
            </div>
            
            {/* ส่วนรายละเอียดสินค้า */}
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{p.name}</h3>
                  <span className="text-sm text-blue-600 font-medium">ID: {p.id.substring(0,8)}</span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-slate-900">{p.weight} <span className="text-sm font-normal text-slate-500">กก.</span></p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                <div className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold">
                  พร้อมส่ง {p.boxes} เต๋า
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
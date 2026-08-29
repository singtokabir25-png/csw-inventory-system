export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/utils/supabase/client'
import ProductShowcaseClient from './ProductShowcaseClient'

export default async function PublicShowcase() {
  const { data: products } = await supabase
    .from('products')
    .select('id, name, product_code, stock_quantity, boxes, image_url')
    .order('product_code', { ascending: true })

  const fallbackImage = "https://images.unsplash.com/photo-1586075010633-2470fd205553?q=80&w=1000&auto=format&fit=crop"

  return (
    <div className="min-h-screen bg-slate-50 p-6 relative overflow-hidden">
      <header className="max-w-6xl mx-auto mb-10 text-center relative">
        <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Product Catalog</h1>
        <p className="text-slate-500 mt-2 font-medium">The latest product lineup and stock levels in our warehouse</p>
      </header>

      {/* 
        ProductShowcaseClient ตอนนี้จัดการทุกอย่างเองฝั่ง client:
        - carousel การ์ดสินค้า
        - popup view details
        - ปุ่ม login มุมขวาบน + popup login
        - เช็ค role admin หลัง login แล้วโชว์ปุ่ม edit ทันที
      */}
      <ProductShowcaseClient
        products={products || []}
        fallbackImage={fallbackImage}
      />

      <footer className="max-w-6xl mx-auto mt-20 pb-10 text-center border-t border-slate-200 pt-10">
        <p className="text-slate-400 text-sm font-medium">© 2026 Happy Inventory System. CSW Logistics Group.</p>
      </footer>
    </div>
  )
}

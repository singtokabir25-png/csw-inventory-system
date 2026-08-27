export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/utils/supabase/client'
import Link from 'next/link'

export default async function PublicShowcase() {
  const { data: products } = await supabase
    .from('products')
    .select('id, name, product_code, stock_quantity, boxes, image_url')
    .order('product_code', { ascending: true })

  const fallbackImage = "https://images.unsplash.com/photo-1586075010633-2470fd205553?q=80&w=1000&auto=format&fit=crop"

  return (
    <div className="min-h-screen bg-slate-50 p-6 relative overflow-hidden">
      {/* Back to login button */}
      <div className="max-w-6xl mx-auto flex justify-end mb-4">
        <Link
          href="/login"
          className="px-5 py-2 bg-white text-slate-600 rounded-full text-sm font-bold shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          ← Sign In
        </Link>
      </div>

      <header className="max-w-6xl mx-auto mb-10 text-center">
        <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Product Catalog</h1>
        <p className="text-slate-500 mt-2 font-medium">The latest product lineup and stock levels in our warehouse</p>
      </header>

      {/* Carousel */}
      <div className="relative max-w-6xl mx-auto">
        {/* Edge fade effects */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-slate-50 to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-slate-50 to-transparent z-10" />

        <div
          className="flex gap-8 overflow-x-auto snap-x snap-mandatory pb-8 pt-4 px-4 -mx-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {products?.map((p) => {
            const isAvailable = p.stock_quantity && p.stock_quantity > 0;

            return (
              <div
                key={p.id}
                className="snap-center shrink-0 w-[320px] bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 group border border-slate-100 hover:-translate-y-2 hover:rotate-1"
              >
                <div className="h-64 overflow-hidden bg-slate-200 relative">
                  <img
                    src={p.image_url?.trim() || fallbackImage}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    alt={p.name}
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
                    <button className="text-xs font-bold text-blue-600 hover:underline">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <footer className="max-w-6xl mx-auto mt-20 pb-10 text-center border-t border-slate-200 pt-10">
        <p className="text-slate-400 text-sm font-medium">© 2026 Happy Inventory System. CSW Logistics Group.</p>
      </footer>
    </div>
  )
}

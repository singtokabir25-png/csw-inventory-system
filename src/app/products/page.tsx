export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/utils/supabase/client'
import ProductShowcaseClient from './ProductShowcaseClient'

export default async function PublicShowcase() {
  const { data: products } = await supabase
    .from('products')
    .select('id, name, product_code, stock_quantity, boxes, image_url, detail')
    .order('product_code', { ascending: true })

  const fallbackImage = "https://images.unsplash.com/photo-1586075010633-2470fd205553?q=80&w=1000&auto=format&fit=crop"

  return (
    <ProductShowcaseClient
      products={products || []}
      fallbackImage={fallbackImage}
    />
  )
}
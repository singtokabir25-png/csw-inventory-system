import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // เช็คสถานะ Login
  const { data: { user } } = await supabase.auth.getUser()

  // 🛡️ Logic การเตือนกลับหน้า Login:
  // เพิ่ม /check-storage เข้าไปในรายการหน้า public ด้วย
  // เพื่อให้ผู้ฝากสแกน QR เข้ามาเช็คสถานะได้โดยไม่ต้อง login
  const publicPaths = ['/login', '/products', '/check-storage']
  const isPublicPath = publicPaths.some((path) => request.nextUrl.pathname.startsWith(path))

  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ✅ ถ้า Login แล้วแต่จะพยายามเข้าหน้า /login อีก ให้เตือนไปหน้า /inventory แทน
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/inventory', request.url))
  }

  return response
}

// กำหนดว่าให้ Middleware ทำงานที่หน้าไหนบ้าง
export const config = {
  matcher: [
    /*
     * ครอบคลุมทุกหน้ายกเว้นไฟล์ static และไฟล์รูปภาพ
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
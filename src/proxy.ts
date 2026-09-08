import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isSuperAdminEmail } from './lib/admin'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const esRutaPublica = pathname === '/' || pathname === '/login' || pathname === '/reset-password' || pathname === '/api/auth/recovery'

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
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const esSuperadmin = isSuperAdminEmail(user?.email)

  // 🚪 Si no hay sesión y no está en una pantalla pública, mandarlo al login.
  if (!user && !esRutaPublica) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (user && pathname.startsWith('/superadmin') && !esSuperadmin) {
    return NextResponse.redirect(new URL('/inicio', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

import { createServerClient, type CookieOptions } from '@supabase/ssr'
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
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
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

  const { data: { session } } = await supabase.auth.getSession()

  // 🚪 REGLA 1: Si no hay sesión y NO está en el login (/), mandarlo al login
  if (!session && request.nextUrl.pathname !== '/') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 🏠 REGLA 2: Si ya hay sesión y está en el login (/), mandarlo a su panel correspondiente
  if (session && request.nextUrl.pathname === '/') {
    // Si eres tú (el dueño), te manda al panel maestro
    if (session.user.email?.toLowerCase() === 'gymnastplanner@gmail.com') {
      return NextResponse.redirect(new URL('/superadmin', request.url))
    } else {
      // Si es un entrenador, lo manda a la nueva pantalla de Inicio
      return NextResponse.redirect(new URL('/inicio', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
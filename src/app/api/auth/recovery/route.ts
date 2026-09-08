import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const requestSchema = z.object({ email: z.string().trim().email().max(254) })

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Escribe un correo válido.' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'implicit',
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  )

  const productionOrigin = (process.env.NEXT_PUBLIC_SITE_URL || 'https://gymnastplanner.vercel.app').replace(/\/$/, '')
  const origin = process.env.NODE_ENV === 'production' ? productionOrigin : request.nextUrl.origin
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/reset-password`,
  })

  if (error) {
    console.error('No se pudo solicitar la recuperación de contraseña:', error.message)
  }

  // La respuesta es deliberadamente genérica para no revelar qué correos existen.
  return NextResponse.json({ ok: true })
}

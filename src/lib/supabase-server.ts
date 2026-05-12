import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}

export async function getAuthenticatedClub() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { supabase, user: null, clubId: null, error: 'No autenticado' }
  }

  const { data: perfil, error: perfilError } = await supabase
    .from('perfiles')
    .select('club_id')
    .eq('id', user.id)
    .single()

  if (perfilError || !perfil?.club_id) {
    return { supabase, user, clubId: null, error: 'Perfil sin club asociado' }
  }

  return { supabase, user, clubId: perfil.club_id as string, error: null }
}

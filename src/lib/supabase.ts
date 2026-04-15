import { createBrowserClient } from '@supabase/ssr'

// Esto le dice a Supabase que guarde la sesión en las Cookies del navegador
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)   
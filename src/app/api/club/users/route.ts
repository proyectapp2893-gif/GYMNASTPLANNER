import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedClub, createSupabaseServiceClient } from '../../../../lib/supabase-server'

const actionSchema = z.object({
  action: z.enum(['password', 'reset']),
  userId: z.string().uuid(),
  password: z.string().min(8).max(128).optional(),
})

async function adminContext() {
  const context = await getAuthenticatedClub()
  if (context.error || !context.user || !context.clubId) return { ...context, allowed: false }
  const { data: profile } = await context.supabase.from('perfiles').select('rol').eq('id', context.user.id).eq('club_id', context.clubId).maybeSingle()
  return { ...context, allowed: ['administrador', 'administrador_organizacion'].includes(String(profile?.rol).toLowerCase()) }
}

export async function GET() {
  const context = await adminContext()
  if (!context.user || !context.clubId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!context.allowed) return NextResponse.json({ error: 'Solo la administración del club puede gestionar perfiles' }, { status: 403 })

  const service = createSupabaseServiceClient()
  const [{ data: profiles, error }, { data: authUsers, error: authError }] = await Promise.all([
    service.from('perfiles').select('id,nombre,email,rol,created_at').eq('club_id', context.clubId).order('nombre'),
    service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])
  if (error || authError) return NextResponse.json({ error: error?.message || authError?.message }, { status: 500 })
  const authById = new Map(authUsers.users.map(user => [user.id, user]))
  return NextResponse.json({ users: (profiles ?? []).map(profile => ({ ...profile, disabled: Boolean(authById.get(profile.id)?.banned_until && new Date(String(authById.get(profile.id)?.banned_until)).getTime() > Date.now()) })) })
}

export async function PATCH(request: NextRequest) {
  const context = await adminContext()
  if (!context.user || !context.clubId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!context.allowed) return NextResponse.json({ error: 'Solo la administración del club puede gestionar perfiles' }, { status: 403 })
  const parsed = actionSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })

  const service = createSupabaseServiceClient()
  const { data: target } = await service.from('perfiles').select('id,email,club_id').eq('id', parsed.data.userId).eq('club_id', context.clubId).maybeSingle()
  if (!target) return NextResponse.json({ error: 'El perfil no pertenece a tu club' }, { status: 403 })

  if (parsed.data.action === 'password') {
    if (!parsed.data.password) return NextResponse.json({ error: 'La contraseña es obligatoria' }, { status: 400 })
    const { error } = await service.auth.admin.updateUserById(target.id, { password: parsed.data.password })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await service.auth.resetPasswordForEmail(target.email, { redirectTo: `${request.nextUrl.origin}/reset-password` })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await service.from('auditoria').insert({ club_id: context.clubId, usuario_id: context.user.id, entidad: 'perfiles', entidad_id: target.id, accion: parsed.data.action === 'reset' ? 'password_reset_requested' : 'password_changed_by_club_admin', motivo: 'Gestión de acceso desde configuración del club', contexto: { origin: 'club_settings' } })
  return NextResponse.json({ ok: true })
}

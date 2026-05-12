import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient, createSupabaseServiceClient } from '../../../../lib/supabase-server'

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'Gymnastplanner@gmail.com').trim().toLowerCase()

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nombre: z.string().min(1).max(120),
  clubId: z.string().uuid(),
})

const updateUserSchema = z.object({
  action: z.enum(['password', 'disable', 'enable', 'profile']),
  userId: z.string().uuid(),
  password: z.string().min(8).optional(),
  nombre: z.string().min(1).max(120).optional(),
  clubId: z.string().uuid().optional(),
})

const userIdSchema = z.string().uuid()

async function ensureSuperAdmin() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user || user.email?.trim().toLowerCase() !== SUPER_ADMIN_EMAIL) {
    return { allowed: false, error: 'No autorizado' }
  }

  return { allowed: true, error: null }
}

export async function GET() {
  const auth = await ensureSuperAdmin()
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: 403 })

  const service = createSupabaseServiceClient()
  const { data: authUsers, error: authError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  const { data: perfiles, error: perfilesError } = await service
    .from('perfiles')
    .select('id, email, nombre, club_id, clubs(nombre)')

  if (perfilesError) return NextResponse.json({ error: perfilesError.message }, { status: 500 })

  const perfilesPorId = new Map((perfiles || []).map((perfil) => [perfil.id as string, perfil]))
  const users = authUsers.users.map((user) => {
    const perfil = perfilesPorId.get(user.id)
    const club = Array.isArray(perfil?.clubs) ? perfil?.clubs[0] : perfil?.clubs

    return {
      id: user.id,
      email: user.email || perfil?.email || '',
      nombre: perfil?.nombre || user.user_metadata?.nombre || '',
      club_id: perfil?.club_id || null,
      club_nombre: club?.nombre || null,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      banned_until: user.banned_until,
      disabled: Boolean(user.banned_until && new Date(user.banned_until).getTime() > Date.now()),
    }
  })

  return NextResponse.json({ users })
}

export async function POST(request: NextRequest) {
  const auth = await ensureSuperAdmin()
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: 403 })

  const parsed = createUserSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Entrada inválida', details: parsed.error.flatten() }, { status: 400 })
  }

  const service = createSupabaseServiceClient()
  const { email, password, nombre, clubId } = parsed.data

  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  })

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message || 'No se pudo crear el usuario' }, { status: 500 })
  }

  const { error: perfilError } = await service.from('perfiles').insert([{
    id: created.user.id,
    email,
    nombre,
    club_id: clubId,
  }])

  if (perfilError) {
    await service.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: perfilError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, userId: created.user.id })
}

export async function PATCH(request: NextRequest) {
  const auth = await ensureSuperAdmin()
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: 403 })

  const parsed = updateUserSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Entrada inválida', details: parsed.error.flatten() }, { status: 400 })
  }

  const service = createSupabaseServiceClient()
  const { action, userId, password, nombre, clubId } = parsed.data

  if (action === 'disable') {
    const { data, error } = await service.auth.admin.getUserById(userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (data.user?.email?.trim().toLowerCase() === SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'No se puede desactivar la cuenta superadmin' }, { status: 400 })
    }
  }

  if (action === 'password') {
    if (!password) return NextResponse.json({ error: 'Contraseña requerida' }, { status: 400 })
    const { error } = await service.auth.admin.updateUserById(userId, { password })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (action === 'disable') {
    const { error } = await service.auth.admin.updateUserById(userId, { ban_duration: '876000h' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (action === 'enable') {
    const { error } = await service.auth.admin.updateUserById(userId, { ban_duration: 'none' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (action === 'profile') {
    const updates: { nombre?: string; club_id?: string } = {}
    if (nombre) updates.nombre = nombre
    if (clubId) updates.club_id = clubId

    if (Object.keys(updates).length > 0) {
      const { error } = await service.from('perfiles').update(updates).eq('id', userId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const auth = await ensureSuperAdmin()
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: 403 })

  const userId = request.nextUrl.searchParams.get('userId')
  const parsedUserId = userIdSchema.safeParse(userId)
  if (!parsedUserId.success) return NextResponse.json({ error: 'userId inválido' }, { status: 400 })

  const service = createSupabaseServiceClient()
  const { data: target, error: targetError } = await service.auth.admin.getUserById(parsedUserId.data)
  if (targetError) return NextResponse.json({ error: targetError.message }, { status: 500 })
  if (target.user?.email?.trim().toLowerCase() === SUPER_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'No se puede eliminar la cuenta superadmin' }, { status: 400 })
  }

  await service.from('perfiles').delete().eq('id', parsedUserId.data)
  const { error } = await service.auth.admin.deleteUser(parsedUserId.data)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

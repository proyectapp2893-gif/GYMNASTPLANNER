import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isSuperAdminEmail } from '../../../../lib/admin'
import { createSupabaseServerClient, createSupabaseServiceClient } from '../../../../lib/supabase-server'

const createClubSchema = z.object({
  nombre: z.string().trim().min(3).max(120),
  estado: z.enum(['pendiente', 'aprobado']).default('aprobado'),
  accesoBiblioteca: z.boolean().default(false),
})

const updateClubSchema = z.object({
  clubId: z.string().uuid(),
  action: z.enum(['approve', 'suspend', 'enablePremium', 'disablePremium']),
})

const deleteClubSchema = z.object({
  clubId: z.string().uuid(),
  confirmationName: z.string().trim().min(1),
  reason: z.string().trim().min(5).max(500),
})

async function ensureSuperAdmin() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user || !isSuperAdminEmail(user.email)) return null
  return user
}

export async function GET() {
  const user = await ensureSuperAdmin()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const service = createSupabaseServiceClient()
  const { data, error } = await service
    .from('clubs')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ clubs: data ?? [] })
}

export async function POST(request: NextRequest) {
  const user = await ensureSuperAdmin()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const parsed = createClubSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Datos del club inválidos' }, { status: 400 })

  const service = createSupabaseServiceClient()
  const { nombre, estado, accesoBiblioteca } = parsed.data
  const { data: duplicate } = await service.from('clubs').select('id').ilike('nombre', nombre).is('deleted_at', null).maybeSingle()
  if (duplicate) return NextResponse.json({ error: 'Ya existe un club activo con ese nombre' }, { status: 409 })

  const { data: club, error } = await service.from('clubs').insert({
    nombre,
    estado,
    acceso_biblioteca_elite: accesoBiblioteca,
  }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await service.from('auditoria').insert({
    club_id: club.id,
    usuario_id: user.id,
    entidad: 'clubs',
    entidad_id: club.id,
    accion: 'create',
    valor_nuevo: club,
    contexto: { origin: 'superadmin_panel' },
  })

  return NextResponse.json({ ok: true, club }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const user = await ensureSuperAdmin()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const parsed = updateClubSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Operación inválida' }, { status: 400 })

  const updates = parsed.data.action === 'approve' ? { estado: 'aprobado' }
    : parsed.data.action === 'suspend' ? { estado: 'pendiente' }
      : parsed.data.action === 'enablePremium' ? { acceso_biblioteca_elite: true }
        : { acceso_biblioteca_elite: false }
  const service = createSupabaseServiceClient()
  const { data: previous } = await service.from('clubs').select('*').eq('id', parsed.data.clubId).is('deleted_at', null).maybeSingle()
  if (!previous) return NextResponse.json({ error: 'Club no encontrado' }, { status: 404 })
  const { data: club, error } = await service.from('clubs').update(updates).eq('id', parsed.data.clubId).is('deleted_at', null).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await service.from('auditoria').insert({ club_id: club.id, usuario_id: user.id, entidad: 'clubs', entidad_id: club.id, accion: 'update', valor_anterior: previous, valor_nuevo: club, contexto: { origin: 'superadmin_panel' } })
  return NextResponse.json({ ok: true, club })
}

export async function DELETE(request: NextRequest) {
  const user = await ensureSuperAdmin()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const parsed = deleteClubSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Confirma el nombre y escribe un motivo de al menos 5 caracteres' }, { status: 400 })

  const service = createSupabaseServiceClient()
  const { data: club, error: clubError } = await service.from('clubs').select('*').eq('id', parsed.data.clubId).is('deleted_at', null).maybeSingle()
  if (clubError) return NextResponse.json({ error: clubError.message }, { status: 500 })
  if (!club) return NextResponse.json({ error: 'Club no encontrado' }, { status: 404 })
  if (club.nombre !== parsed.data.confirmationName) return NextResponse.json({ error: 'El nombre de confirmación no coincide' }, { status: 400 })

  const { data: ownProfile } = await service.from('perfiles').select('club_id').eq('id', user.id).maybeSingle()
  if (ownProfile?.club_id === club.id) return NextResponse.json({ error: 'No puedes eliminar el club asociado a tu cuenta maestra' }, { status: 400 })

  const deletedAt = new Date().toISOString()
  const { error: deleteError } = await service.from('clubs').update({
    deleted_at: deletedAt,
    deleted_by: user.id,
    deletion_reason: parsed.data.reason,
    estado: 'pendiente',
    acceso_biblioteca_elite: false,
  }).eq('id', club.id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  const { data: profiles } = await service.from('perfiles').select('id').eq('club_id', club.id)
  let suspendedUsers = 0
  for (const profile of profiles ?? []) {
    const { data: target } = await service.auth.admin.getUserById(profile.id)
    if (isSuperAdminEmail(target.user?.email)) continue
    const { error } = await service.auth.admin.updateUserById(profile.id, { ban_duration: '876000h' })
    if (!error) suspendedUsers += 1
  }

  await service.from('auditoria').insert({
    club_id: club.id,
    usuario_id: user.id,
    entidad: 'clubs',
    entidad_id: club.id,
    accion: 'soft_delete',
    motivo: parsed.data.reason,
    valor_anterior: club,
    valor_nuevo: { ...club, deleted_at: deletedAt, estado: 'pendiente', acceso_biblioteca_elite: false },
    contexto: { origin: 'superadmin_panel', suspended_users: suspendedUsers },
  })

  return NextResponse.json({ ok: true, suspendedUsers })
}

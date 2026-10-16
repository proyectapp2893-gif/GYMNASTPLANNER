import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServiceClient, getAuthenticatedClub } from '../../../lib/supabase-server'
import { getConfiguredGroups } from '../../../lib/shared-macrocycles'

const createSchema = z.object({ grupoId: z.string().uuid().nullable() })
const updateSchema = z.object({ id: z.string().uuid(), activo: z.boolean() })

async function adminContext() {
  const context = await getAuthenticatedClub()
  if (!context.user || !context.clubId) return { ...context, allowed: false }
  const { data: profile } = await context.supabase.from('perfiles').select('rol')
    .eq('id', context.user.id).eq('club_id', context.clubId).maybeSingle()
  return { ...context, allowed: ['administrador', 'administrador_organizacion'].includes(String(profile?.rol).toLowerCase()) }
}

export async function GET() {
  const context = await adminContext()
  if (!context.user || !context.clubId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!context.allowed) return NextResponse.json({ error: 'Solo administración puede gestionar enlaces' }, { status: 403 })
  try {
    const db = createSupabaseServiceClient()
    const [groups, links] = await Promise.all([
      getConfiguredGroups(context.clubId),
      db.from('enlaces_macrociclo').select('id,grupo_id,token,activo,created_at')
        .eq('club_id', context.clubId).order('created_at'),
    ])
    if (links.error) throw links.error
    return NextResponse.json({ groups: groups.map(({ id, nombre, nivel }) => ({ id, nombre, nivel })), links: links.data || [] }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error consultando enlaces:', error)
    return NextResponse.json({ error: 'No se pudieron cargar los enlaces. Verifica que la migración esté aplicada.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const context = await adminContext()
  if (!context.user || !context.clubId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!context.allowed) return NextResponse.json({ error: 'Solo administración puede gestionar enlaces' }, { status: 403 })
  const input = createSchema.safeParse(await request.json().catch(() => ({})))
  if (!input.success) return NextResponse.json({ error: 'Alcance inválido' }, { status: 400 })
  const groups = await getConfiguredGroups(context.clubId)
  if (!groups.length || (input.data.grupoId && !groups.some(group => group.id === input.data.grupoId))) {
    return NextResponse.json({ error: 'El macrociclo debe estar configurado para compartirlo' }, { status: 422 })
  }
  const db = createSupabaseServiceClient()
  let existingQuery = db.from('enlaces_macrociclo').select('id,grupo_id,token,activo,created_at').eq('club_id', context.clubId)
  existingQuery = input.data.grupoId ? existingQuery.eq('grupo_id', input.data.grupoId) : existingQuery.is('grupo_id', null)
  const { data: existing, error: existingError } = await existingQuery.maybeSingle()
  if (existingError) return NextResponse.json({ error: 'No se pudo consultar el enlace' }, { status: 500 })
  if (existing) return NextResponse.json({ link: existing }, { headers: { 'Cache-Control': 'private, no-store' } })
  const { data, error } = await db.from('enlaces_macrociclo')
    .insert({ club_id: context.clubId, grupo_id: input.data.grupoId, activo: false, created_by: context.user.id })
    .select('id,grupo_id,token,activo,created_at').single()
  if (error) return NextResponse.json({ error: 'No se pudo crear el enlace' }, { status: 500 })
  return NextResponse.json({ link: data }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } })
}

export async function PATCH(request: NextRequest) {
  const context = await adminContext()
  if (!context.user || !context.clubId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!context.allowed) return NextResponse.json({ error: 'Solo administración puede gestionar enlaces' }, { status: 403 })
  const input = updateSchema.safeParse(await request.json().catch(() => ({})))
  if (!input.success) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  const db = createSupabaseServiceClient()
  const { data: link } = await db.from('enlaces_macrociclo').select('id,grupo_id').eq('id', input.data.id).eq('club_id', context.clubId).maybeSingle()
  if (!link) return NextResponse.json({ error: 'Enlace no encontrado' }, { status: 404 })
  if (input.data.activo) {
    const groups = await getConfiguredGroups(context.clubId)
    if (!groups.length || (link.grupo_id && !groups.some(group => group.id === link.grupo_id))) {
      return NextResponse.json({ error: 'El macrociclo debe estar configurado para activar el enlace' }, { status: 422 })
    }
  }
  const { data, error } = await db.from('enlaces_macrociclo')
    .update({ activo: input.data.activo, updated_at: new Date().toISOString() })
    .eq('id', link.id).eq('club_id', context.clubId)
    .select('id,grupo_id,token,activo,created_at').single()
  if (error) return NextResponse.json({ error: 'No se pudo actualizar el enlace' }, { status: 500 })
  return NextResponse.json({ link: data }, { headers: { 'Cache-Control': 'private, no-store' } })
}

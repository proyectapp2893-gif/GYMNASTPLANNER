import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedClub } from '../../../lib/supabase-server'

const getSessionSchema = z.object({
  grupoId: z.string().uuid(),
  nivel: z.string().min(1).max(80),
  fechaCalendario: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  objetivo: z.string().min(1).max(220),
})

const saveSessionSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  grupoId: z.string().uuid(),
  nivel: z.string().min(1).max(80),
  objetivo: z.string().min(1).max(220),
  fechaCalendario: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  ejercicios: z.record(z.string(), z.unknown()),
})

export async function GET(request: NextRequest) {
  try {
    const { supabase, clubId, error: authError } = await getAuthenticatedClub()
    if (authError || !clubId) {
      return NextResponse.json({ error: authError || 'No autenticado' }, { status: 401 })
    }

    const parsed = getSessionSchema.safeParse({
      grupoId: request.nextUrl.searchParams.get('grupoId'),
      nivel: request.nextUrl.searchParams.get('nivel'),
      fechaCalendario: request.nextUrl.searchParams.get('fechaCalendario'),
      objetivo: request.nextUrl.searchParams.get('objetivo'),
    })

    if (!parsed.success) {
      return NextResponse.json({ error: 'Entrada inválida', details: parsed.error.flatten() }, { status: 400 })
    }

    const { grupoId, nivel, fechaCalendario, objetivo } = parsed.data
    const authorized = await ensureGroupBelongsToClub(supabase, grupoId, clubId)
    if (!authorized) {
      return NextResponse.json({ error: 'Grupo no autorizado para este club' }, { status: 403 })
    }

    let query = supabase
      .from('sesiones')
      .select('*')
      .eq('club_id', clubId)
      .eq('grupo_id', grupoId)

    query = fechaCalendario ? query.eq('fecha_calendario', fechaCalendario) : query.eq('objetivo', objetivo)
    const { data: session, error } = await query.maybeSingle()
    if (error) throw error

    if (session) return NextResponse.json({ session })

    let legacyQuery = supabase
      .from('sesiones')
      .select('*')
      .eq('club_id', clubId)
      .eq('nivel', nivel)
      .is('grupo_id', null)

    legacyQuery = fechaCalendario ? legacyQuery.eq('fecha_calendario', fechaCalendario) : legacyQuery.eq('objetivo', objetivo)
    const { data: legacySession, error: legacyError } = await legacyQuery.maybeSingle()
    if (legacyError) throw legacyError

    return NextResponse.json({ session: legacySession || null })
  } catch (error) {
    console.error('Error cargando sesión:', error)
    return NextResponse.json({ error: 'No se pudo cargar la sesión' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, clubId, error: authError } = await getAuthenticatedClub()
    if (authError || !clubId) {
      return NextResponse.json({ error: authError || 'No autenticado' }, { status: 401 })
    }

    const parsed = saveSessionSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Entrada inválida', details: parsed.error.flatten() }, { status: 400 })
    }

    const { id, grupoId, nivel, objetivo, fechaCalendario, ejercicios } = parsed.data
    const authorized = await ensureGroupBelongsToClub(supabase, grupoId, clubId)
    if (!authorized) {
      return NextResponse.json({ error: 'Grupo no autorizado para este club' }, { status: 403 })
    }

    const payload = {
      club_id: clubId,
      grupo_id: grupoId,
      nivel,
      objetivo,
      fecha_calendario: fechaCalendario || null,
      ejercicios,
    }

    const result = id
      ? await supabase
        .from('sesiones')
        .update(payload)
        .eq('id', id)
        .eq('club_id', clubId)
        .or(`grupo_id.eq.${grupoId},grupo_id.is.null`)
        .select()
        .single()
      : await supabase
        .from('sesiones')
        .insert([payload])
        .select()
        .single()

    if (result.error) throw result.error

    return NextResponse.json({ session: result.data })
  } catch (error) {
    console.error('Error guardando sesión:', error)
    return NextResponse.json({ error: 'No se pudo guardar la sesión' }, { status: 500 })
  }
}

async function ensureGroupBelongsToClub(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClub>>['supabase'],
  grupoId: string,
  clubId: string
) {
  const { data, error } = await supabase
    .from('grupos')
    .select('id')
    .eq('id', grupoId)
    .eq('club_id', clubId)
    .maybeSingle()

  return Boolean(!error && data)
}

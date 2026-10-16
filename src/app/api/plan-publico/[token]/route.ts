import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServiceClient } from '../../../../lib/supabase-server'
import { getConfiguredGroups, monthBounds, sanitizeSharedSession } from '../../../../lib/shared-macrocycles'

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const parsedToken = z.string().uuid().safeParse((await params).token)
  const month = request.nextUrl.searchParams.get('mes') || ''
  const bounds = monthBounds(month)
  if (!parsedToken.success || !bounds) return NextResponse.json({ error: 'Enlace o mes inválido' }, { status: 400 })

  try {
    const db = createSupabaseServiceClient()
    const { data: link, error: linkError } = await db.from('enlaces_macrociclo')
      .select('club_id,grupo_id,activo').eq('token', parsedToken.data).maybeSingle()
    if (linkError || !link?.activo) return NextResponse.json({ error: 'Este enlace no está disponible' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })

    const allConfigured = await getConfiguredGroups(link.club_id)
    const groups = link.grupo_id ? allConfigured.filter(group => group.id === link.grupo_id) : allConfigured
    if (!groups.length) return NextResponse.json({ error: 'No hay macrociclos configurados para este enlace' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })

    const [{ data: club, error: clubError }, { data: rows, error: sessionError }] = await Promise.all([
      db.from('clubs').select('nombre').eq('id', link.club_id).is('deleted_at', null).maybeSingle(),
      db.from('sesiones').select('id,grupo_id,fecha_calendario,objetivo,duracion_prevista_min,ejercicios')
        .eq('club_id', link.club_id).in('grupo_id', groups.map(group => group.id))
        .is('atleta_id', null).is('deleted_at', null)
        .gte('fecha_calendario', bounds.start).lte('fecha_calendario', bounds.end)
        .order('fecha_calendario').limit(500),
    ])
    if (clubError || sessionError || !club) throw clubError || sessionError || new Error('Club no disponible')
    return NextResponse.json({ club: club.nombre, groups, sessions: (rows || []).flatMap(row => {
      const session = sanitizeSharedSession(row)
      return session ? [session] : []
    }) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error consultando plan público:', error)
    return NextResponse.json({ error: 'No se pudo cargar el calendario compartido' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}

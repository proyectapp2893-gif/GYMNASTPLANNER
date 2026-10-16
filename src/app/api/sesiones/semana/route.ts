import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedClub } from '../../../../lib/supabase-server'

const querySchema = z.object({
  grupoId: z.string().uuid(),
  inicio: z.iso.date(),
  fin: z.iso.date(),
})

export async function GET(request: NextRequest) {
  const { supabase, clubId, error: authError } = await getAuthenticatedClub()
  if (authError || !clubId) return NextResponse.json({ error: authError || 'No autenticado' }, { status: 401 })

  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success || parsed.data.inicio > parsed.data.fin) {
    return NextResponse.json({ error: 'Rango semanal inválido' }, { status: 400 })
  }
  const { grupoId, inicio, fin } = parsed.data
  const { data: group } = await supabase.from('grupos').select('id').eq('id', grupoId).eq('club_id', clubId).maybeSingle()
  if (!group) return NextResponse.json({ error: 'Grupo no autorizado' }, { status: 403 })

  const historyStart = new Date(`${inicio}T12:00:00Z`)
  historyStart.setUTCDate(historyStart.getUTCDate() - 28)
  const { data, error } = await supabase.from('sesiones')
    .select('id,fecha_calendario,objetivo,volumen_planificado,intensidad_planificada,duracion_prevista_min,estado,ejercicios')
    .eq('club_id', clubId).eq('grupo_id', grupoId).is('atleta_id', null).is('deleted_at', null)
    .gte('fecha_calendario', historyStart.toISOString().slice(0, 10)).lte('fecha_calendario', fin)
    .order('fecha_calendario', { ascending: false }).limit(100)
  if (error) return NextResponse.json({ error: 'No se pudieron cargar las sesiones' }, { status: 500 })

  const sessions = (data || []).map(session => ({
    id: session.id,
    fecha_calendario: session.fecha_calendario,
    objetivo: session.objetivo,
    volumen_planificado: session.volumen_planificado,
    intensidad_planificada: session.intensidad_planificada,
    duracion_prevista_min: session.duracion_prevista_min,
    estado: session.estado,
    exerciseCount: session.ejercicios && typeof session.ejercicios === 'object'
      ? Object.values(session.ejercicios).reduce<number>((sum, value) => sum + (Array.isArray(value) ? value.length : 0), 0)
      : 0,
  }))
  return NextResponse.json({ sessions })
}

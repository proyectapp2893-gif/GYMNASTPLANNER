import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClub } from '../../../../lib/supabase-server'
import { monthBounds, monthlyReportSchema, reportFileName } from '../../../../lib/monthly-report/model'
import { createMonthlyWorkbook } from '../../../../lib/monthly-report/workbook'
import type { ReportSession, ReportInput } from '../../../../lib/monthly-report/model'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { supabase, clubId, error: authError } = await getAuthenticatedClub()
    if (authError || !clubId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    const parsed = monthlyReportSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Revisa el mes, la modalidad y la categoría del reporte.' }, { status: 400 })
    const options = parsed.data
    const { data: group, error: groupError } = await supabase.from('grupos').select('id,nombre').eq('id', options.grupoId).eq('club_id', clubId).maybeSingle()
    if (groupError) throw groupError
    if (!group) return NextResponse.json({ error: 'Grupo no autorizado para este club' }, { status: 403 })
    const [planResult, clubResult] = await Promise.all([
      supabase.from('configuracion_grupos_efectiva').select('*').eq('grupo_id', group.id).maybeSingle(),
      supabase.from('clubs').select('nombre').eq('id', clubId).single(),
    ])
    if (planResult.error) throw planResult.error
    if (clubResult.error) throw clubResult.error
    const config = planResult.data as ReportInput['config'] | null
    if (!config?.fecha_inicio || !Number.isInteger(config.semanas_totales) || Number(config.semanas_totales) < 1 || Number(config.semanas_totales) > 260) {
      return NextResponse.json({ error: 'Configura la fecha de inicio y la duración del macrociclo (1 a 260 semanas).' }, { status: 422 })
    }
    const bounds = monthBounds(options.mes)
    const sessions: ReportSession[] = []
    // Paginate so the database response limit cannot silently truncate the report.
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from('sesiones').select('id,fecha_calendario,objetivo,nivel,ejercicios,hora_inicio,duracion_prevista_min,observaciones')
        .eq('club_id', clubId).eq('grupo_id', group.id).is('atleta_id', null).is('deleted_at', null).gte('fecha_calendario', bounds.start).lt('fecha_calendario', bounds.end)
        .order('fecha_calendario').order('id').range(offset, offset + 499)
      if (error) throw error
      sessions.push(...(data || []) as ReportSession[])
      if (!data || data.length < 500) break
    }
    if (!sessions.length) return NextResponse.json({ error: 'No hay sesiones guardadas para este grupo en el mes seleccionado. Guarda las clases antes de exportar.' }, { status: 422 })
    const input = { ...options, club: clubResult.data?.nombre || 'Club', grupo: group.nombre, config, sessions }
    const format = options.formato || 'xlsx'
    const buffer = format === 'pdf'
      ? await (await import('../../../../lib/monthly-report/pdf')).createMonthlyPdf(input)
      : await createMonthlyWorkbook(input)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="reporte-${options.mes}.${format}"; filename*=UTF-8''${encodeURIComponent(reportFileName(options, format))}`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('Error generando reporte mensual:', error)
    return NextResponse.json({ error: 'No se pudo generar el reporte mensual. Intenta de nuevo.' }, { status: 500 })
  }
}

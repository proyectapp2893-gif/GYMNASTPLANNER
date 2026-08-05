import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedClub } from '../../../../../lib/supabase-server'
import { physicalAssessmentSchema } from '../../../../../lib/physical-assessments/schema'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const athlete = z.string().uuid().safeParse(id)
  const input = physicalAssessmentSchema.safeParse(await request.json().catch(() => ({})))
  if (!athlete.success || !input.success) return NextResponse.json({ error: 'Evaluación física inválida', details: input.success ? undefined : input.error.flatten() }, { status: 400 })
  const { supabase, user, clubId, error: authError } = await getAuthenticatedClub()
  if (authError || !user || !clubId) return NextResponse.json({ error: authError || 'No autenticado' }, { status: 401 })
  const { data: gymnast } = await supabase.from('atletas').select('id').eq('id', athlete.data).eq('club_id', clubId).is('deleted_at', null).maybeSingle()
  if (!gymnast) return NextResponse.json({ error: 'Gimnasta no autorizada' }, { status: 403 })
  const testIds = [...new Set(input.data.results.map(result => result.testId))]
  if (testIds.length !== input.data.results.length) return NextResponse.json({ error: 'No repitas una prueba en la misma evaluación' }, { status: 400 })
  const { data: tests, error: testsError } = await supabase.from('catalogo_pruebas_fisicas').select('id,unidad').in('id', testIds).eq('activo', true).or(`club_id.is.null,club_id.eq.${clubId}`)
  if (testsError || tests?.length !== testIds.length) return NextResponse.json({ error: 'Una o más pruebas no están autorizadas' }, { status: 403 })
  if(input.data.batteryId){const {data:items}=await supabase.from('baterias_pruebas_fisicas').select('id,bateria_pruebas_items(prueba_id,requerida)').eq('id',input.data.batteryId).eq('club_id',clubId).eq('activa',true).maybeSingle();if(!items)return NextResponse.json({error:'Batería no autorizada'},{status:403});const configured=new Set((Array.isArray(items.bateria_pruebas_items)?items.bateria_pruebas_items:[]).map(item=>String(item.prueba_id)));if(testIds.some(id=>!configured.has(id)))return NextResponse.json({error:'La evaluación contiene pruebas fuera de la batería'},{status:400})}
  const { data: session, error: sessionError } = await supabase.from('sesiones_pruebas_fisicas').insert({ club_id: clubId, atleta_id: gymnast.id, bateria_id:input.data.batteryId, fecha: input.data.date, evaluador_id: user.id, observaciones: input.data.notes }).select('id').single()
  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 400 })
  const units = new Map(tests.map(test => [String(test.id), String(test.unidad)]))
  const { error: resultsError } = await supabase.from('resultados_pruebas_fisicas').insert(input.data.results.map(result => ({ club_id: clubId, sesion_prueba_id: session.id, prueba_id: result.testId, valor: result.value, unidad: units.get(result.testId), observaciones: result.notes })))
  if (resultsError) {
    await supabase.from('sesiones_pruebas_fisicas').delete().eq('id', session.id).eq('club_id', clubId)
    return NextResponse.json({ error: resultsError.message }, { status: 400 })
  }
  return NextResponse.json({ assessmentId: session.id }, { status: 201 })
}

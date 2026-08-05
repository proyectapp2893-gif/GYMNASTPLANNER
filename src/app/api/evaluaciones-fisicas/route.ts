import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedClub } from '../../../lib/supabase-server'

const createEvaluationSchema = z.object({
  atletaId: z.string().uuid(),
  grupoId: z.string().uuid(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  resultados: z.record(z.string(), z.unknown()),
})

const deleteEvaluationSchema = z.string().uuid()

export async function POST(request: Request) {
  try {
    const { supabase, clubId, error: authError } = await getAuthenticatedClub()
    if (authError || !clubId) {
      return NextResponse.json({ error: authError || 'No autenticado' }, { status: 401 })
    }

    const parsed = createEvaluationSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Entrada inválida', details: parsed.error.flatten() }, { status: 400 })
    }

    const { atletaId, grupoId, fecha, resultados } = parsed.data

    const { data: atleta } = await supabase
      .from('atletas')
      .select('id')
      .eq('id', atletaId)
      .eq('grupo_id', grupoId)
      .eq('club_id', clubId)
      .maybeSingle()

    if (!atleta) {
      return NextResponse.json({ error: 'Atleta no autorizada para este club o grupo' }, { status: 403 })
    }

    const { error } = await supabase.from('evaluaciones_fisicas').insert([{
      atleta_id: atletaId,
      grupo_id: grupoId,
      fecha,
      resultados,
      club_id: clubId,
    }])

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error guardando evaluación física:', error)
    return NextResponse.json({ error: 'No se pudo guardar la evaluación' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, clubId, error: authError } = await getAuthenticatedClub()
    if (authError || !clubId) {
      return NextResponse.json({ error: authError || 'No autenticado' }, { status: 401 })
    }

    const parsed = deleteEvaluationSchema.safeParse(request.nextUrl.searchParams.get('id'))
    if (!parsed.success) {
      return NextResponse.json({ error: 'id inválido' }, { status: 400 })
    }

    const { error } = await supabase
      .from('evaluaciones_fisicas')
      .delete()
      .eq('id', parsed.data)
      .eq('club_id', clubId)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error eliminando evaluación física:', error)
    return NextResponse.json({ error: 'No se pudo eliminar la evaluación' }, { status: 500 })
  }
}

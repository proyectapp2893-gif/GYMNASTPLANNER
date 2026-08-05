import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedClub } from '../../../lib/supabase-server'

const APARATOS = ['Salto', 'Barras', 'Viga', 'Suelo'] as const

const saveScoresSchema = z.object({
  competenciaId: z.string().uuid(),
  atletaId: z.string().uuid(),
  puntuaciones: z.array(z.object({
    aparato: z.enum(APARATOS),
    notaD: z.number().min(0).max(20),
    notaE: z.number().min(0).max(20),
    notaFinal: z.number().min(0).max(40),
  })).min(1).max(4),
})

export async function POST(request: Request) {
  try {
    const { supabase, clubId, error: authError } = await getAuthenticatedClub()
    if (authError || !clubId) {
      return NextResponse.json({ error: authError || 'No autenticado' }, { status: 401 })
    }

    const parsed = saveScoresSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Entrada inválida', details: parsed.error.flatten() }, { status: 400 })
    }

    const { competenciaId, atletaId, puntuaciones } = parsed.data

    const [{ data: competencia }, { data: atleta }] = await Promise.all([
      supabase.from('competencias').select('id').eq('id', competenciaId).eq('club_id', clubId).maybeSingle(),
      supabase.from('atletas').select('id').eq('id', atletaId).eq('club_id', clubId).maybeSingle(),
    ])

    if (!competencia || !atleta) {
      return NextResponse.json({ error: 'Competencia o atleta no autorizado para este club' }, { status: 403 })
    }

    const rows = puntuaciones.map(score => ({
      club_id: clubId,
      competencia_id: competenciaId,
      atleta_id: atletaId,
      aparato: score.aparato,
      nota_d: score.notaD,
      nota_e: score.notaE,
      nota_final: score.notaFinal,
    }))

    const { error } = await supabase
      .from('puntuaciones')
      .upsert(rows, { onConflict: 'competencia_id, atleta_id, aparato' })

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error guardando puntuaciones:', error)
    return NextResponse.json({ error: 'No se pudieron guardar las puntuaciones' }, { status: 500 })
  }
}

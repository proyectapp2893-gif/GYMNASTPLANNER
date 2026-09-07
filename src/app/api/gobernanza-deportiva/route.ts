import { NextRequest, NextResponse } from 'next/server'
import { createSportsGovernanceRecordSchema, updateSportsRuleSchema } from '../../../lib/sports-governance/schema'
import { getAuthenticatedClub } from '../../../lib/supabase-server'

async function adminContext() {
  const context = await getAuthenticatedClub()
  if (context.error || !context.user || !context.clubId) return { ...context, allowed: false }
  const { data } = await context.supabase.from('perfiles').select('rol').eq('id', context.user.id).eq('club_id', context.clubId).maybeSingle()
  return { ...context, allowed: ['administrador','administrador_organizacion'].includes(String(data?.rol).toLowerCase()) }
}

export async function POST(request: NextRequest) {
  const input = createSportsGovernanceRecordSchema.safeParse(await request.json().catch(() => ({})))
  if (!input.success) return NextResponse.json({ error: 'Registro de gobernanza inválido', details: input.error.flatten() }, { status: 400 })
  const context = await adminContext()
  if (!context.user || !context.clubId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!context.allowed) return NextResponse.json({ error: 'Solo administración puede gestionar el conocimiento deportivo' }, { status: 403 })

  const value = input.data
  if (value.kind === 'source') {
    const { data, error } = await context.supabase.from('fuentes_conocimiento_deportivo').insert({
      club_id: context.clubId, codigo: value.code, titulo: value.title, organizacion: value.organization,
      version: value.version, anio_publicacion: value.publicationYear, estado_vigencia: value.validity,
      alcance_uso: value.usageScope, url_fuente: value.sourceUrl, nota_licencia: value.licenseNote,
      created_by: context.user.id,
    }).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ record: data }, { status: 201 })
  }

  if (value.kind === 'stage') {
    const { data, error } = await context.supabase.from('etapas_desarrollo_deportivo').insert({
      club_id: context.clubId, codigo: value.code, nombre: value.name, orden: value.order,
      descripcion: value.description, edad_minima_referencia: value.referenceMinAge,
      edad_maxima_referencia: value.referenceMaxAge, objetivos: value.objectives, created_by: context.user.id,
    }).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ record: data }, { status: 201 })
  }

  const [{ data: source }, { data: stage }] = await Promise.all([
    context.supabase.from('fuentes_conocimiento_deportivo').select('id').eq('id', value.sourceId).or(`club_id.is.null,club_id.eq.${context.clubId}`).maybeSingle(),
    value.stageId ? context.supabase.from('etapas_desarrollo_deportivo').select('id').eq('id', value.stageId).or(`club_id.is.null,club_id.eq.${context.clubId}`).maybeSingle() : Promise.resolve({ data: { id: null } }),
  ])
  if (!source || (value.stageId && !stage)) return NextResponse.json({ error: 'La fuente o etapa no está disponible para este club' }, { status: 403 })
  const { data, error } = await context.supabase.from('reglas_conocimiento_deportivo').insert({
    club_id: context.clubId, fuente_id: source.id, etapa_id: value.stageId, codigo: value.code,
    titulo: value.title, categoria: value.category, nivel_accion: value.actionLevel,
    condicion: value.condition, recomendacion: value.recommendation, fundamento: value.rationale,
    paginas_referencia: value.referencePages, estado: 'borrador', created_by: context.user.id,
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ record: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const input = updateSportsRuleSchema.safeParse(await request.json().catch(() => ({})))
  if (!input.success) return NextResponse.json({ error: 'Cambio de estado inválido' }, { status: 400 })
  const context = await adminContext()
  if (!context.user || !context.clubId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!context.allowed) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const approved = input.data.status === 'aprobada'
  const { data, error } = await context.supabase.from('reglas_conocimiento_deportivo').update({
    estado: input.data.status, aprobada_at: approved ? new Date().toISOString() : null,
    aprobada_por: approved ? context.user.id : null, updated_at: new Date().toISOString(),
  }).eq('id', input.data.id).eq('club_id', context.clubId).select('id').maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: 'Solo puedes modificar reglas de tu organización' }, { status: 404 })
  return NextResponse.json({ record: data })
}

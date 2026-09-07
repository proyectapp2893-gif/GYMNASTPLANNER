import 'server-only'
import { getAuthenticatedClub } from '../supabase-server'

export async function getApprovedSportsKnowledgeContext(categories?: string[]) {
  const { supabase, clubId, error } = await getAuthenticatedClub()
  if (error || !clubId) return []

  let query = supabase
    .from('reglas_conocimiento_deportivo')
    .select('codigo,titulo,categoria,nivel_accion,condicion,recomendacion,fundamento,paginas_referencia,fuentes_conocimiento_deportivo(codigo,titulo,organizacion,version,estado_vigencia,alcance_uso)')
    .or(`club_id.is.null,club_id.eq.${clubId}`)
    .eq('estado', 'aprobada')
    .or('valida_desde.is.null,valida_desde.lte.' + new Date().toISOString().slice(0, 10))
    .or('valida_hasta.is.null,valida_hasta.gte.' + new Date().toISOString().slice(0, 10))
    .order('nivel_accion', { ascending: false })
    .limit(50)

  if (categories?.length) query = query.in('categoria', categories)
  const { data, error: queryError } = await query
  if (queryError) throw new Error(`No se pudo cargar el conocimiento deportivo aprobado: ${queryError.message}`)

  return (data || []).map(row => ({
    code: row.codigo,
    title: row.titulo,
    category: row.categoria,
    actionLevel: row.nivel_accion,
    condition: row.condicion,
    recommendation: row.recomendacion,
    rationale: row.fundamento,
    referencePages: row.paginas_referencia,
    source: row.fuentes_conocimiento_deportivo,
  }))
}

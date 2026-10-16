import { createSupabaseServiceClient } from './supabase-server'
import type { PlanningConfig } from './sports-planning'
import type { TrainingDay } from './weekly-load-planning'

export type SharedGroup = {
  id: string
  nombre: string
  nivel: string
  config: PlanningConfig & { horario_semanal: TrainingDay[] }
}

export type SharedExercise = { nombre: string; categoria: string; descripcion: string; dosificacion: string | Record<string, string> | null }
export type SharedSession = { id: string; grupoId: string; fecha: string; objetivo: string; duracion: number | null; bloques: Array<{ nombre: string; ejercicios: SharedExercise[] }> }

const BLOCK_NAMES: Record<string, string> = {
  calentamiento_general: 'Calentamiento general', calentamiento_especifico: 'Preparación específica',
  prep_fisica_core: 'Zona media y estabilizadores', prep_fisica_superior: 'Tren superior', prep_fisica_inferior: 'Tren inferior',
  tecnico_aparato1: 'Trabajo técnico 1', tecnico_aparato2: 'Trabajo técnico 2',
  rutinas_mitades: 'Secuencias y conexiones', rutinas_completas: 'Rutinas completas',
  flexibilidad_activa: 'Flexibilidad activa', flexibilidad_pasiva: 'Flexibilidad pasiva',
  cierre_elongacion: 'Elongación', cierre_retroalimentacion: 'Retroalimentación',
  calentamiento: 'Calentamiento', 'prep-fisica': 'Preparación física', tecnico: 'Trabajo técnico',
  rutinas: 'Rutinas', flexibilidad: 'Flexibilidad', cierre: 'Vuelta a la calma',
}

export function isConfiguredMacrocycle(config: { fecha_inicio?: string | null; semanas_totales?: number | null; horario_semanal?: unknown } | null | undefined) {
  return Boolean(config?.fecha_inicio && Number(config.semanas_totales) > 0 && Array.isArray(config.horario_semanal) && config.horario_semanal.length > 0)
}

export async function getConfiguredGroups(clubId: string): Promise<SharedGroup[]> {
  const db = createSupabaseServiceClient()
  const { data: groups, error: groupError } = await db.from('grupos').select('id,nombre,nivel').eq('club_id', clubId).is('deleted_at', null).order('nivel').order('nombre')
  if (groupError) throw groupError
  const ids = (groups || []).map(group => group.id)
  if (!ids.length) return []
  const { data: configs, error: configError } = await db.from('configuracion_grupos_efectiva')
    .select('grupo_id,fecha_inicio,fecha_fin,fecha_competencia,competencias_secundarias,semanas_totales,semanas_preparatorio,semanas_competitivo,horario_semanal')
    .in('grupo_id', ids)
  if (configError) throw configError
  const configByGroup = new Map((configs || []).map(config => [config.grupo_id, config]))
  return (groups || []).flatMap(group => {
    const config = configByGroup.get(group.id)
    if (!isConfiguredMacrocycle(config)) return []
    return [{ id: group.id, nombre: group.nombre, nivel: group.nivel,
      config: {
        fecha_inicio: config!.fecha_inicio, fecha_fin: config!.fecha_fin,
        fecha_competencia: config!.fecha_competencia,
        competencias_secundarias: Array.isArray(config!.competencias_secundarias) ? config!.competencias_secundarias : [],
        semanas_totales: config!.semanas_totales,
        semanas_preparatorio: config!.semanas_preparatorio,
        semanas_competitivo: config!.semanas_competitivo,
        horario_semanal: Array.isArray(config!.horario_semanal) ? config!.horario_semanal as TrainingDay[] : [],
      } }]
  })
}

export function sanitizeSharedSession(row: { id: string; grupo_id: string | null; fecha_calendario: string | null; objetivo: string | null; duracion_prevista_min: number | null; ejercicios: unknown }): SharedSession | null {
  if (!row.grupo_id || !row.fecha_calendario) return null
  const raw = row.ejercicios && typeof row.ejercicios === 'object' && !Array.isArray(row.ejercicios) ? row.ejercicios as Record<string, unknown> : {}
  const bloques = Object.entries(BLOCK_NAMES).flatMap(([key, nombre]) => {
    const list = raw[key]
    if (!Array.isArray(list) || !list.length) return []
    const ejercicios = list.flatMap(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return []
      const exercise = item as Record<string, unknown>
      const dose = exercise.dosificacion
      return [{
        nombre: String(exercise.contenido || exercise.nombre || 'Ejercicio'),
        categoria: typeof exercise.categoria === 'string' ? exercise.categoria : '',
        descripcion: typeof exercise.descripcion_corta === 'string' ? exercise.descripcion_corta : '',
        dosificacion: typeof dose === 'string' ? dose : dose && typeof dose === 'object' && !Array.isArray(dose)
          ? Object.fromEntries(Object.entries(dose).filter((entry): entry is [string, string] => typeof entry[1] === 'string')) : null,
      }]
    })
    return [{ nombre, ejercicios }]
  })
  return { id: row.id, grupoId: row.grupo_id, fecha: row.fecha_calendario,
    objetivo: row.objetivo || 'Entrenamiento', duracion: row.duracion_prevista_min, bloques }
}

export function monthBounds(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null
  const [year, number] = month.split('-').map(Number)
  const last = new Date(Date.UTC(year, number, 0)).getUTCDate()
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, '0')}` }
}

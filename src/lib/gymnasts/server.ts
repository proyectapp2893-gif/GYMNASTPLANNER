import 'server-only'

import { cache } from 'react'
import { notFound } from 'next/navigation'
import { getAuthenticatedClub } from '../supabase-server'
import { saveIndividualSessionSchema } from '../individual-sessions/schema'
import type { PlanningConfig } from '../sports-planning'
import {buildMonitoringSignals} from '../adaptive-monitoring/engine'
import {buildProgressSnapshot} from '../progress-reviews/summary'

export type GymnastListItem = {
  id: string
  nombre: string
  fecha_nacimiento: string | null
  categoria_competitiva: string | null
  avatar_path: string | null
  grupo: { id: string; nombre: string; nivel: string } | null
}

export type GymnastProfile = GymnastListItem & {
  fecha_ingreso: string | null
  lateralidad: string | null
  disponibilidad_semanal: Record<string, unknown>
  duracion_sesion_habitual_min: number | null
  objetivo_temporada: string | null
  observaciones: string | null
}

export const getGymnasts = cache(async (): Promise<GymnastListItem[]> => {
  const { supabase, clubId, error } = await getAuthenticatedClub()
  if (error || !clubId) return []

  const { data, error: queryError } = await supabase
    .from('atletas')
    .select('id,nombre,fecha_nacimiento,categoria_competitiva,avatar_path,grupos(id,nombre,nivel)')
    .eq('club_id', clubId)
    .is('deleted_at', null)
    .order('nombre')

  if (queryError) throw new Error(`No se pudieron cargar las gimnastas: ${queryError.message}`)

  return (data || []).map(row => ({
    id: String(row.id),
    nombre: String(row.nombre),
    fecha_nacimiento: asNullableString(row.fecha_nacimiento),
    categoria_competitiva: asNullableString(row.categoria_competitiva),
    avatar_path: asNullableString(row.avatar_path),
    grupo: normalizeGroup(row.grupos),
  }))
})

export const getGymnastGroups=cache(async()=>{const{supabase,clubId,error}=await getAuthenticatedClub();if(error||!clubId)return[];const{data, error:queryError}=await supabase.from('grupos').select('id,nombre,nivel').eq('club_id',clubId).order('nivel').order('nombre');if(queryError)throw new Error(`No se pudieron cargar los grupos: ${queryError.message}`);return data||[]})

export const getGymnastProfile = cache(async (gymnastId: string): Promise<GymnastProfile> => {
  const { supabase, clubId, error } = await getAuthenticatedClub()
  if (error || !clubId) notFound()

  const { data, error: queryError } = await supabase
    .from('atletas')
    .select('id,nombre,fecha_nacimiento,categoria_competitiva,avatar_path,fecha_ingreso,lateralidad,disponibilidad_semanal,duracion_sesion_habitual_min,objetivo_temporada,observaciones,grupos(id,nombre,nivel)')
    .eq('id', gymnastId)
    .eq('club_id', clubId)
    .is('deleted_at', null)
    .maybeSingle()

  if (queryError || !data) notFound()

  return {
    id: String(data.id),
    nombre: String(data.nombre),
    fecha_nacimiento: asNullableString(data.fecha_nacimiento),
    categoria_competitiva: asNullableString(data.categoria_competitiva),
    avatar_path: asNullableString(data.avatar_path),
    fecha_ingreso: asNullableString(data.fecha_ingreso),
    lateralidad: asNullableString(data.lateralidad),
    disponibilidad_semanal: isRecord(data.disponibilidad_semanal) ? data.disponibilidad_semanal : {},
    duracion_sesion_habitual_min: typeof data.duracion_sesion_habitual_min === 'number' ? data.duracion_sesion_habitual_min : null,
    objetivo_temporada: asNullableString(data.objetivo_temporada),
    observaciones: asNullableString(data.observaciones),
    grupo: normalizeGroup(data.grupos),
  }
})

export const getGymnastAnnualConfiguration=cache(async(gymnastId:string):Promise<PlanningConfig|null>=>{
  const {supabase,clubId,error}=await getAuthenticatedClub()
  if(error||!clubId)notFound()
  const {data:gymnast}=await supabase.from('atletas').select('grupo_id').eq('id',gymnastId).eq('club_id',clubId).is('deleted_at',null).maybeSingle()
  if(!gymnast?.grupo_id)return null
  const {data,error:queryError}=await supabase.from('configuracion_grupos').select('fecha_inicio,fecha_competencia,semanas_totales,semanas_preparatorio,semanas_competitivo,competencias_secundarias').eq('grupo_id',gymnast.grupo_id).maybeSingle()
  if(queryError)throw new Error(`No se pudo cargar el macrociclo del grupo: ${queryError.message}`)
  if(!data)return null
  const secondary=Array.isArray(data.competencias_secundarias)?data.competencias_secundarias.filter(isRecord).map(item=>({nombre:asNullableString(item.nombre)||undefined,fecha:asNullableString(item.fecha)||undefined})):null
  return{fecha_inicio:asNullableString(data.fecha_inicio),fecha_competencia:asNullableString(data.fecha_competencia),semanas_totales:typeof data.semanas_totales==='number'?data.semanas_totales:null,semanas_preparatorio:typeof data.semanas_preparatorio==='number'?data.semanas_preparatorio:null,semanas_competitivo:typeof data.semanas_competitivo==='number'?data.semanas_competitivo:null,competencias_secundarias:secondary}
})

export async function getGymnastDashboardMetrics(gymnastId: string) {
  const { supabase, clubId, error } = await getAuthenticatedClub()
  if (error || !clubId) notFound()

  const today = new Date()
  const monday = new Date(today)
  const day = monday.getDay() || 7
  monday.setDate(monday.getDate() - day + 1)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const date = (value: Date) => value.toISOString().slice(0, 10)

  const [sessions, goals, restrictions, skills, loads, attendance] = await Promise.all([
    supabase.from('sesiones').select('id,estado,fecha_calendario,objetivo').eq('club_id', clubId).eq('atleta_id', gymnastId).gte('fecha_calendario', date(monday)).lte('fecha_calendario', date(sunday)).is('deleted_at', null).order('fecha_calendario'),
    supabase.from('objetivos_atleta').select('id,descripcion,estado,porcentaje_avance,prioridad,fecha_objetivo').eq('club_id', clubId).eq('atleta_id', gymnastId).is('deleted_at', null).in('estado', ['pendiente','en_progreso','en_riesgo']).order('prioridad').limit(5),
    supabase.from('restricciones_atleta').select('id,zona_corporal,estado,adaptaciones_temporales,intensidad_reportada').eq('club_id', clubId).eq('atleta_id', gymnastId).is('deleted_at', null).in('estado', ['activa','en_revision']),
    supabase.from('estado_elemento_atleta').select('id,porcentaje_dominio,elementos_tecnicos(nombre,catalogo_items(nombre)),catalogo_items!estado_elemento_atleta_estado_item_id_fkey(nombre)').eq('club_id', clubId).eq('atleta_id', gymnastId).order('updated_at', { ascending: false }).limit(8),
    supabase.from('cargas_entrenamiento').select('carga_interna,rpe_sesion,duracion_real_min').eq('club_id', clubId).eq('atleta_id', gymnastId).gte('fecha', date(monday)).lte('fecha', date(sunday)),
    supabase.from('asistencia').select('estado').eq('club_id', clubId).eq('atleta_id', gymnastId),
  ])

  const loadRows = loads.data || []
  const attendanceRows = attendance.data || []
  const attended = attendanceRows.filter(row => ['confirmada','parcial','fuera_del_plan'].includes(String(row.estado))).length

  return {
    sessions: sessions.data || [],
    goals: goals.data || [],
    restrictions: restrictions.data || [],
    skills: skills.data || [],
    weeklyLoad: loadRows.reduce((sum, row) => sum + Number(row.carga_interna || 0), 0),
    averageRpe: average(loadRows.map(row => Number(row.rpe_sesion)).filter(Number.isFinite)),
    attendancePercent: attendanceRows.length ? Math.round((attended / attendanceRows.length) * 100) : null,
  }
}

export async function getModuleRows(gymnastId: string, module: string) {
  const { supabase, clubId, error } = await getAuthenticatedClub()
  if (error || !clubId) notFound()

  const config: Record<string, { table: string; select: string; order: string }> = {
    sesiones: { table: 'sesiones', select: 'id,fecha_calendario,objetivo,estado,duracion_prevista_min,duracion_real_min', order: 'fecha_calendario' },
    tecnica: { table: 'estado_elemento_atleta', select: 'id,porcentaje_dominio,updated_at,elementos_tecnicos(nombre),catalogo_items!estado_elemento_atleta_estado_item_id_fkey(nombre)', order: 'updated_at' },
    evaluaciones: { table: 'sesiones_pruebas_fisicas', select: 'id,fecha,observaciones', order: 'fecha' },
    objetivos: { table: 'objetivos_atleta', select: 'id,descripcion,estado,porcentaje_avance,fecha_objetivo,prioridad', order: 'fecha_objetivo' },
    cargas: { table: 'cargas_entrenamiento', select: 'id,fecha,duracion_real_min,rpe_sesion,carga_interna', order: 'fecha' },
    evidencias: { table: 'evidencias_multimedia', select: 'id,created_at,mime_type,momento,comentario,privacidad', order: 'created_at' },
    restricciones: { table: 'restricciones_atleta', select: 'id,fecha_inicio,fecha_fin,zona_corporal,estado,intensidad_reportada,adaptaciones_temporales', order: 'fecha_inicio' },
    competencias: { table: 'competencias_atleta', select: 'id,objetivo_resultado,objetivo_ejecucion,competencias(nombre,fecha,ciudad)', order: 'created_at' },
    informes: { table: 'retroalimentaciones', select: 'id,created_at,comentario_entrenador,proximo_foco,visible_familia', order: 'created_at' },
  }
  const selected = config[module]
  if (!selected) return []

  const { data, error: queryError } = await supabase
    .from(selected.table)
    .select(selected.select)
    .eq('club_id', clubId)
    .eq('atleta_id', gymnastId)
    .order(selected.order, { ascending: false })
    .limit(30)

  if (queryError) throw new Error(queryError.message)
  return (data || []) as unknown as Array<Record<string, unknown>>
}

export async function getIndividualSessionsPage(gymnastId:string,page:number,pageSize=12){const {supabase,clubId,error}=await getAuthenticatedClub();if(error||!clubId)notFound();const safePage=Math.max(1,Math.floor(page));const from=(safePage-1)*pageSize;const {data,count,error:queryError}=await supabase.from('sesiones').select('id,fecha_calendario,objetivo,estado,duracion_prevista_min,duracion_real_min',{count:'exact'}).eq('club_id',clubId).eq('atleta_id',gymnastId).is('deleted_at',null).order('fecha_calendario',{ascending:false}).range(from,from+pageSize-1);if(queryError)throw new Error(queryError.message);return{rows:data||[],page:safePage,total:count||0,totalPages:Math.max(1,Math.ceil((count||0)/pageSize))}}

export async function getIndividualPlanning(gymnastId: string) {
  const { supabase, clubId, error } = await getAuthenticatedClub()
  if (error || !clubId) notFound()

  const { data: plan, error: planError } = await supabase
    .from('planes_individuales')
    .select('id,estado,objetivo_principal,fecha_inicio,fecha_fin,macrociclos(id,nombre,objetivo,version_actual,fecha_inicio,fecha_fin,grupos(nombre,nivel)),versiones_plan_general(id,numero_version,snapshot)')
    .eq('club_id', clubId)
    .eq('atleta_id', gymnastId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (planError) throw new Error(planError.message)
  if (!plan) return { plan: null, overrides: [], conflicts: 0 }

  const { data: overrides, error: overridesError } = await supabase
    .from('ajustes_plan_individual')
    .select('id,entidad_tipo,ruta_campo,origen,estado_sincronizacion,motivo,updated_at')
    .eq('club_id', clubId)
    .eq('plan_individual_id', plan.id)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  if (overridesError) throw new Error(overridesError.message)
  const rows = overrides || []
  return {
    plan,
    overrides: rows,
    conflicts: rows.filter(row => ['conflicto','requiere_confirmacion'].includes(String(row.estado_sincronizacion))).length,
  }
}

export async function getPlanningTimeline(gymnastId:string){const {supabase,clubId,error}=await getAuthenticatedClub();if(error||!clubId)notFound();const {data:plan}=await supabase.from('planes_individuales').select('id,macrociclo_id').eq('club_id',clubId).eq('atleta_id',gymnastId).is('deleted_at',null).order('created_at',{ascending:false}).limit(1).maybeSingle();if(!plan)return{mesocycles:[],microcycles:[],sessions:[]};const {data:mesocycles,error:mesoError}=await supabase.from('mesociclos').select('id,nombre,fecha_inicio,fecha_fin,objetivo,volumen,intensidad,prioridad_tecnica,prioridad_fisica').eq('club_id',clubId).eq('macrociclo_id',plan.macrociclo_id).is('deleted_at',null).order('fecha_inicio');if(mesoError)throw new Error(mesoError.message);const mesoIds=(mesocycles||[]).map(x=>String(x.id));const [microcycles,sessions]=await Promise.all([mesoIds.length?supabase.from('microciclos').select('id,mesociclo_id,numero_semana,tipo,fecha_inicio,fecha_fin,objetivo,volumen,intensidad,es_descarga,estado').eq('club_id',clubId).in('mesociclo_id',mesoIds).is('deleted_at',null).order('fecha_inicio'):Promise.resolve({data:[],error:null}),supabase.from('sesiones').select('id,fecha_calendario,objetivo,estado,duracion_prevista_min,duracion_real_min,intensidad_planificada,volumen_planificado,sesion_general_id').eq('club_id',clubId).eq('plan_individual_id',plan.id).is('deleted_at',null).order('fecha_calendario')]);if(microcycles.error)throw new Error(microcycles.error.message);if(sessions.error)throw new Error(sessions.error.message);return{mesocycles:mesocycles||[],microcycles:microcycles.data||[],sessions:sessions.data||[]}}

export async function getGeneralSessionOptions(gymnastId: string) {
  const { supabase, clubId, error } = await getAuthenticatedClub()
  if (error || !clubId) notFound()
  const { data: gymnast } = await supabase.from('atletas').select('grupo_id').eq('id',gymnastId).eq('club_id',clubId).maybeSingle()
  if (!gymnast?.grupo_id) return []
  const { data, error: queryError } = await supabase.from('sesiones').select('id,fecha_calendario,objetivo').eq('club_id',clubId).eq('grupo_id',gymnast.grupo_id).is('atleta_id',null).is('deleted_at',null).order('fecha_calendario',{ascending:false}).limit(20)
  if (queryError) throw new Error(queryError.message)
  return data || []
}

export async function getExerciseBank() {
  const { supabase, clubId, error } = await getAuthenticatedClub()
  if (error || !clubId) notFound()
  const { data, error: queryError } = await supabase.from('ejercicios').select('id,nombre,categoria,aparato,descripcion_corta,rangos_repeticiones,nivel_impacto,prerrequisitos,requisitos_fisicos,patrones_fundamentales').order('nombre').limit(300)
  if (queryError) throw new Error(queryError.message)
  return (data || []).map(item=>({id:String(item.id),name:String(item.nombre),category:typeof item.categoria==='string'?item.categoria:null,apparatus:typeof item.aparato==='string'?item.aparato:null,description:typeof item.descripcion_corta==='string'?item.descripcion_corta:null,doseHint:typeof item.rangos_repeticiones==='string'?item.rangos_repeticiones:null,impact:isImpact(item.nivel_impacto)?item.nivel_impacto:null,prerequisites:stringArray(item.prerrequisitos),physicalRequirements:stringArray(item.requisitos_fisicos),fundamentalPatterns:stringArray(item.patrones_fundamentales)}))
}

export async function getAthleteReadinessContext(gymnastId:string){
  const {supabase,clubId,error}=await getAuthenticatedClub();if(error||!clubId)notFound()
  const [athlete,checkin,restrictions,skills]=await Promise.all([
    supabase.from('atletas').select('etapa_desarrollo_revisada_at,etapas_desarrollo_deportivo(nombre)').eq('id',gymnastId).eq('club_id',clubId).is('deleted_at',null).maybeSingle(),
    supabase.from('registros_desarrollo_atleta').select('fecha,disposicion,estres,confianza,miedo_reportado').eq('atleta_id',gymnastId).eq('club_id',clubId).order('fecha',{ascending:false}).limit(1).maybeSingle(),
    supabase.from('restricciones_atleta').select('zona_corporal,adaptaciones_temporales').eq('atleta_id',gymnastId).eq('club_id',clubId).in('estado',['activa','en_revision']).is('deleted_at',null),
    supabase.from('estado_elemento_atleta').select('porcentaje_dominio,elementos_tecnicos(nombre)').eq('atleta_id',gymnastId).eq('club_id',clubId).gte('porcentaje_dominio',80),
  ])
  if(!athlete.data)notFound();for(const result of[checkin,restrictions,skills])if(result.error)throw new Error(result.error.message)
  const stage=Array.isArray(athlete.data.etapas_desarrollo_deportivo)?athlete.data.etapas_desarrollo_deportivo[0]:athlete.data.etapas_desarrollo_deportivo
  return{stageName:typeof stage?.nombre==='string'?stage.nombre:null,stageReviewedAt:asNullableString(athlete.data.etapa_desarrollo_revisada_at),latestCheckin:checkin.data?{date:String(checkin.data.fecha),readiness:Number(checkin.data.disposicion),stress:Number(checkin.data.estres),confidence:Number(checkin.data.confianza),reportedFear:Boolean(checkin.data.miedo_reportado)}:null,restrictions:(restrictions.data||[]).map(item=>({bodyArea:String(item.zona_corporal),adaptations:asNullableString(item.adaptaciones_temporales)})),masteredSkills:(skills.data||[]).flatMap(item=>{const skill=Array.isArray(item.elementos_tecnicos)?item.elementos_tecnicos[0]:item.elementos_tecnicos;return typeof skill?.nombre==='string'?[skill.nombre]:[]})}
}

export async function getIndividualSessionForEdit(gymnastId:string,sessionId:string) {
  const { supabase, clubId, error } = await getAuthenticatedClub()
  if (error || !clubId) notFound()
  const {data,error:queryError}=await supabase.from('sesiones').select('id,fecha_calendario,hora_inicio,duracion_disponible_min,objetivo,prioridad,intensidad_planificada,volumen_planificado,observaciones,sesion_general_id,bloques_sesion(id,orden,titulo,objetivo,contenido,duracion_prevista_min,origen,catalogo_items(codigo),ejercicios_sesion(id,orden,ejercicio_id,series,repeticiones,tiempo_segundos,carga,unidad_carga,pausa_segundos,tempo,rpe_esperado,distancia_metros,capacidad_dominante,patron_movimiento,segmento_corporal,plano_movimiento,sistema_energetico,transferencia_aparato,dificultad,errores_comunes,progresion,regresion,instrucciones,ejercicios(nombre,aparato)))').eq('id',sessionId).eq('atleta_id',gymnastId).eq('club_id',clubId).is('deleted_at',null).maybeSingle()
  if(queryError||!data)notFound()
  const rawBlocks=Array.isArray(data.bloques_sesion)?data.bloques_sesion:[]
  const byPhase=new Map(rawBlocks.map(raw=>{const catalog=Array.isArray(raw.catalogo_items)?raw.catalogo_items[0]:raw.catalogo_items;return [String(catalog?.codigo),raw]}))
  const defaultTitles:Record<string,string>={encuadre:'1. Encuadre inicial',calentamiento:'2. Calentamiento general y específico',tecnico:'3. Trabajo técnico',fisico:'4. Trabajo físico complementario',vuelta_calma:'5. Vuelta a la calma'}
  const blocks=(['encuadre','calentamiento','tecnico','fisico','vuelta_calma'] as const).map(phase=>{const raw=byPhase.get(phase);const rawExercises=raw&&Array.isArray(raw.ejercicios_sesion)?[...raw.ejercicios_sesion].sort((a,b)=>Number(a.orden)-Number(b.orden)):[];return {phase,title:raw?String(raw.titulo):defaultTitles[phase],objective:raw?String(raw.objetivo||''):'',plannedDurationMin:raw?Number(raw.duracion_prevista_min||0):0,content:isRecord(raw?.contenido)?raw.contenido:{},origin:normalizeOrigin(raw?.origen),exercises:rawExercises.map(item=>{const exercise=Array.isArray(item.ejercicios)?item.ejercicios[0]:item.ejercicios;return {instanceId:crypto.randomUUID(),exerciseId:String(item.ejercicio_id),name:String(exercise?.nombre||'Ejercicio'),apparatus:typeof exercise?.aparato==='string'?exercise.aparato:null,series:nullableNumber(item.series),repetitions:nullableNumber(item.repeticiones),timeSeconds:nullableNumber(item.tiempo_segundos),load:nullableNumber(item.carga),loadUnit:nullableString(item.unidad_carga),pauseSeconds:nullableNumber(item.pausa_segundos),tempo:nullableString(item.tempo),expectedRpe:nullableNumber(item.rpe_esperado),distanceMeters:nullableNumber(item.distancia_metros),dominantCapacity:nullableString(item.capacidad_dominante),movementPattern:nullableString(item.patron_movimiento),bodySegment:nullableString(item.segmento_corporal),movementPlane:nullableString(item.plano_movimiento),energySystem:nullableString(item.sistema_energetico),apparatusTransfer:nullableString(item.transferencia_aparato),difficulty:nullableString(item.dificultad),commonErrors:nullableString(item.errores_comunes),progression:nullableString(item.progresion),regression:nullableString(item.regresion),instructions:nullableString(item.instrucciones)}})}})
  return {sessionId:String(data.id),date:String(data.fecha_calendario||new Date().toISOString().slice(0,10)),startTime:typeof data.hora_inicio==='string'?data.hora_inicio.slice(0,5):'',availableDurationMin:Number(data.duracion_disponible_min||120),mainObjective:String(data.objetivo),priority:String(data.prioridad||''),plannedIntensity:nullableNumber(data.intensidad_planificada),plannedVolume:nullableNumber(data.volumen_planificado),notes:String(data.observaciones||''),sourceSessionId:String(data.sesion_general_id||''),blocks}
}

export async function getSessionTemplates(gymnastId:string) {
  const {supabase,clubId,error}=await getAuthenticatedClub();if(error||!clubId)notFound()
  const {data,error:queryError}=await supabase.from('plantillas_sesion').select('id,nombre,descripcion,snapshot').eq('club_id',clubId).eq('atleta_id',gymnastId).eq('activa',true).is('deleted_at',null).order('nombre')
  if(queryError)throw new Error(queryError.message)
  return (data||[]).flatMap(item=>{const parsed=saveIndividualSessionSchema.safeParse(item.snapshot);return parsed.success?[{id:String(item.id),name:String(item.nombre),description:nullableString(item.descripcion),snapshot:parsed.data}]:[]})
}

export async function getSessionForExecution(gymnastId:string,sessionId:string){
  const {supabase,clubId,error}=await getAuthenticatedClub();if(error||!clubId)notFound()
  const {data,error:queryError}=await supabase.from('sesiones').select('id,objetivo,fecha_calendario,duracion_prevista_min,duracion_real_min,estado,bloques_sesion(id,orden,titulo,duracion_prevista_min,duracion_real_min,completado,ejercicios_sesion(id,orden,intentos_reales,repeticiones_reales,observaciones_ejecucion,ejercicios(nombre)))').eq('id',sessionId).eq('atleta_id',gymnastId).eq('club_id',clubId).is('deleted_at',null).maybeSingle();if(queryError||!data)notFound()
  const blocks=(Array.isArray(data.bloques_sesion)?data.bloques_sesion:[]).sort((a,b)=>Number(a.orden)-Number(b.orden)).map(block=>({id:String(block.id),title:String(block.titulo),plannedDurationMin:Number(block.duracion_prevista_min||0),actualDurationMin:Number(block.duracion_real_min||block.duracion_prevista_min||0),completed:Boolean(block.completado),exercises:(Array.isArray(block.ejercicios_sesion)?block.ejercicios_sesion:[]).sort((a,b)=>Number(a.orden)-Number(b.orden)).map(item=>{const exercise=Array.isArray(item.ejercicios)?item.ejercicios[0]:item.ejercicios;return{id:String(item.id),name:String(exercise?.nombre||'Ejercicio'),attempts:Number(item.intentos_reales||0),actualRepetitions:item.repeticiones_reales===null?null:Number(item.repeticiones_reales),notes:String(item.observaciones_ejecucion||'')}})}))
  return{id:String(data.id),objective:String(data.objetivo),date:String(data.fecha_calendario||''),plannedDurationMin:Number(data.duracion_prevista_min||0),actualDurationMin:Number(data.duracion_real_min||data.duracion_prevista_min||0),status:String(data.estado),blocks}
}

export async function getPedagogicalSession(gymnastId:string,sessionId:string){const {supabase,clubId,error}=await getAuthenticatedClub();if(error||!clubId)notFound();const {data,error:queryError}=await supabase.from('sesiones').select('id,objetivo,bloques_sesion(id,contenido,catalogo_items(codigo))').eq('id',sessionId).eq('atleta_id',gymnastId).eq('club_id',clubId).is('deleted_at',null).maybeSingle();if(queryError||!data)notFound();const contents:Record<string,Record<string,string>>={};for(const block of Array.isArray(data.bloques_sesion)?data.bloques_sesion:[]){const catalog=Array.isArray(block.catalogo_items)?block.catalogo_items[0]:block.catalogo_items;const raw=isRecord(block.contenido)&&isRecord(block.contenido.pedagogia)?block.contenido.pedagogia:{};contents[String(catalog?.codigo)]=Object.fromEntries(Object.entries(raw).filter((entry):entry is [string,string]=>typeof entry[1]==='string'))}return{id:String(data.id),objective:String(data.objetivo),contents}}

export async function getTechnicalWorkspace(gymnastId:string){const {supabase,clubId,error}=await getAuthenticatedClub();if(error||!clubId)notFound();const [elements,states,apparatus,assessments,errorCatalog,errors,steps]=await Promise.all([supabase.from('elementos_tecnicos').select('id,nombre,codigo,nivel,dificultad,catalogo_items(nombre)').eq('club_id',clubId).eq('activo',true).order('nombre'),supabase.from('catalogo_items').select('id,codigo,nombre,catalogos!inner(codigo)').eq('catalogos.codigo','estados_tecnicos').eq('activo',true).order('orden'),supabase.from('catalogo_items').select('id,codigo,nombre,catalogos!inner(codigo)').eq('catalogos.codigo','aparatos').eq('activo',true).order('orden'),supabase.from('estado_elemento_atleta').select('id,elemento_id,porcentaje_dominio,intentos,ejecuciones_correctas,ejecuciones_con_ayuda,ultima_evaluacion,observaciones,elementos_tecnicos(nombre,codigo,catalogo_items(nombre)),catalogo_items!estado_elemento_atleta_estado_item_id_fkey(nombre,codigo)').eq('club_id',clubId).eq('atleta_id',gymnastId).order('updated_at',{ascending:false}),supabase.from('catalogo_items').select('id,codigo,nombre,catalogos!inner(codigo)').eq('catalogos.codigo','errores_tecnicos').eq('activo',true).order('orden'),supabase.from('errores_tecnicos_atleta').select('id,fecha,severidad,tendencia,correccion_aplicada,elementos_tecnicos(nombre),catalogo_items(nombre)').eq('club_id',clubId).eq('atleta_id',gymnastId).is('deleted_at',null).order('fecha',{ascending:false}).limit(30),supabase.from('pasos_progresion_elemento').select('id,nombre,orden,criterio_avance,minimo_ejecuciones_correctas,elementos_tecnicos(nombre)').eq('club_id',clubId).order('orden')]);for(const result of [elements,states,apparatus,assessments,errorCatalog,errors,steps])if(result.error)throw new Error(result.error.message);return{elements:elements.data||[],states:states.data||[],apparatus:apparatus.data||[],assessments:assessments.data||[],errorCatalog:errorCatalog.data||[],errors:errors.data||[],steps:steps.data||[]}}

export async function getMethodologyWorkspace(gymnastId:string){const {supabase,clubId,error}=await getAuthenticatedClub();if(error||!clubId)notFound();const [steps,progress]=await Promise.all([supabase.from('pasos_progresion_elemento').select('id,elemento_id,nombre,orden,criterio_avance,minimo_ejecuciones_correctas,errores_bloqueantes,riesgos,elementos_tecnicos(nombre)').eq('club_id',clubId).order('elemento_id').order('orden'),supabase.from('progreso_paso_atleta').select('id,paso_id,estado,calidad_tecnica,seguridad,consistencia,comprension,control_corporal,ejecuciones_correctas,observaciones').eq('club_id',clubId).eq('atleta_id',gymnastId)]);if(steps.error)throw new Error(steps.error.message);if(progress.error)throw new Error(progress.error.message);return{steps:steps.data||[],progress:progress.data||[]}}

export async function getPhysicalAssessmentWorkspace(gymnastId:string){const {supabase,clubId,error}=await getAuthenticatedClub();if(error||!clubId)notFound();const [tests,batteries,sessions]=await Promise.all([supabase.from('catalogo_pruebas_fisicas').select('id,nombre,unidad,mayor_es_mejor').eq('activo',true).or(`club_id.is.null,club_id.eq.${clubId}`).order('nombre'),supabase.from('baterias_pruebas_fisicas').select('id,nombre,bateria_pruebas_items(prueba_id,orden,requerida)').eq('club_id',clubId).eq('activa',true).order('nombre'),supabase.from('sesiones_pruebas_fisicas').select('id,fecha,observaciones,bateria_id,baterias_pruebas_fisicas(nombre),resultados_pruebas_fisicas(id,valor,unidad,catalogo_pruebas_fisicas(nombre))').eq('club_id',clubId).eq('atleta_id',gymnastId).is('deleted_at',null).order('fecha',{ascending:false}).limit(20)]);if(tests.error)throw new Error(tests.error.message);if(batteries.error)throw new Error(batteries.error.message);if(sessions.error)throw new Error(sessions.error.message);return{tests:tests.data||[],batteries:batteries.data||[],sessions:sessions.data||[]}}

export async function getRestrictions(gymnastId:string){const {supabase,clubId,error}=await getAuthenticatedClub();if(error||!clubId)notFound();const {data,error:queryError}=await supabase.from('restricciones_atleta').select('id,zona_corporal,intensidad_reportada,fecha_inicio,fecha_fin,estado,adaptaciones_temporales,observaciones,retorno_autorizado,autorizado_por').eq('club_id',clubId).eq('atleta_id',gymnastId).is('deleted_at',null).order('fecha_inicio',{ascending:false});if(queryError)throw new Error(queryError.message);return data||[]}

export async function getEvidenceWorkspace(gymnastId:string,page=1,pageSize=12){const {supabase,clubId,error}=await getAuthenticatedClub();if(error||!clubId)notFound();const safePage=Math.max(1,Math.floor(page));const from=(safePage-1)*pageSize;const [evidence,elements,sessions,feedback]=await Promise.all([supabase.from('evidencias_multimedia').select('id,storage_path,mime_type,size_bytes,momento,comentario,privacidad,frame_representativo_segundos,created_at',{count:'exact'}).eq('club_id',clubId).eq('atleta_id',gymnastId).is('deleted_at',null).order('created_at',{ascending:false}).range(from,from+pageSize-1),supabase.from('elementos_tecnicos').select('id,nombre').eq('club_id',clubId).eq('activo',true).order('nombre'),supabase.from('sesiones').select('id,fecha_calendario,objetivo').eq('club_id',clubId).eq('atleta_id',gymnastId).is('deleted_at',null).order('fecha_calendario',{ascending:false}).limit(30),supabase.from('retroalimentaciones').select('id,created_at,comentario_entrenador,indicacion_tecnica,explicacion,percepcion_gimnasta,nivel_comprension,proximo_foco,visible_familia,elementos_tecnicos(nombre)').eq('club_id',clubId).eq('atleta_id',gymnastId).is('deleted_at',null).order('created_at',{ascending:false}).limit(50)]);for(const result of [evidence,elements,sessions,feedback])if(result.error)throw new Error(result.error.message);const rows=evidence.data||[];const {data:signedUrls}=rows.length?await supabase.storage.from('gymnast-evidence').createSignedUrls(rows.map(item=>String(item.storage_path)),3600):{data:[]};const urls=new Map((signedUrls||[]).map(item=>[item.path,item.signedUrl]));const signed=rows.map(item=>({...item,signedUrl:urls.get(String(item.storage_path))||null}));const total=evidence.count||0;return{evidence:signed,elements:elements.data||[],sessions:sessions.data||[],feedback:feedback.data||[],page:safePage,total,totalPages:Math.max(1,Math.ceil(total/pageSize))}}

export async function getGoalsWorkspace(gymnastId:string){const {supabase,clubId,error}=await getAuthenticatedClub();if(error||!clubId)notFound();const [types,goals]=await Promise.all([supabase.from('catalogo_items').select('id,nombre,codigo,catalogos!inner(codigo)').eq('catalogos.codigo','tipos_objetivo').eq('activo',true).order('orden'),supabase.from('objetivos_atleta').select('id,descripcion,fecha_inicio,fecha_objetivo,indicador,valor_inicial,valor_esperado,porcentaje_avance,estado,prioridad,observaciones,catalogo_items(nombre)').eq('club_id',clubId).eq('atleta_id',gymnastId).is('deleted_at',null).order('prioridad').order('fecha_objetivo')]);if(types.error)throw new Error(types.error.message);if(goals.error)throw new Error(goals.error.message);return{types:types.data||[],goals:goals.data||[]}}

export async function getCompetitionsWorkspace(gymnastId:string){const {supabase,clubId,error}=await getAuthenticatedClub();if(error||!clubId)notFound();const [available,assigned]=await Promise.all([supabase.from('competencias').select('id,nombre,fecha,ciudad,nivel,categoria').eq('club_id',clubId).is('deleted_at',null).order('fecha',{ascending:true}),supabase.from('competencias_atleta').select('id,objetivo_resultado,objetivo_ejecucion,elementos_requeridos,elementos_opcionales,prioridades,competencias(id,nombre,fecha,fecha_fin,ciudad,nivel,categoria,fecha_limite_preparacion)').eq('club_id',clubId).eq('atleta_id',gymnastId).order('created_at',{ascending:false})]);if(available.error)throw new Error(available.error.message);if(assigned.error)throw new Error(assigned.error.message);return{available:available.data||[],assigned:assigned.data||[]}}

export async function getDominatedElementNames(gymnastId:string){const {supabase,clubId,error}=await getAuthenticatedClub();if(error||!clubId)notFound();const {data,error:queryError}=await supabase.from('estado_elemento_atleta').select('elementos_tecnicos(nombre),catalogo_items!estado_elemento_atleta_estado_item_id_fkey(codigo)').eq('club_id',clubId).eq('atleta_id',gymnastId);if(queryError)throw new Error(queryError.message);return(data||[]).filter(row=>{const state=Array.isArray(row.catalogo_items)?row.catalogo_items[0]:row.catalogo_items;return['dominado','conexion','rutina'].includes(String(state?.codigo))}).map(row=>{const element=Array.isArray(row.elementos_tecnicos)?row.elementos_tecnicos[0]:row.elementos_tecnicos;return normalizeLabel(String(element?.nombre||''))})}

export async function getIndividualReport(gymnastId:string){const {supabase,clubId,error}=await getAuthenticatedClub();if(error||!clubId)notFound();const [{data:gymnast},metrics,technical,physical,goals,competitions,feedback,restrictions,evidence]=await Promise.all([supabase.from('atletas').select('id,nombre,grupos(nombre,nivel)').eq('id',gymnastId).eq('club_id',clubId).is('deleted_at',null).maybeSingle(),getGymnastDashboardMetrics(gymnastId),getTechnicalWorkspace(gymnastId),getPhysicalAssessmentWorkspace(gymnastId),getGoalsWorkspace(gymnastId),getCompetitionsWorkspace(gymnastId),supabase.from('retroalimentaciones').select('id,created_at,comentario_entrenador,indicacion_tecnica,explicacion,percepcion_gimnasta,nivel_comprension,proximo_foco,visible_familia,elementos_tecnicos(nombre)').eq('club_id',clubId).eq('atleta_id',gymnastId).is('deleted_at',null).order('created_at',{ascending:false}).limit(20),supabase.from('restricciones_atleta').select('id,zona_corporal,estado,adaptaciones_temporales,fecha_inicio').eq('club_id',clubId).eq('atleta_id',gymnastId).is('deleted_at',null).in('estado',['activa','en_revision']).order('fecha_inicio',{ascending:false}),supabase.from('evidencias_multimedia').select('id,momento,comentario,privacidad,created_at').eq('club_id',clubId).eq('atleta_id',gymnastId).is('deleted_at',null).order('created_at',{ascending:false}).limit(20)]);if(!gymnast)notFound();for(const query of [feedback,restrictions,evidence])if(query.error)throw new Error(query.error.message);return{gymnast,metrics,technical,physical,goals,competitions,feedback:feedback.data||[],restrictions:restrictions.data||[],evidence:evidence.data||[]}}

export async function getProgressReviewWorkspace(gymnastId:string){const [report,auth]=await Promise.all([getIndividualReport(gymnastId),getAuthenticatedClub()]);if(auth.error||!auth.clubId)notFound();const{data:reviews,error}=await auth.supabase.from('revisiones_progreso_atleta').select('id,periodo_inicio,periodo_fin,snapshot_indicadores,logros,aspectos_a_desarrollar,prioridades_siguiente_periodo,voz_gimnasta,resumen_familia,visible_familia,created_at').eq('club_id',auth.clubId).eq('atleta_id',gymnastId).order('periodo_fin',{ascending:false}).limit(20);if(error)throw new Error(error.message);const snapshot=buildProgressSnapshot({attendancePercent:report.metrics.attendancePercent,weeklyLoad:report.metrics.weeklyLoad,averageRpe:report.metrics.averageRpe,goals:report.goals.goals.map(goal=>({state:String(goal.estado),progress:Number(goal.porcentaje_avance)})),technicalMastery:report.technical.assessments.map(row=>Number(row.porcentaje_dominio)).filter(Number.isFinite),activeRestrictions:report.restrictions.length,evidenceCount:report.evidence.length});return{snapshot,reviews:reviews||[]}}

export async function getAiSuggestions(gymnastId:string){const {supabase,clubId,error}=await getAuthenticatedClub();if(error||!clubId)notFound();const {data,error:queryError}=await supabase.from('sugerencias_ia').select('id,tipo,propuesta_original,propuesta_editada,fundamento,modelo,estado,created_at,aprobado_at').eq('club_id',clubId).eq('atleta_id',gymnastId).order('created_at',{ascending:false}).limit(50);if(queryError)throw new Error(queryError.message);return data||[]}

export async function getLoadWorkspace(gymnastId:string){const {supabase,clubId,error}=await getAuthenticatedClub();if(error||!clubId)notFound();const end=new Date();const start=new Date(end);start.setDate(start.getDate()-20);const iso=(d:Date)=>d.toISOString().slice(0,10);const [loads,wellness,settings]=await Promise.all([supabase.from('cargas_entrenamiento').select('id,fecha,duracion_prevista_min,duracion_real_min,rpe_sesion,carga_interna,aterrizajes,intentos,intensidad_planificada,intensidad_real').eq('club_id',clubId).eq('atleta_id',gymnastId).gte('fecha',iso(start)).lte('fecha',iso(end)).order('fecha',{ascending:false}),supabase.from('registros_bienestar').select('fecha,energia,calidad_sueno,fatiga,disposicion_entrenar,dolor_molestia').eq('club_id',clubId).eq('atleta_id',gymnastId).gte('fecha',iso(start)).order('fecha',{ascending:false}),supabase.from('configuracion_carga').select('aumento_semanal_aviso_pct,rpe_alto,fatiga_alta').eq('club_id',clubId).maybeSingle()]);if(loads.error)throw new Error(loads.error.message);const today=end.getTime();const current=(loads.data||[]).filter(x=>today-new Date(`${x.fecha}T12:00:00`).getTime()<7*86400000);const previous=(loads.data||[]).filter(x=>{const age=today-new Date(`${x.fecha}T12:00:00`).getTime();return age>=7*86400000&&age<14*86400000});const total=(rows:typeof current)=>rows.reduce((sum,x)=>sum+Number(x.carga_interna||0),0);const currentLoad=total(current),previousLoad=total(previous);const variation=previousLoad>0?Math.round(((currentLoad-previousLoad)/previousLoad)*1000)/10:null;return{loads:loads.data||[],wellness:wellness.data||[],currentLoad,previousLoad,variation,settings:settings.data||{aumento_semanal_aviso_pct:20,rpe_alto:8,fatiga_alta:4}}}

export async function getAdaptiveMonitoringWorkspace(gymnastId:string){
  const [loadData,auth]=await Promise.all([getLoadWorkspace(gymnastId),getAuthenticatedClub()]);if(auth.error||!auth.clubId)notFound()
  const [plansResult,calibrationResult]=await Promise.all([auth.supabase.from('planes_adaptacion_atleta').select('id,fecha,senales,decision_entrenador,fecha_revision,estado,resultado,created_at').eq('club_id',auth.clubId).eq('atleta_id',gymnastId).order('created_at',{ascending:false}).limit(20),auth.supabase.from('configuracion_carga').select('disposicion_baja,desviacion_intensidad_aviso,desviacion_duracion_aviso_pct,ventana_sesiones_recientes').eq('club_id',auth.clubId).maybeSingle()]);if(plansResult.error||calibrationResult.error)throw new Error(plansResult.error?.message||calibrationResult.error?.message)
  const metric=(value:unknown)=>value===null||value===undefined?null:Number(value)
  const settings={...loadData.settings,...(calibrationResult.data||{})}
  const signals=buildMonitoringSignals({loads:loadData.loads.map(row=>({date:String(row.fecha),plannedDuration:metric(row.duracion_prevista_min),actualDuration:metric(row.duracion_real_min),plannedIntensity:metric(row.intensidad_planificada),actualIntensity:metric(row.intensidad_real),rpe:metric(row.rpe_sesion),internalLoad:metric(row.carga_interna)})),wellness:loadData.wellness.map(row=>({date:String(row.fecha),fatigue:metric(row.fatiga),readiness:metric(row.disposicion_entrenar),discomfort:Boolean(row.dolor_molestia)})),currentLoad:loadData.currentLoad,previousLoad:loadData.previousLoad,loadIncreaseThreshold:Number(settings.aumento_semanal_aviso_pct),highRpeThreshold:Number(settings.rpe_alto),highFatigueThreshold:Number(settings.fatiga_alta),lowReadinessThreshold:Number(settings.disposicion_baja??2),intensityDeviationThreshold:Number(settings.desviacion_intensidad_aviso??15),durationDeviationPercent:Number(settings.desviacion_duracion_aviso_pct??20),recentSessionWindow:Number(settings.ventana_sesiones_recientes??3)})
  return{...loadData,signals,plans:plansResult.data||[]}
}

export async function getOperationalCalibration(){const{ supabase,clubId,error}=await getAuthenticatedClub();if(error||!clubId)notFound();const{data, error:queryError}=await supabase.from('configuracion_carga').select('aumento_semanal_aviso_pct,rpe_alto,fatiga_alta,disposicion_baja,desviacion_intensidad_aviso,desviacion_duracion_aviso_pct,ventana_sesiones_recientes,dominio_prerrequisito_pct,vigencia_checkin_dias').eq('club_id',clubId).maybeSingle();if(queryError)throw new Error(queryError.message);return data||{aumento_semanal_aviso_pct:20,rpe_alto:8,fatiga_alta:4,disposicion_baja:2,desviacion_intensidad_aviso:15,desviacion_duracion_aviso_pct:20,ventana_sesiones_recientes:3,dominio_prerrequisito_pct:80,vigencia_checkin_dias:7}}

export async function getOperationalReadiness(){const{ supabase,clubId,error}=await getAuthenticatedClub();if(error||!clubId)notFound();const calibration=await getOperationalCalibration();const cutoff=new Date();cutoff.setDate(cutoff.getDate()-Number(calibration.vigencia_checkin_dias));const date=cutoff.toISOString().slice(0,10);const [athletes,withoutStage,recentCheckins,exerciseRows,approvedRules,overdue]=await Promise.all([supabase.from('atletas').select('id',{count:'exact',head:true}).eq('club_id',clubId).is('deleted_at',null),supabase.from('atletas').select('id',{count:'exact',head:true}).eq('club_id',clubId).is('deleted_at',null).is('etapa_desarrollo_id',null),supabase.from('registros_desarrollo_atleta').select('atleta_id').eq('club_id',clubId).gte('fecha',date),supabase.from('ejercicios').select('id,nivel_impacto,prerrequisitos').or(`club_id.eq.${clubId},club_id.is.null`),supabase.from('reglas_conocimiento_deportivo').select('id',{count:'exact',head:true}).eq('estado','aprobada').or(`club_id.eq.${clubId},club_id.is.null`),supabase.from('planes_adaptacion_atleta').select('id',{count:'exact',head:true}).eq('club_id',clubId).neq('estado','cerrado').lt('fecha_revision',new Date().toISOString().slice(0,10))]);const total=athletes.count||0;const covered=new Set((recentCheckins.data||[]).map(row=>String(row.atleta_id))).size;const exerciseData=exerciseRows.data||[];return{athletes:total,athletesWithoutStage:withoutStage.count||0,athletesWithoutRecentCheckin:Math.max(0,total-covered),exercises:exerciseData.length,exercisesWithoutReadinessMetadata:exerciseData.filter(row=>!row.nivel_impacto||!Array.isArray(row.prerrequisitos)||row.prerrequisitos.length===0).length,approvedRules:approvedRules.count||0,overdueAdaptationPlans:overdue.count||0}}

export async function getPhysicalPreparationSummary(gymnastId:string){const data=await getPhysicalAssessmentWorkspace(gymnastId);const latest=new Map<string,{name:string;value:number;unit:string;date:string}>();for(const session of data.sessions){for(const result of Array.isArray(session.resultados_pruebas_fisicas)?session.resultados_pruebas_fisicas:[]){const test=Array.isArray(result.catalogo_pruebas_fisicas)?result.catalogo_pruebas_fisicas[0]:result.catalogo_pruebas_fisicas;const name=String(test?.nombre||'Prueba');if(!latest.has(name))latest.set(name,{name,value:Number(result.valor),unit:String(result.unidad),date:String(session.fecha)})}}return{...data,latest:[...latest.values()]}}

export async function getCoachAssignments(gymnastId:string){const {supabase,clubId,error}=await getAuthenticatedClub();if(error||!clubId)notFound();const [coaches,assignments]=await Promise.all([supabase.from('perfiles').select('id,nombre,rol').eq('club_id',clubId).in('rol',['entrenador','entrenador_principal','entrenador_asistente']).order('nombre'),supabase.from('atleta_entrenadores').select('id,entrenador_id,es_principal,fecha_inicio,fecha_fin,perfiles!atleta_entrenadores_entrenador_id_fkey(nombre,rol)').eq('club_id',clubId).eq('atleta_id',gymnastId).is('fecha_fin',null).order('es_principal',{ascending:false})]);return{coaches:coaches.data||[],assignments:assignments.data||[]}}

export async function getAdminCatalogWorkspace(){const {supabase,clubId,error}=await getAuthenticatedClub();if(error||!clubId)notFound();const [catalogs,items,tests,batteries,loadSettings,evidenceSettings]=await Promise.all([supabase.from('catalogos').select('id,codigo,nombre,editable,club_id').or(`club_id.is.null,club_id.eq.${clubId}`).order('nombre'),supabase.from('catalogo_items').select('id,catalogo_id,codigo,nombre,activo,club_id').or(`club_id.is.null,club_id.eq.${clubId}`).order('orden'),supabase.from('catalogo_pruebas_fisicas').select('id,codigo,nombre,unidad,mayor_es_mejor,activo,club_id').or(`club_id.is.null,club_id.eq.${clubId}`).order('nombre'),supabase.from('baterias_pruebas_fisicas').select('id,nombre,descripcion,activa,bateria_pruebas_items(prueba_id,orden,requerida)').eq('club_id',clubId).order('nombre'),supabase.from('configuracion_carga').select('aumento_semanal_aviso_pct,rpe_alto,fatiga_alta').eq('club_id',clubId).maybeSingle(),supabase.from('configuracion_evidencias').select('tamano_maximo_mb,tipos_mime_permitidos').eq('club_id',clubId).maybeSingle()]);for(const result of [catalogs,items,tests,batteries,loadSettings,evidenceSettings])if(result.error)throw new Error(result.error.message);return{clubId,catalogs:catalogs.data||[],items:items.data||[],tests:tests.data||[],batteries:batteries.data||[],loadSettings:loadSettings.data||{aumento_semanal_aviso_pct:20,rpe_alto:8,fatiga_alta:4},evidenceSettings:evidenceSettings.data||{tamano_maximo_mb:100,tipos_mime_permitidos:['video/mp4','video/quicktime','image/jpeg','image/png','image/webp']}}}

export async function getSportsGovernanceWorkspace(){const{supabase,clubId,error}=await getAuthenticatedClub();if(error||!clubId)notFound();const[sources,stages,rules]=await Promise.all([supabase.from('fuentes_conocimiento_deportivo').select('id,club_id,titulo,organizacion,version,estado_vigencia,alcance_uso').or(`club_id.is.null,club_id.eq.${clubId}`).eq('activa',true).order('titulo'),supabase.from('etapas_desarrollo_deportivo').select('id,club_id,nombre,orden,descripcion').or(`club_id.is.null,club_id.eq.${clubId}`).eq('activa',true).order('orden'),supabase.from('reglas_conocimiento_deportivo').select('id,club_id,titulo,categoria,nivel_accion,estado,fuentes_conocimiento_deportivo(titulo)').or(`club_id.is.null,club_id.eq.${clubId}`).order('created_at',{ascending:false})]);for(const result of[sources,stages,rules])if(result.error)throw new Error(result.error.message);return{clubId,sources:sources.data||[],stages:stages.data||[],rules:rules.data||[]}}


function normalizeGroup(value: unknown) {
  const group = Array.isArray(value) ? value[0] : value
  if (!isRecord(group)) return null
  return { id: String(group.id), nombre: String(group.nombre), nivel: String(group.nivel) }
}

function asNullableString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function stringArray(value:unknown){return Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'):[]}
function isImpact(value:unknown):value is 'bajo'|'moderado'|'alto'{return value==='bajo'||value==='moderado'||value==='alto'}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function average(values: number[]) {
  return values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null
}

function normalizeLabel(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()}

function nullableNumber(value:unknown){return value===null||value===undefined?null:Number(value)}
function nullableString(value:unknown){return typeof value==='string'?value:null}
function normalizeOrigin(value:unknown):'individual'|'adaptado'{return value==='adaptado'?'adaptado':'individual'}

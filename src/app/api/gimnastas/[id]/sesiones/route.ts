import { NextRequest,NextResponse } from 'next/server'
import { z } from 'zod'
import { calculatePlannedDuration,saveIndividualSessionSchema,validatePublishableSession } from '../../../../../lib/individual-sessions/schema'
import { adaptGeneralSession } from '../../../../../lib/individual-sessions/general-adapter'
import { getAuthenticatedClub } from '../../../../../lib/supabase-server'
import {assessSessionReadiness,requiresCoachReview} from '../../../../../lib/athlete-readiness/engine'

const requestSchema=z.object({action:z.enum(['draft','publish']).default('draft'),session:saveIndividualSessionSchema})

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params
  const route=z.string().uuid().safeParse(id)
  const source=z.string().uuid().safeParse(request.nextUrl.searchParams.get('sourceSessionId'))
  if(!route.success||!source.success)return NextResponse.json({error:'Referencia de sesión inválida'},{status:400})
  const {supabase,clubId,error}=await getAuthenticatedClub()
  if(error||!clubId)return NextResponse.json({error:error||'No autenticado'},{status:401})
  const {data:gymnast}=await supabase.from('atletas').select('id,grupo_id').eq('id',route.data).eq('club_id',clubId).is('deleted_at',null).maybeSingle()
  if(!gymnast?.grupo_id)return NextResponse.json({error:'Gimnasta sin grupo autorizado'},{status:403})
  const {data:session,error:sessionError}=await supabase.from('sesiones').select('id,fecha_calendario,objetivo,ejercicios,duracion_disponible_min').eq('id',source.data).eq('club_id',clubId).eq('grupo_id',gymnast.grupo_id).is('atleta_id',null).is('deleted_at',null).maybeSingle()
  if(sessionError)return NextResponse.json({error:sessionError.message},{status:400})
  if(!session)return NextResponse.json({error:'Sesión general no autorizada'},{status:403})
  return NextResponse.json({session:adaptGeneralSession({id:String(session.id),date:String(session.fecha_calendario||new Date().toISOString().slice(0,10)),objective:String(session.objetivo),exercises:session.ejercicios,availableDurationMin:Number(session.duracion_disponible_min||120)})})
}

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;const gymnastId=z.string().uuid().safeParse(id);const parsed=requestSchema.safeParse(await request.json().catch(()=>({})))
  if(!gymnastId.success||!parsed.success)return NextResponse.json({error:'Datos de sesión inválidos',details:parsed.success?undefined:parsed.error.flatten()},{status:400})
  const {action,session}=parsed.data;const publishIssues=action==='publish'?validatePublishableSession(session):[]
  if(publishIssues.length)return NextResponse.json({error:'La sesión no está lista para publicar',issues:publishIssues},{status:422})

  const {supabase,clubId,error:authError}=await getAuthenticatedClub();if(authError||!clubId)return NextResponse.json({error:authError||'No autenticado'},{status:401})
  const {data:gymnast}=await supabase.from('atletas').select('id,grupo_id,grupos(nivel)').eq('id',gymnastId.data).eq('club_id',clubId).is('deleted_at',null).maybeSingle()
  if(!gymnast)return NextResponse.json({error:'Gimnasta no autorizada'},{status:403})
  const group=Array.isArray(gymnast.grupos)?gymnast.grupos[0]:gymnast.grupos
  const user=(await supabase.auth.getUser()).data.user
  if(!user)return NextResponse.json({error:'No autenticado'},{status:401})
  const exerciseIds=[...new Set(session.blocks.flatMap(block=>block.exercises.map(exercise=>exercise.exerciseId)))]
  const [exerciseMetadata,development,latestCheckin,activeRestrictions,mastered]=await Promise.all([
    exerciseIds.length?supabase.from('ejercicios').select('id,nombre,categoria,nivel_impacto,prerrequisitos,requisitos_fisicos,patrones_fundamentales').in('id',exerciseIds):Promise.resolve({data:[],error:null}),
    supabase.from('atletas').select('etapa_desarrollo_revisada_at,etapas_desarrollo_deportivo(nombre)').eq('id',gymnast.id).maybeSingle(),
    supabase.from('registros_desarrollo_atleta').select('fecha,disposicion,estres,confianza,miedo_reportado').eq('club_id',clubId).eq('atleta_id',gymnast.id).order('fecha',{ascending:false}).limit(1).maybeSingle(),
    supabase.from('restricciones_atleta').select('zona_corporal,adaptaciones_temporales').eq('club_id',clubId).eq('atleta_id',gymnast.id).in('estado',['activa','en_revision']).is('deleted_at',null),
    supabase.from('estado_elemento_atleta').select('porcentaje_dominio,elementos_tecnicos(nombre)').eq('club_id',clubId).eq('atleta_id',gymnast.id).gte('porcentaje_dominio',80),
  ])
  for(const query of[exerciseMetadata,development,latestCheckin,activeRestrictions,mastered])if(query.error)return NextResponse.json({error:'No fue posible verificar la preparación individual'},{status:500})
  const stage=Array.isArray(development.data?.etapas_desarrollo_deportivo)?development.data.etapas_desarrollo_deportivo[0]:development.data?.etapas_desarrollo_deportivo
  const readinessContext={stageName:typeof stage?.nombre==='string'?stage.nombre:null,stageReviewedAt:typeof development.data?.etapa_desarrollo_revisada_at==='string'?development.data.etapa_desarrollo_revisada_at:null,latestCheckin:latestCheckin.data?{date:String(latestCheckin.data.fecha),readiness:Number(latestCheckin.data.disposicion),stress:Number(latestCheckin.data.estres),confidence:Number(latestCheckin.data.confianza),reportedFear:Boolean(latestCheckin.data.miedo_reportado)}:null,restrictions:(activeRestrictions.data||[]).map(item=>({bodyArea:String(item.zona_corporal),adaptations:typeof item.adaptaciones_temporales==='string'?item.adaptaciones_temporales:null})),masteredSkills:(mastered.data||[]).flatMap(item=>{const skill=Array.isArray(item.elementos_tecnicos)?item.elementos_tecnicos[0]:item.elementos_tecnicos;return typeof skill?.nombre==='string'?[skill.nombre]:[]})}
  const array=(value:unknown)=>Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'):[]
  const readinessFindings=assessSessionReadiness(readinessContext,(exerciseMetadata.data||[]).map(item=>({id:String(item.id),name:String(item.nombre),category:typeof item.categoria==='string'?item.categoria:null,impact:item.nivel_impacto==='bajo'||item.nivel_impacto==='moderado'||item.nivel_impacto==='alto'?item.nivel_impacto:null,prerequisites:array(item.prerrequisitos),physicalRequirements:array(item.requisitos_fisicos),fundamentalPatterns:array(item.patrones_fundamentales)})))
  if(action==='publish'&&requiresCoachReview(readinessFindings)&&!session.readinessOverrideReason)return NextResponse.json({error:'La preparación individual requiere revisión del entrenador',issues:readinessFindings.filter(item=>item.level==='review').map(item=>item.title)},{status:422})
  const {data:individualPlan}=await supabase.from('planes_individuales').select('id').eq('club_id',clubId).eq('atleta_id',gymnast.id).is('deleted_at',null).order('created_at',{ascending:false}).limit(1).maybeSingle()

  if(session.sourceSessionId){const {data:source}=await supabase.from('sesiones').select('id').eq('id',session.sourceSessionId).eq('club_id',clubId).is('atleta_id',null).maybeSingle();if(!source)return NextResponse.json({error:'La sesión general de origen no pertenece a la organización'},{status:403})}
  const restrictions=await supabase.from('restricciones_atleta').select('zona_corporal,adaptaciones_temporales').eq('club_id',clubId).eq('atleta_id',gymnast.id).in('estado',['activa','en_revision']).is('deleted_at',null)
  const restrictionSummary=(restrictions.data||[]).map(item=>[item.zona_corporal,item.adaptaciones_temporales].filter(Boolean).join(': ')).filter(Boolean).join(' | ')||null
  const total=calculatePlannedDuration(session.blocks)
  const payload={club_id:clubId,grupo_id:gymnast.grupo_id,atleta_id:gymnast.id,plan_individual_id:individualPlan?.id||null,sesion_general_id:session.sourceSessionId||null,nivel:String(group?.nivel||'Individual'),objetivo:session.mainObjective,ejercicios:{source:'individual_normalized'},fecha_calendario:session.date,hora_inicio:session.startTime||null,duracion_prevista_min:total,duracion_disponible_min:session.availableDurationMin,intensidad_planificada:session.plannedIntensity,volumen_planificado:session.plannedVolume,prioridad:session.priority,observaciones:session.notes,restricciones_resumen:restrictionSummary,estado:'borrador',published_at:null,published_by:null,created_by:user.id,updated_by:user.id}
  const result=session.sessionId?await supabase.from('sesiones').update(payload).eq('id',session.sessionId).eq('club_id',clubId).eq('atleta_id',gymnast.id).select('id,estado').single():await supabase.from('sesiones').insert(payload).select('id,estado').single()
  if(result.error)return NextResponse.json({error:result.error.message},{status:400})

  const {data:phaseItems,error:phaseError}=await supabase.from('catalogo_items').select('id,codigo').in('codigo',session.blocks.map(block=>block.phase))
  if(phaseError||!phaseItems)return NextResponse.json({error:'No se encontraron las fases pedagógicas configuradas'},{status:500})
  const phaseIds=new Map(phaseItems.map(item=>[String(item.codigo),String(item.id)]))
  const rows=session.blocks.map((block,index)=>({club_id:clubId,sesion_id:result.data.id,fase_item_id:phaseIds.get(block.phase),origen:block.origin,orden:index,titulo:block.title,objetivo:block.objective,contenido:block.content,duracion_prevista_min:block.plannedDurationMin}))
  if(rows.some(row=>!row.fase_item_id))return NextResponse.json({error:'El catálogo de fases está incompleto'},{status:500})
  const {data:savedBlocks,error:blocksError}=await supabase.from('bloques_sesion').upsert(rows,{onConflict:'sesion_id,orden'}).select('id,orden')
  if(blocksError||!savedBlocks)return NextResponse.json({error:blocksError?.message||'No se pudieron guardar los bloques'},{status:400})

  const blockIds=savedBlocks.map(block=>String(block.id))
  const {error:clearExercisesError}=await supabase.from('ejercicios_sesion').delete().in('bloque_id',blockIds).eq('club_id',clubId)
  if(clearExercisesError)return NextResponse.json({error:'No se pudo sincronizar la dosificación de ejercicios.'},{status:400})
  const blockIdByOrder=new Map(savedBlocks.map(block=>[Number(block.orden),String(block.id)]))
  const exerciseRows=session.blocks.flatMap((block,blockOrder)=>block.exercises.map((exercise,exerciseOrder)=>({
    club_id:clubId,bloque_id:blockIdByOrder.get(blockOrder),ejercicio_id:exercise.exerciseId,origen:block.origin,
    orden:exerciseOrder,series:exercise.series??null,repeticiones:exercise.repetitions??null,
    tiempo_segundos:exercise.timeSeconds??null,carga:exercise.load??null,unidad_carga:exercise.loadUnit||null,
    pausa_segundos:exercise.pauseSeconds??null,tempo:exercise.tempo||null,rpe_esperado:exercise.expectedRpe??null,
    distancia_metros:exercise.distanceMeters??null,capacidad_dominante:exercise.dominantCapacity||null,
    patron_movimiento:exercise.movementPattern||null,segmento_corporal:exercise.bodySegment||null,
    plano_movimiento:exercise.movementPlane||null,sistema_energetico:exercise.energySystem||null,
    transferencia_aparato:exercise.apparatusTransfer||null,dificultad:exercise.difficulty||null,
    errores_comunes:exercise.commonErrors||null,progresion:exercise.progression||null,regresion:exercise.regression||null,
    instrucciones:exercise.instructions||null,
  })))
  if(exerciseRows.length){
    const {error:exerciseError}=await supabase.from('ejercicios_sesion').insert(exerciseRows)
    if(exerciseError)return NextResponse.json({error:exerciseError.message},{status:400})
  }

  const {data:lastVersion}=await supabase.from('versiones_sesion').select('numero_version').eq('sesion_id',result.data.id).order('numero_version',{ascending:false}).limit(1).maybeSingle()
  const versionNumber=Number(lastVersion?.numero_version||0)+1
  const {error:versionError}=await supabase.from('versiones_sesion').insert({club_id:clubId,sesion_id:result.data.id,numero_version:versionNumber,snapshot:{...session,action},motivo:action==='publish'?'Publicación de sesión':'Guardado de borrador',created_by:user.id})
  if(versionError)return NextResponse.json({error:'La sesión se guardó, pero no fue posible crear su versión histórica.'},{status:500})

  if(session.readinessOverrideReason&&requiresCoachReview(readinessFindings))await supabase.from('auditoria').insert({club_id:clubId,usuario_id:user.id,entidad:'sesion',entidad_id:String(result.data.id),accion:'decision_preparacion_documentada',valor_nuevo:{hallazgos:readinessFindings},motivo:session.readinessOverrideReason,contexto:{motor:'readiness_deterministico_v1'}})

  let finalSession=result.data
  if(action==='publish'){
    const published=await supabase.from('sesiones').update({estado:'publicada',published_at:new Date().toISOString(),published_by:user.id,updated_by:user.id}).eq('id',result.data.id).eq('club_id',clubId).eq('atleta_id',gymnast.id).select('id,estado').single()
    if(published.error)return NextResponse.json({error:'Los bloques se guardaron como borrador, pero la publicación no pudo completarse.'},{status:500})
    finalSession=published.data
  }
  return NextResponse.json({session:finalSession,version:versionNumber,totalDurationMin:total,availableDurationMin:session.availableDurationMin,warning:total>session.availableDurationMin?'La duración supera el tiempo disponible.':null},{status:session.sessionId?200:201})
}

import { NextRequest,NextResponse } from 'next/server'
import { z } from 'zod'
import { sessionExecutionSchema } from '../../../../../../../lib/session-execution/schema'
import { getAuthenticatedClub } from '../../../../../../../lib/supabase-server'

export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string;sessionId:string}>}){
  const route=z.object({id:z.string().uuid(),sessionId:z.string().uuid()}).safeParse(await params);const input=sessionExecutionSchema.safeParse(await request.json().catch(()=>({})))
  if(!route.success||!input.success)return NextResponse.json({error:'Registro de ejecución inválido',details:input.success?undefined:input.error.flatten()},{status:400})
  const {supabase,clubId,error:authError}=await getAuthenticatedClub();if(authError||!clubId)return NextResponse.json({error:authError||'No autenticado'},{status:401})
  const {data:session}=await supabase.from('sesiones').select('id,fecha_calendario,duracion_prevista_min,intensidad_planificada').eq('id',route.data.sessionId).eq('atleta_id',route.data.id).eq('club_id',clubId).is('deleted_at',null).maybeSingle();if(!session)return NextResponse.json({error:'Sesión no autorizada'},{status:403})
  const user=(await supabase.auth.getUser()).data.user;if(!user)return NextResponse.json({error:'No autenticado'},{status:401})
  const value=input.data
  const sessionUpdate=await supabase.from('sesiones').update({estado:value.status,duracion_real_min:value.actualDurationMin,updated_by:user.id}).eq('id',session.id).eq('club_id',clubId)
  if(sessionUpdate.error)return NextResponse.json({error:sessionUpdate.error.message},{status:400})
  for(const block of value.blocks){const result=await supabase.from('bloques_sesion').update({duracion_real_min:block.actualDurationMin,completado:block.completed}).eq('id',block.id).eq('sesion_id',session.id).eq('club_id',clubId);if(result.error)return NextResponse.json({error:result.error.message},{status:400})}
  for(const exercise of value.exercises){const result=await supabase.from('ejercicios_sesion').update({intentos_reales:exercise.attempts,repeticiones_reales:exercise.actualRepetitions,observaciones_ejecucion:exercise.notes}).eq('id',exercise.id).eq('club_id',clubId);if(result.error)return NextResponse.json({error:result.error.message},{status:400})}
  const date=String(session.fecha_calendario||new Date().toISOString().slice(0,10))
  const load=await supabase.from('cargas_entrenamiento').upsert({club_id:clubId,atleta_id:route.data.id,sesion_id:session.id,fecha:date,duracion_prevista_min:session.duracion_prevista_min,duracion_real_min:value.actualDurationMin,intentos:value.exercises.reduce((sum,item)=>sum+item.attempts,0),aterrizajes:value.landings,intensidad_planificada:session.intensidad_planificada,intensidad_real:value.actualIntensity,rpe_sesion:value.sessionRpe,registrado_por:user.id},{onConflict:'atleta_id,sesion_id'});if(load.error)return NextResponse.json({error:load.error.message},{status:400})
  const attendance=await supabase.from('asistencia').upsert({club_id:clubId,atleta_id:route.data.id,sesion_id:session.id,fecha:date,estado:value.attendanceStatus,porcentaje_participacion:value.participationPercent,motivo:value.attendanceReason,registrado_por:user.id},{onConflict:'atleta_id,sesion_id,fecha'});if(attendance.error)return NextResponse.json({error:attendance.error.message},{status:400})
  if([value.energy,value.sleepQuality,value.fatigue,value.readiness].some(item=>item!==null)||value.discomfort){const wellness=await supabase.from('registros_bienestar').upsert({club_id:clubId,atleta_id:route.data.id,fecha:date,energia:value.energy,calidad_sueno:value.sleepQuality,fatiga:value.fatigue,disposicion_entrenar:value.readiness,dolor_molestia:value.discomfort,observaciones:value.wellnessNotes,registrado_por:user.id},{onConflict:'atleta_id,fecha'});if(wellness.error)return NextResponse.json({error:wellness.error.message},{status:400})}
  return NextResponse.json({ok:true,internalLoad:value.sessionRpe===null?null:value.actualDurationMin*value.sessionRpe,formula:'duración real × RPE'})
}

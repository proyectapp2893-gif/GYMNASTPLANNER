import 'server-only'
import {notFound} from 'next/navigation'
import {getAuthenticatedClub} from '../supabase-server'
import {calculateGrowthObservation} from './metrics'

export async function getAthleteDevelopmentWorkspace(athleteId:string){
  const {supabase,clubId,error}=await getAuthenticatedClub()
  if(error||!clubId)notFound()
  const [athleteResult,stagesResult,measurementsResult,checkinsResult]=await Promise.all([
    supabase.from('atletas').select('id,etapa_desarrollo_id,etapa_desarrollo_revisada_at').eq('id',athleteId).eq('club_id',clubId).is('deleted_at',null).maybeSingle(),
    supabase.from('etapas_desarrollo_deportivo').select('id,codigo,nombre,orden,descripcion,edad_minima_referencia,edad_maxima_referencia,objetivos').eq('activa',true).order('orden'),
    supabase.from('mediciones_desarrollo_atleta').select('id,fecha,estatura_pie_cm,estatura_sentada_cm,envergadura_cm,peso_kg,protocolo,observaciones').eq('atleta_id',athleteId).eq('club_id',clubId).order('fecha',{ascending:false}).limit(24),
    supabase.from('registros_desarrollo_atleta').select('id,fecha,confianza,motivacion,disfrute,estres,disposicion,miedo_reportado,voz_gimnasta').eq('atleta_id',athleteId).eq('club_id',clubId).order('fecha',{ascending:false}).limit(30),
  ])
  if(athleteResult.error||!athleteResult.data)notFound()
  if(stagesResult.error||measurementsResult.error||checkinsResult.error)throw new Error(stagesResult.error?.message||measurementsResult.error?.message||checkinsResult.error?.message)
  const measurements=(measurementsResult.data||[]).map(row=>({
    id:String(row.id),date:String(row.fecha),standingHeightCm:numberOrNull(row.estatura_pie_cm),sittingHeightCm:numberOrNull(row.estatura_sentada_cm),
    armSpanCm:numberOrNull(row.envergadura_cm),weightKg:numberOrNull(row.peso_kg),protocol:String(row.protocolo),notes:stringOrNull(row.observaciones),
  }))
  return{
    selectedStageId:stringOrNull(athleteResult.data.etapa_desarrollo_id),reviewedAt:stringOrNull(athleteResult.data.etapa_desarrollo_revisada_at),
    stages:(stagesResult.data||[]).map(row=>({id:String(row.id),code:String(row.codigo),name:String(row.nombre),order:Number(row.orden),description:String(row.descripcion||''),minAge:numberOrNull(row.edad_minima_referencia),maxAge:numberOrNull(row.edad_maxima_referencia),objectives:Array.isArray(row.objetivos)?row.objetivos.map(String):[]})),
    measurements,growthObservation:calculateGrowthObservation(measurements),
    checkins:(checkinsResult.data||[]).map(row=>({id:String(row.id),date:String(row.fecha),confidence:Number(row.confianza),motivation:Number(row.motivacion),enjoyment:Number(row.disfrute),stress:Number(row.estres),readiness:Number(row.disposicion),reportedFear:Boolean(row.miedo_reportado),gymnastVoice:stringOrNull(row.voz_gimnasta)})),
  }
}

function numberOrNull(value:unknown){const number=Number(value);return value===null||value===undefined||!Number.isFinite(number)?null:number}
function stringOrNull(value:unknown){return typeof value==='string'&&value.length?value:null}

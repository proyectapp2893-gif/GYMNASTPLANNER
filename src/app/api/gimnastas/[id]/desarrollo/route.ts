import {NextRequest,NextResponse} from 'next/server'
import {z} from 'zod'
import {athleteDevelopmentCommandSchema} from '../../../../../lib/athlete-development/schema'
import {getAuthenticatedClub} from '../../../../../lib/supabase-server'

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params
  const athleteId=z.string().uuid().safeParse(id)
  const input=athleteDevelopmentCommandSchema.safeParse(await request.json().catch(()=>({})))
  if(!athleteId.success||!input.success)return NextResponse.json({error:'Datos de desarrollo inválidos',details:input.success?undefined:input.error.flatten()},{status:400})
  const {supabase,clubId,user,error:authError}=await getAuthenticatedClub()
  if(authError||!clubId||!user)return NextResponse.json({error:authError||'No autenticado'},{status:401})
  const {data:athlete}=await supabase.from('atletas').select('id').eq('id',athleteId.data).eq('club_id',clubId).is('deleted_at',null).maybeSingle()
  if(!athlete)return NextResponse.json({error:'Gimnasta no autorizada para esta organización'},{status:403})

  if(input.data.kind==='stage'){
    const {data:stage}=await supabase.from('etapas_desarrollo_deportivo').select('id').eq('id',input.data.stageId).eq('activa',true).maybeSingle()
    if(!stage)return NextResponse.json({error:'La etapa no está disponible para este club'},{status:400})
    const {data,error}=await supabase.from('atletas').update({etapa_desarrollo_id:stage.id,etapa_desarrollo_revisada_at:new Date().toISOString(),etapa_desarrollo_revisada_por:user.id,updated_by:user.id}).eq('id',athleteId.data).eq('club_id',clubId).select('id').maybeSingle()
    if(error)return NextResponse.json({error:error.message},{status:400})
    if(!data)return NextResponse.json({error:'No autorizado'},{status:403})
  }else if(input.data.kind==='measurement'){
    const {error}=await supabase.from('mediciones_desarrollo_atleta').upsert({club_id:clubId,atleta_id:athleteId.data,fecha:input.data.date,estatura_pie_cm:input.data.standingHeightCm,estatura_sentada_cm:input.data.sittingHeightCm,envergadura_cm:input.data.armSpanCm,peso_kg:input.data.weightKg,protocolo:input.data.protocol,consentimiento_confirmado:true,observaciones:input.data.notes,registrado_por:user.id},{onConflict:'atleta_id,fecha'})
    if(error)return NextResponse.json({error:error.message},{status:400})
  }else{
    const {error}=await supabase.from('registros_desarrollo_atleta').upsert({club_id:clubId,atleta_id:athleteId.data,fecha:input.data.date,confianza:input.data.confidence,motivacion:input.data.motivation,disfrute:input.data.enjoyment,estres:input.data.stress,disposicion:input.data.readiness,miedo_reportado:input.data.reportedFear,voz_gimnasta:input.data.gymnastVoice,registrado_por:user.id},{onConflict:'atleta_id,fecha'})
    if(error)return NextResponse.json({error:error.message},{status:400})
  }
  return NextResponse.json({ok:true})
}

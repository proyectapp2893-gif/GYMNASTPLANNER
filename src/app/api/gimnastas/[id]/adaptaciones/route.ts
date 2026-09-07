import {NextRequest,NextResponse} from 'next/server'
import {z} from 'zod'
import {adaptationPlanCommandSchema} from '../../../../../lib/adaptive-monitoring/schema'
import {getAuthenticatedClub} from '../../../../../lib/supabase-server'

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;const athleteId=z.string().uuid().safeParse(id);const input=adaptationPlanCommandSchema.safeParse(await request.json().catch(()=>({})))
  if(!athleteId.success||!input.success)return NextResponse.json({error:'Plan de adaptación inválido',details:input.success?undefined:input.error.flatten()},{status:400})
  const {supabase,clubId,user,error}=await getAuthenticatedClub();if(error||!clubId||!user)return NextResponse.json({error:error||'No autenticado'},{status:401})
  const {data:athlete}=await supabase.from('atletas').select('id').eq('id',athleteId.data).eq('club_id',clubId).is('deleted_at',null).maybeSingle();if(!athlete)return NextResponse.json({error:'Gimnasta no autorizada'},{status:403})
  if(input.data.kind==='create'){
    if(input.data.reviewDate<new Date().toISOString().slice(0,10))return NextResponse.json({error:'La fecha de revisión no puede estar en el pasado'},{status:400})
    const {data,error:insertError}=await supabase.from('planes_adaptacion_atleta').insert({club_id:clubId,atleta_id:athleteId.data,senales:input.data.signals,decision_entrenador:input.data.decision,fecha_revision:input.data.reviewDate,creado_por:user.id}).select('id').single();if(insertError)return NextResponse.json({error:insertError.message},{status:400});return NextResponse.json({plan:data},{status:201})
  }
  const {data,error:updateError}=await supabase.from('planes_adaptacion_atleta').update({estado:'cerrado',resultado:input.data.result,cerrado_por:user.id,cerrado_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',input.data.planId).eq('atleta_id',athleteId.data).eq('club_id',clubId).neq('estado','cerrado').select('id').maybeSingle();if(updateError)return NextResponse.json({error:updateError.message},{status:400});if(!data)return NextResponse.json({error:'Plan abierto no encontrado'},{status:404});return NextResponse.json({plan:data})
}

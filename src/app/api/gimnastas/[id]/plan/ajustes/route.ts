import { NextRequest,NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedClub } from '../../../../../../lib/supabase-server'

const jsonValue:z.ZodType<unknown>=z.lazy(()=>z.union([z.string(),z.number(),z.boolean(),z.null(),z.array(jsonValue),z.record(z.string(),jsonValue)]))
const overrideSchema=z.object({
  planId:z.string().uuid(),entidadTipo:z.string().trim().min(1).max(80),entidadOrigenId:z.string().uuid().nullable().optional(),
  rutaCampo:z.string().trim().min(1).max(240).nullable().optional(),
  origen:z.enum(['adaptado','individual','suspendido','reemplazado']),valor:jsonValue.optional(),
  reemplazoId:z.string().uuid().nullable().optional(),versionBase:z.number().int().positive(),motivo:z.string().trim().min(3).max(1000),
})

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id:athleteId}=await params
  const athlete=z.string().uuid().safeParse(athleteId)
  const input=overrideSchema.safeParse(await request.json().catch(()=>({})))
  if(!athlete.success||!input.success)return NextResponse.json({error:'Entrada inválida',details:input.success?undefined:input.error.flatten()},{status:400})
  const {supabase,clubId,error:authError}=await getAuthenticatedClub()
  if(authError||!clubId)return NextResponse.json({error:authError||'No autenticado'},{status:401})

  const {data:plan}=await supabase.from('planes_individuales').select('id,macrociclos(version_actual)').eq('id',input.data.planId).eq('atleta_id',athlete.data).eq('club_id',clubId).is('deleted_at',null).maybeSingle()
  if(!plan)return NextResponse.json({error:'Plan individual no autorizado'},{status:403})
  const macro=Array.isArray(plan.macrociclos)?plan.macrociclos[0]:plan.macrociclos
  const currentVersion=Number(macro?.version_actual||1)
  const requiresReview=input.data.versionBase!==currentVersion
  const user=(await supabase.auth.getUser()).data.user
  const {data,error}=await supabase.from('ajustes_plan_individual').insert({
    club_id:clubId,plan_individual_id:plan.id,entidad_tipo:input.data.entidadTipo,
    entidad_origen_id:input.data.entidadOrigenId||null,ruta_campo:input.data.rutaCampo||null,origen:input.data.origen,
    valor:input.data.valor??null,reemplazo_id:input.data.reemplazoId||null,version_base:input.data.versionBase,
    estado_sincronizacion:requiresReview?'requiere_confirmacion':'actualizado',motivo:input.data.motivo,
    created_by:user?.id,updated_by:user?.id,
  }).select('id,origen,estado_sincronizacion').single()
  if(error)return NextResponse.json({error:error.message},{status:400})
  return NextResponse.json({override:data,warning:requiresReview?'El plan general cambió; el ajuste se conservó y requiere confirmación.':null},{status:201})
}

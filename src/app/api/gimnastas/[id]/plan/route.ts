import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedClub } from '../../../../../lib/supabase-server'

const createPlanSchema=z.object({
  macrocicloId:z.string().uuid(),
  objetivoPrincipal:z.string().trim().max(1000).nullable().optional(),
  fechaInicio:z.string().date(),
  fechaFin:z.string().date(),
}).refine(value=>value.fechaFin>=value.fechaInicio,{message:'La fecha final debe ser posterior a la inicial',path:['fechaFin']})

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id:athleteId}=await params
  const athleteIdResult=z.string().uuid().safeParse(athleteId)
  const input=createPlanSchema.safeParse(await request.json().catch(()=>({})))
  if(!athleteIdResult.success||!input.success)return NextResponse.json({error:'Entrada inválida',details:input.success?undefined:input.error.flatten()},{status:400})

  const {supabase,clubId,error:authError}=await getAuthenticatedClub()
  if(authError||!clubId)return NextResponse.json({error:authError||'No autenticado'},{status:401})

  const [{data:athlete},{data:macrocycle}]=await Promise.all([
    supabase.from('atletas').select('id').eq('id',athleteId).eq('club_id',clubId).is('deleted_at',null).maybeSingle(),
    supabase.from('macrociclos').select('id,version_actual').eq('id',input.data.macrocicloId).eq('club_id',clubId).is('deleted_at',null).maybeSingle(),
  ])
  if(!athlete||!macrocycle)return NextResponse.json({error:'Gimnasta o macrociclo no autorizado'},{status:403})

  const {data:baseVersion}=await supabase.from('versiones_plan_general').select('id').eq('macrociclo_id',macrocycle.id).eq('numero_version',macrocycle.version_actual).maybeSingle()
  const {data,error}=await supabase.from('planes_individuales').upsert({
    club_id:clubId,atleta_id:athlete.id,macrociclo_id:macrocycle.id,version_base_id:baseVersion?.id||null,
    objetivo_principal:input.data.objetivoPrincipal||null,fecha_inicio:input.data.fechaInicio,fecha_fin:input.data.fechaFin,
    estado:'activo',created_by:(await supabase.auth.getUser()).data.user?.id,
  },{onConflict:'atleta_id,macrociclo_id'}).select('id,estado').single()
  if(error)return NextResponse.json({error:error.message},{status:400})
  return NextResponse.json({plan:data},{status:201})
}

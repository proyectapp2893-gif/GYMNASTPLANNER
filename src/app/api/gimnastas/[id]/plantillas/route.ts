import { NextRequest,NextResponse } from 'next/server'
import { z } from 'zod'
import { saveIndividualSessionSchema } from '../../../../../lib/individual-sessions/schema'
import { getAuthenticatedClub } from '../../../../../lib/supabase-server'

const templateSchema=z.object({name:z.string().trim().min(3).max(120),description:z.string().trim().max(500).nullable().optional(),session:saveIndividualSessionSchema})

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;const gymnast=z.string().uuid().safeParse(id);const input=templateSchema.safeParse(await request.json().catch(()=>({})))
  if(!gymnast.success||!input.success)return NextResponse.json({error:'Plantilla inválida',details:input.success?undefined:input.error.flatten()},{status:400})
  const {supabase,clubId,error:authError}=await getAuthenticatedClub();if(authError||!clubId)return NextResponse.json({error:authError||'No autenticado'},{status:401})
  const {data:athlete}=await supabase.from('atletas').select('id').eq('id',gymnast.data).eq('club_id',clubId).is('deleted_at',null).maybeSingle();if(!athlete)return NextResponse.json({error:'Gimnasta no autorizada'},{status:403})
  const user=(await supabase.auth.getUser()).data.user;if(!user)return NextResponse.json({error:'No autenticado'},{status:401})
  const {data,error}=await supabase.from('plantillas_sesion').upsert({club_id:clubId,atleta_id:athlete.id,nombre:input.data.name,descripcion:input.data.description||null,snapshot:input.data.session,created_by:user.id,updated_by:user.id},{onConflict:'club_id,atleta_id,nombre'}).select('id,nombre').single()
  if(error)return NextResponse.json({error:error.message},{status:400});return NextResponse.json({template:data},{status:201})
}

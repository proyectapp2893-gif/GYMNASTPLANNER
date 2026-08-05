import { NextRequest,NextResponse } from 'next/server'
import { z } from 'zod'
import { updateGymnastProfileSchema } from '../../../../lib/gymnasts/profile-schema'
import { getAuthenticatedClub } from '../../../../lib/supabase-server'

export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params
  const gymnastId=z.string().uuid().safeParse(id)
  const input=updateGymnastProfileSchema.safeParse(await request.json().catch(()=>({})))
  if(!gymnastId.success||!input.success)return NextResponse.json({error:'Datos de perfil inválidos',details:input.success?undefined:input.error.flatten()},{status:400})

  const {supabase,clubId,error:authError}=await getAuthenticatedClub()
  if(authError||!clubId)return NextResponse.json({error:authError||'No autenticado'},{status:401})
  const user=(await supabase.auth.getUser()).data.user
  if(!user)return NextResponse.json({error:'No autenticado'},{status:401})

  const {data,error}=await supabase.from('atletas').update({
    nombre:input.data.nombre,fecha_nacimiento:input.data.fechaNacimiento,fecha_ingreso:input.data.fechaIngreso,
    lateralidad:input.data.lateralidad,categoria_competitiva:input.data.categoriaCompetitiva,
    disponibilidad_semanal:{dias_entrenamiento:input.data.diasEntrenamiento},
    duracion_sesion_habitual_min:input.data.duracionSesionHabitualMin,
    objetivo_temporada:input.data.objetivoTemporada,observaciones:input.data.observaciones,updated_by:user.id,
  }).eq('id',gymnastId.data).eq('club_id',clubId).is('deleted_at',null).select('id,nombre').maybeSingle()

  if(error)return NextResponse.json({error:error.message},{status:400})
  if(!data)return NextResponse.json({error:'Gimnasta no autorizada para esta organización'},{status:403})
  return NextResponse.json({gymnast:data})
}

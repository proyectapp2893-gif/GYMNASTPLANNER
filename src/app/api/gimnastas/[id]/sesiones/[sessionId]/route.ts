import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedClub } from '../../../../../../lib/supabase-server'

export async function GET(_:Request,{params}:{params:Promise<{id:string;sessionId:string}>}){
  const values=await params;const ids=z.object({id:z.string().uuid(),sessionId:z.string().uuid()}).safeParse(values)
  if(!ids.success)return NextResponse.json({error:'Identificadores inválidos'},{status:400})
  const {supabase,clubId,error:authError}=await getAuthenticatedClub();if(authError||!clubId)return NextResponse.json({error:authError||'No autenticado'},{status:401})
  const {data,error}=await supabase.from('sesiones').select('id,fecha_calendario,hora_inicio,duracion_disponible_min,duracion_prevista_min,objetivo,prioridad,intensidad_planificada,volumen_planificado,observaciones,estado,sesion_general_id,bloques_sesion(id,orden,titulo,objetivo,contenido,duracion_prevista_min,origen,catalogo_items(codigo))').eq('id',ids.data.sessionId).eq('atleta_id',ids.data.id).eq('club_id',clubId).is('deleted_at',null).maybeSingle()
  if(error)return NextResponse.json({error:error.message},{status:400});if(!data)return NextResponse.json({error:'Sesión no encontrada'},{status:404})
  return NextResponse.json({session:data})
}

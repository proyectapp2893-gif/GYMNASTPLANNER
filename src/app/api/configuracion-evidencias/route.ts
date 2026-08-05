import {NextRequest,NextResponse} from 'next/server'
import {z} from 'zod'
import {allowedEvidenceMimeTypes} from '../../../lib/evidence/schema'
import {getAuthenticatedClub} from '../../../lib/supabase-server'

const schema=z.object({maximumMb:z.number().int().min(1).max(500)})
export async function PUT(request:NextRequest){const input=schema.safeParse(await request.json().catch(()=>({})));if(!input.success)return NextResponse.json({error:'Límite inválido'},{status:400});const context=await getAuthenticatedClub();if(context.error||!context.clubId||!context.user)return NextResponse.json({error:'No autenticado'},{status:401});const {data:profile}=await context.supabase.from('perfiles').select('rol').eq('id',context.user.id).eq('club_id',context.clubId).maybeSingle();if(!['administrador','administrador_organizacion'].includes(String(profile?.rol).toLowerCase()))return NextResponse.json({error:'Solo administración puede modificar límites'},{status:403});const {error}=await context.supabase.from('configuracion_evidencias').upsert({club_id:context.clubId,tamano_maximo_mb:input.data.maximumMb,tipos_mime_permitidos:[...allowedEvidenceMimeTypes],updated_by:context.user.id},{onConflict:'club_id'});if(error)return NextResponse.json({error:error.message},{status:400});return NextResponse.json({ok:true})}

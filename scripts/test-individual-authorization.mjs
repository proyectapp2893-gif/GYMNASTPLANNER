#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import {randomUUID} from 'crypto'
import {createClient} from '@supabase/supabase-js'

loadEnv('.env.local')
const url=process.env.NEXT_PUBLIC_SUPABASE_URL
const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY
if(!url||!anon||!serviceKey)throw new Error('Faltan credenciales Supabase para la prueba de autorización')

const service=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
const marker=randomUUID().slice(0,8)
const password=`Auth-${randomUUID()}!aA1`
const userIds=[]
const clubIds=[]
let checks=0

try{
  const clubA=await row(service.from('clubs').insert({nombre:`RLS Test A ${marker}`,estado:'aprobado'}).select('id').single())
  const clubB=await row(service.from('clubs').insert({nombre:`RLS Test B ${marker}`,estado:'aprobado'}).select('id').single())
  clubIds.push(clubA.id,clubB.id)
  const adminA=await createUser('admin-a','administrador',clubA.id)
  const assistant=await createUser('assistant','entrenador_asistente',clubA.id)
  const family=await createUser('family','familia',clubA.id)
  const adminB=await createUser('admin-b','administrador',clubB.id)
  const groupA=await row(service.from('grupos').insert({club_id:clubA.id,nombre:`Grupo A ${marker}`,nivel:'Nivel 3'}).select('id').single())
  const groupB=await row(service.from('grupos').insert({club_id:clubB.id,nombre:`Grupo B ${marker}`,nivel:'Nivel 4'}).select('id').single())
  const athleteA=await row(service.from('atletas').insert({club_id:clubA.id,grupo_id:groupA.id,nombre:'Gimnasta asignada',fecha_nacimiento:'2014-01-01'}).select('id').single())
  const athleteUnassigned=await row(service.from('atletas').insert({club_id:clubA.id,grupo_id:groupA.id,nombre:'Gimnasta no asignada',fecha_nacimiento:'2014-02-01'}).select('id').single())
  const athleteB=await row(service.from('atletas').insert({club_id:clubB.id,grupo_id:groupB.id,nombre:'Gimnasta otro tenant',fecha_nacimiento:'2014-03-01'}).select('id').single())
  await row(service.from('atleta_entrenadores').insert({club_id:clubA.id,atleta_id:athleteA.id,entrenador_id:assistant.id,es_principal:false,created_by:adminA.id}).select('id').single())

  const adminClient=await clientFor(adminA.email)
  const assistantClient=await clientFor(assistant.email)
  const familyClient=await clientFor(family.email)
  const otherAdminClient=await clientFor(adminB.email)
  await expectIds(adminClient,[athleteA.id,athleteUnassigned.id],[athleteB.id],'administrador limitado a su organización')
  await expectIds(assistantClient,[athleteA.id],[athleteUnassigned.id,athleteB.id],'asistente limitado a asignación')
  await expectIds(familyClient,[],[athleteA.id,athleteUnassigned.id,athleteB.id],'familia sin acceso interno')
  await expectIds(otherAdminClient,[athleteB.id],[athleteA.id,athleteUnassigned.id],'aislamiento entre organizaciones')

  const allowed=await assistantClient.from('retroalimentaciones').insert({club_id:clubA.id,atleta_id:athleteA.id,comentario_entrenador:'Prueba RLS',proximo_foco:'Alineación'})
  assert(!allowed.error,'El asistente asignado debe registrar ejecución/retroalimentación')
  checks++
  const denied=await assistantClient.from('retroalimentaciones').insert({club_id:clubA.id,atleta_id:athleteUnassigned.id,comentario_entrenador:'No permitido',proximo_foco:'No permitido'})
  assert(Boolean(denied.error),'El asistente no asignado no debe modificar a otra gimnasta')
  checks++
  const familyEvidence=await familyClient.from('evidencias_multimedia').select('id')
  assert(!familyEvidence.error&&familyEvidence.data.length===0,'Familia no debe enumerar evidencias internas')
  checks++

  const adminThreshold=await adminClient.from('configuracion_carga').upsert({club_id:clubA.id,aumento_semanal_aviso_pct:15,rpe_alto:7.5,fatiga_alta:4})
  assert(!adminThreshold.error,'Administración debe configurar umbrales preventivos')
  checks++
  const assistantThreshold=await assistantClient.from('configuracion_carga').update({rpe_alto:9}).eq('club_id',clubA.id).select('club_id')
  assert(Boolean(assistantThreshold.error)||assistantThreshold.data.length===0,'Entrenador asistente no debe modificar umbrales de organización')
  checks++
  const adminEvidenceSettings=await adminClient.from('configuracion_evidencias').upsert({club_id:clubA.id,tamano_maximo_mb:75})
  assert(!adminEvidenceSettings.error,'Administración debe configurar límites de evidencia')
  checks++
  const assistantEvidenceSettings=await assistantClient.from('configuracion_evidencias').update({tamano_maximo_mb:500}).eq('club_id',clubA.id).select('club_id')
  assert(Boolean(assistantEvidenceSettings.error)||assistantEvidenceSettings.data.length===0,'Entrenador asistente no debe modificar límites de evidencia')
  checks++

  const suggestion=await row(service.from('sugerencias_ia').insert({club_id:clubA.id,atleta_id:athleteA.id,tipo:'prioridades_semana',propuesta_original:{prioridades:['alineación']},fundamento:'Prueba controlada',estado:'pendiente_aprobacion',generado_por:assistant.id}).select('id').single())
  const assistantApproval=await assistantClient.from('sugerencias_ia').update({estado:'aprobada',aprobado_por:assistant.id,aprobado_at:new Date().toISOString(),decision_motivo:'No debe permitirse'}).eq('id',suggestion.id).select('id')
  assert(Boolean(assistantApproval.error)||assistantApproval.data.length===0,'Entrenador asistente no debe aprobar propuestas de IA')
  checks++
  const adminApproval=await adminClient.from('sugerencias_ia').update({estado:'aprobada',aprobado_por:adminA.id,aprobado_at:new Date().toISOString(),decision_motivo:'Revisión técnica satisfactoria'}).eq('id',suggestion.id).select('id')
  assert(!adminApproval.error&&adminApproval.data.length===1,'Administración debe aprobar IA con motivo y trazabilidad')
  checks++
  console.log(`Autorización individual verificada: ${checks} comprobaciones aprobadas.`)
}finally{
  for(const userId of userIds)await service.auth.admin.deleteUser(userId)
  for(const clubId of clubIds)await service.from('clubs').delete().eq('id',clubId)
}

async function createUser(prefix,role,clubId){const email=`${prefix}-${marker}@rls.test.gymnastplanner.local`;const {data,error}=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{nombre:prefix}});if(error||!data.user)throw new Error(error?.message||'No se creó usuario de prueba');userIds.push(data.user.id);await row(service.from('perfiles').insert({id:data.user.id,email,nombre:prefix,rol:role,club_id:clubId}).select('id').single());return{id:data.user.id,email}}
async function clientFor(email){const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;return client}
async function expectIds(client,visible,hidden,label){const {data,error}=await client.from('atletas').select('id');assert(!error,label);const ids=new Set(data.map(item=>item.id));for(const id of visible)assert(ids.has(id),`${label}: falta registro visible`);for(const id of hidden)assert(!ids.has(id),`${label}: filtración detectada`);checks++}
async function row(query){const {data,error}=await query;if(error)throw error;return data}
function assert(value,message){if(!value)throw new Error(`Fallo de autorización: ${message}`)}
function loadEnv(file){const target=path.join(process.cwd(),file);if(!fs.existsSync(target))return;for(const line of fs.readFileSync(target,'utf8').split(/\r?\n/)){const value=line.trim();if(!value||value.startsWith('#')||!value.includes('='))continue;const index=value.indexOf('=');const key=value.slice(0,index).trim();const content=value.slice(index+1).trim().replace(/^['"]|['"]$/g,'');if(!process.env[key])process.env[key]=content}}

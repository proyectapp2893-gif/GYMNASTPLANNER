import fs from 'fs'
import path from 'path'
import {randomUUID} from 'crypto'
import {createClient} from '@supabase/supabase-js'
import {expect,test} from '@playwright/test'

loadEnv('.env.local')
const url=process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY
if(!url||!serviceKey)throw new Error('Faltan credenciales para la prueba E2E')
const service=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
const marker=randomUUID().slice(0,8)
const email=`responsive-${marker}@e2e.gymnastplanner.local`
const password=`E2E-${randomUUID()}!aA1`
let userId=''
let clubId=''
let gymnastId=''
let groupId=''
let generalSessionId=''

test.beforeAll(async()=>{
  clubId=(await row(service.from('clubs').insert({nombre:`Club E2E ${marker}`,estado:'aprobado'}).select('id').single())).id
  const auth=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{nombre:'Entrenador E2E'}})
  if(auth.error||!auth.data.user)throw auth.error||new Error('No se creó usuario E2E')
  userId=auth.data.user.id
  await row(service.from('perfiles').insert({id:userId,email,nombre:'Entrenador E2E',rol:'administrador',club_id:clubId}).select('id').single())
  const group=await row(service.from('grupos').insert({club_id:clubId,nombre:'Grupo Responsive',nivel:'Nivel 4'}).select('id').single())
  groupId=group.id
  await row(service.from('configuracion_grupos').insert({grupo_id:groupId,fecha_inicio:'2026-01-05',fecha_competencia:'2026-03-28',semanas_totales:12,semanas_preparatorio:8,semanas_competitivo:4,horario_semanal:[{dia:'Lunes',enfoque:'Técnica'}]}).select('id').single())
  const inheritedName=`Movilidad heredada E2E ${marker}`
  const inheritedExercise=await row(service.from('ejercicios').insert({club_id:clubId,nombre:inheritedName,categoria:'Calentamiento',aparato:'General / Ninguno'}).select('id').single())
  generalSessionId=(await row(service.from('sesiones').insert({club_id:clubId,grupo_id:groupId,nivel:'Nivel 4',objetivo:'Sesión general heredable',fecha_calendario:'2026-08-05',ejercicios:{calentamiento_general:[{id:inheritedExercise.id,contenido:inheritedName,aparato:'General / Ninguno'}]}}).select('id').single())).id
  gymnastId=(await row(service.from('atletas').insert({club_id:clubId,grupo_id:group.id,nombre:'Gimnasta Responsive',fecha_nacimiento:'2014-08-04',objetivo_temporada:'Preparación segura'}).select('id').single())).id
  await row(service.from('retroalimentaciones').insert({club_id:clubId,atleta_id:gymnastId,comentario_entrenador:'Comentario interno E2E',proximo_foco:'Solo equipo técnico',visible_familia:false,created_by:userId}).select('id').single())
  await row(service.from('retroalimentaciones').insert({club_id:clubId,atleta_id:gymnastId,comentario_entrenador:'Comentario familiar E2E',proximo_foco:'Continuar con confianza',visible_familia:true,created_by:userId}).select('id').single())
})

test.afterAll(async()=>{if(clubId)await service.from('clubs').delete().eq('id',clubId);if(userId)await service.auth.admin.deleteUser(userId)})

test('módulo individual es navegable y no desborda el viewport',async({page})=>{
  test.setTimeout(60000)
  await page.goto('/')
  await page.getByPlaceholder('coach@club.com').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button',{name:'Entrar al Sistema'}).click()
  await page.waitForURL(/\/inicio/,{timeout:20000})
  await page.goto('/dashboard')
  await expect(page.getByRole('heading',{name:'Dashboard de Planificación'})).toBeVisible()
  const groupCard=page.getByRole('button',{name:/Grupo Responsive/})
  await expect(groupCard).toBeVisible()
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1)
  await page.goto(`/gimnastas/${gymnastId}/resumen`)
  await expect(page.getByText('Módulo individual')).toBeVisible()
  await expect(page.getByRole('heading',{name:'Gimnasta Responsive'})).toBeVisible()
  await expect(page.getByRole('link',{name:/Consultar plan general anual/})).toBeVisible()
  await expect(page.getByRole('heading',{name:'Plan anual de la gimnasta'})).toBeVisible()
  await page.getByTitle('Planificar Semana 2').click()
  await expect(page.getByText('2 de 12',{exact:true})).toBeVisible()
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1)
  await page.goto(`/gimnastas/${gymnastId}/sesiones/nueva`)
  await expect(page.getByText('Banco de ejercicios')).toBeVisible()
  await page.getByLabel('Sesión general de referencia').selectOption(generalSessionId)
  await expect(page.getByText('Sesión general heredada. Solo los bloques que edites quedarán marcados como adaptados.')).toBeVisible()
  await expect(page.getByText(/Movilidad heredada E2E/).last()).toBeVisible()
  await expect(page.getByText('heredado').first()).toBeVisible()
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1)
  await page.goto(`/gimnastas/${gymnastId}/informes/familia`)
  await expect(page.getByText('Informe autorizado para familia')).toBeVisible()
  await expect(page.getByText('Comentario familiar E2E')).toBeVisible()
  await expect(page.getByText('Comentario interno E2E')).toHaveCount(0)
})

async function horizontalOverflow(page:import('@playwright/test').Page){return page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)}
async function row(query:PromiseLike<{data:unknown;error:unknown}>){const {data,error}=await query;if(error)throw error;return data as Record<string,string>}
function loadEnv(file:string){const target=path.join(process.cwd(),file);if(!fs.existsSync(target))return;for(const line of fs.readFileSync(target,'utf8').split(/\r?\n/)){const value=line.trim();if(!value||value.startsWith('#')||!value.includes('='))continue;const index=value.indexOf('=');const key=value.slice(0,index).trim();const content=value.slice(index+1).trim().replace(/^['"]|['"]$/g,'');if(!process.env[key])process.env[key]=content}}

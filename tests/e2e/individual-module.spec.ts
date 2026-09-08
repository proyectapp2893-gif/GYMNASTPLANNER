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
let physicalTestId=''
let physicalBatteryId=''

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
  physicalTestId=(await row(service.from('catalogo_pruebas_fisicas').insert({club_id:clubId,codigo:`salto_${marker}`,nombre:`Salto E2E ${marker}`,unidad:'repeticiones',mayor_es_mejor:true,activo:true}).select('id').single())).id
  physicalBatteryId=(await row(service.from('baterias_pruebas_fisicas').insert({club_id:clubId,nombre:`Batería E2E ${marker}`,activa:true,created_by:userId}).select('id').single())).id
  await row(service.from('bateria_pruebas_items').insert({bateria_id:physicalBatteryId,prueba_id:physicalTestId,orden:0,requerida:true}).select('prueba_id').single())
  await row(service.from('retroalimentaciones').insert({club_id:clubId,atleta_id:gymnastId,comentario_entrenador:'Comentario interno E2E',proximo_foco:'Solo equipo técnico',visible_familia:false,created_by:userId}).select('id').single())
  await row(service.from('retroalimentaciones').insert({club_id:clubId,atleta_id:gymnastId,comentario_entrenador:'Comentario familiar E2E',proximo_foco:'Continuar con confianza',visible_familia:true,created_by:userId}).select('id').single())
})

test.afterAll(async()=>{
  // El perfil depende del usuario Auth; eliminarlo primero permite que el borrado
  // en cascada del club limpie todos los datos E2E sin dejar clubes fantasma.
  if(userId){const {error}=await service.auth.admin.deleteUser(userId);if(error)throw error}
  if(clubId){const {error}=await service.from('clubs').delete().eq('id',clubId);if(error)throw error}
})

test('módulo individual es navegable y no desborda el viewport',async({page})=>{
  test.setTimeout(120000)
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

  await page.goto('/evaluaciones')
  await page.getByLabel('Pruebas / batería').selectOption(physicalBatteryId)
  await page.getByLabel('Fecha').fill('2026-08-10')
  const collectiveValue=page.getByLabel(`Salto E2E ${marker} de Gimnasta Responsive`)
  await collectiveValue.fill('17')
  await page.reload()
  await expect(page.getByLabel(`Salto E2E ${marker} de Gimnasta Responsive`)).toHaveValue('17')
  await page.getByLabel(`Salto E2E ${marker} de Gimnasta Responsive`).focus()
  await page.keyboard.press('Tab')
  await expect(page.getByText('Resultado guardado automáticamente en la nube.')).toBeVisible({timeout:20000})
  await page.getByRole('button',{name:'Guardar resultados'}).click()
  await expect(page.getByText(/guardadas correctamente/)).toBeVisible()
  await expect(page.getByLabel(`Salto E2E ${marker} de Gimnasta Responsive`)).toHaveValue('17')
  await expect(page.getByRole('link',{name:'Crear prueba o batería'})).toBeVisible()
  await page.getByRole('button',{name:'Historial colectivo'}).click()
  const collectiveHistory=page.getByRole('dialog',{name:'Fechas de pruebas realizadas'})
  await expect(collectiveHistory).toBeVisible()
  await collectiveHistory.getByRole('button',{name:/Ver resultados en la planilla/}).first().click()
  await expect(collectiveHistory).not.toBeVisible()
  await expect(page.getByLabel(`Salto E2E ${marker} de Gimnasta Responsive`)).toHaveValue('17')

  await page.getByRole('button',{name:/Registro individual e historial/}).click()
  await page.getByLabel('Pruebas / batería').selectOption(physicalBatteryId)
  await page.getByLabel('Gimnasta').selectOption(gymnastId)
  await page.getByLabel('Fecha').fill('2026-08-11')
  await page.getByLabel(`Salto E2E ${marker}`).fill('19')
  await page.getByRole('button',{name:'Guardar resultados'}).click()
  await expect(page.getByText('19 repeticiones').first()).toBeVisible()
  await expect(page.getByText('Anterior: 17').first()).toBeVisible()
  await expect(page.getByText('Mejora destacada').first()).toBeVisible()
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1)

  await page.goto('/configuracion/catalogos-individuales')
  const batterySection=page.locator('section').filter({has:page.getByRole('heading',{name:'Baterías de pruebas físicas'})})
  await batterySection.getByRole('button',{name:'Agregar nueva prueba'}).click()
  await batterySection.getByLabel('Nombre de la prueba').fill(`Potencia personalizada ${marker}`)
  await batterySection.getByLabel('Grupo').selectOption('piernas')
  await batterySection.getByLabel('Unidad').selectOption('centimetros')
  await batterySection.getByLabel('Criterio de evolución').selectOption('higher')
  await batterySection.getByLabel('Instrucciones').fill('Registrar el mejor de tres intentos.')
  await batterySection.getByRole('button',{name:'Crear prueba'}).click()
  await expect(page.getByText('Prueba creada. Ya puedes incluirla en una batería.')).toBeVisible()
  await expect(page.getByText(`Potencia personalizada ${marker}`,{exact:true})).toBeVisible()
  const batteryCard=batterySection.locator('article').filter({hasText:`Batería E2E ${marker}`})
  await batteryCard.getByRole('button',{name:'Eliminar'}).click()
  await page.getByRole('alertdialog').getByRole('button',{name:'Eliminar batería'}).click()
  await expect(page.getByText(/Batería eliminada.*evaluaciones anteriores conservaron sus resultados/)).toBeVisible({timeout:20000})
  await expect(batteryCard).toHaveCount(0)
  await batterySection.getByRole('button',{name:`Eliminar prueba Potencia personalizada ${marker}`}).click()
  await page.getByRole('alertdialog').getByRole('button',{name:'Eliminar prueba'}).click()
  await expect(page.getByText('Prueba eliminada correctamente.')).toBeVisible({timeout:20000})
})

async function horizontalOverflow(page:import('@playwright/test').Page){return page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)}
async function row(query:PromiseLike<{data:unknown;error:unknown}>){const {data,error}=await query;if(error)throw error;return data as Record<string,string>}
function loadEnv(file:string){const target=path.join(process.cwd(),file);if(!fs.existsSync(target))return;for(const line of fs.readFileSync(target,'utf8').split(/\r?\n/)){const value=line.trim();if(!value||value.startsWith('#')||!value.includes('='))continue;const index=value.indexOf('=');const key=value.slice(0,index).trim();const content=value.slice(index+1).trim().replace(/^['"]|['"]$/g,'');if(!process.env[key])process.env[key]=content}}

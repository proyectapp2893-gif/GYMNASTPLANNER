import { NextResponse } from 'next/server'
import { z } from 'zod'
import { extractJsonObject, generateTextWithRetry } from '../../../../lib/ai-helpers'
import { generateGeminiTextRest } from '../../../../lib/gemini-rest'
import { getAuthenticatedClub } from '../../../../lib/supabase-server'

const requestSchema = z.object({ groupId: z.string().uuid(), days: z.number().int().min(1).max(7) })
const daySchema = z.object({ dia: z.string(), enfoque: z.string(), aparatos: z.string(), lugar: z.string(), hora: z.string() })
const responseSchema = z.object({ horario: z.array(daySchema).min(1).max(7) })
const apiKey = process.env.GEMINI_API_KEY || ''
const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export async function POST(request: Request) {
  const input = requestSchema.safeParse(await request.json().catch(() => ({})))
  if (!input.success) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  const { supabase, clubId, error } = await getAuthenticatedClub()
  if (error || !clubId) return NextResponse.json({ error: error || 'No autenticado' }, { status: 401 })
  const [{ data: group }, { data: club }] = await Promise.all([
    supabase.from('grupos').select('id,nombre,nivel').eq('id', input.data.groupId).eq('club_id', clubId).maybeSingle(),
    supabase.from('clubs').select('inventario').eq('id', clubId).maybeSingle(),
  ])
  if (!group) return NextResponse.json({ error: 'Grupo no autorizado' }, { status: 403 })
  const fallback = buildFallback(input.data.days, String(group.nivel))
  if (!apiKey) return NextResponse.json({ horario: fallback, generatedWith: 'reglas-locales' })
  const prompt = `Actúa como planificador de gimnasia artística femenina. Propón un microciclo semanal para el grupo ${group.nombre}, nivel ${group.nivel}, con exactamente ${input.data.days} días de entrenamiento. Inventario disponible: ${JSON.stringify(club?.inventario || {})}. Distribuye de forma equilibrada los cuatro aparatos oficiales: Salto, Barras Asimétricas, Viga y Suelo. REGLAS: (1) "aparatos" solo puede contener uno o varios de esos cuatro nombres; el inventario sirve para adaptar el trabajo, pero nunca reemplaza el nombre del aparato. (2) "enfoque" debe indicar 2 a 4 técnicas o elementos concretos apropiados para ${group.nivel}, más el objetivo físico del día; no uses frases genéricas. (3) Incluye preparación física, flexibilidad, prevención y recuperación según la frecuencia. (4) Evita cargas máximas consecutivas y no hagas recomendaciones médicas. Usa solo días entre lunes y domingo, sin repetir. Devuelve exclusivamente JSON: {"horario":[{"dia":"Lunes","enfoque":"Salto: carrera, entrada al trampolín y recepción; Barras: balanceos y posición hueca; potencia de piernas","aparatos":"Salto, Barras Asimétricas","lugar":"Gimnasio Principal","hora":"4:00 PM - 7:00 PM"}]}`
  try {
    const text = await generateTextWithRetry(async () => (await generateGeminiTextRest(prompt, apiKey)).text)
    const parsed = responseSchema.safeParse(extractJsonObject(text))
    if (!parsed.success || parsed.data.horario.length !== input.data.days || new Set(parsed.data.horario.map(item => item.dia)).size !== input.data.days || parsed.data.horario.some(item => !WEEKDAYS.includes(item.dia) || !hasOfficialApparatus(item.aparatos))) throw new Error('Horario IA inválido')
    return NextResponse.json({ horario: sortSchedule(parsed.data.horario), generatedWith: 'gemini' })
  } catch (generationError) {
    console.error('Fallback de horario IA:', generationError)
    return NextResponse.json({ horario: fallback, generatedWith: 'reglas-locales' })
  }
}

function buildFallback(days: number, level: string) {
  const patterns: Record<number, string[]> = { 1: ['Sábado'], 2: ['Martes', 'Sábado'], 3: ['Lunes', 'Miércoles', 'Sábado'], 4: ['Lunes', 'Martes', 'Jueves', 'Sábado'], 5: ['Lunes', 'Martes', 'Miércoles', 'Viernes', 'Sábado'], 6: WEEKDAYS.slice(0, 6), 7: WEEKDAYS }
  const selected = patterns[days]
  const advanced = /(?:nivel\s*)?(?:[5-9]|10)|elite/i.test(level)
  const focuses = advanced ? [
    ['Salto: carrera, entrada y recepción; Barras: vuelos y conexiones; potencia de piernas', 'Salto, Barras Asimétricas'],
    ['Viga: series acrobáticas y giros; Suelo: diagonales y enlaces; flexibilidad activa', 'Viga, Suelo'],
    ['Barras: cambios de banda y salidas; Viga: entradas y salidas; fuerza específica', 'Barras Asimétricas, Viga'],
    ['Salto: fases completas; Suelo: aterrizajes y control de diagonales; potencia', 'Salto, Suelo'],
    ['Viga: rutina parcial; Barras: conexiones de dificultad; resistencia específica', 'Viga, Barras Asimétricas'],
    ['Rutinas completas con control de calidad, recepciones y recuperación', 'Salto, Barras Asimétricas, Viga, Suelo'],
    ['Suelo: danza, movilidad y recuperación activa', 'Suelo'],
  ] : [
    ['Salto: carrera, rebote y recepción; Barras: balanceos y posición hueca; potencia básica', 'Salto, Barras Asimétricas'],
    ['Viga: caminadas, saltos y equilibrio; Suelo: rodadas y posiciones; flexibilidad', 'Viga, Suelo'],
    ['Barras: apoyos y balanceos; Viga: entradas y salidas básicas; fuerza de agarre', 'Barras Asimétricas, Viga'],
    ['Salto: carrera y aterrizaje; Suelo: rueda y rondada; coordinación y potencia', 'Salto, Suelo'],
    ['Viga: secuencias básicas; Barras: encadenar apoyos y balanceos; resistencia', 'Viga, Barras Asimétricas'],
    ['Circuitos técnicos, posturas, recepciones y repaso de secuencias', 'Salto, Barras Asimétricas, Viga, Suelo'],
    ['Suelo: líneas corporales, danza, movilidad y recuperación activa', 'Suelo'],
  ]
  return selected.map((dia, index) => ({ dia, enfoque: focuses[index][0], aparatos: focuses[index][1], lugar: 'Gimnasio Principal', hora: dia === 'Sábado' ? '8:00 AM - 12:00 PM' : '4:00 PM - 7:00 PM' }))
}

function sortSchedule<T extends { dia: string }>(items: T[]) { return [...items].sort((a, b) => WEEKDAYS.indexOf(a.dia) - WEEKDAYS.indexOf(b.dia)) }
function hasOfficialApparatus(value: string) { return ['salto', 'barras', 'viga', 'suelo'].some(apparatus => value.toLowerCase().includes(apparatus)) }

import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'
import { buildFallbackGeneratedExercises, extractJsonArray, generateTextWithRetry, getGeminiModelCandidates, isGeminiModelUnavailableError, normalizeGeneratedExercises } from '../../../../lib/ai-helpers'
import { createSupabaseServerClient, createSupabaseServiceClient, getAuthenticatedClub } from '../../../../lib/supabase-server'

const apiKey = process.env.GEMINI_API_KEY || ''
const genAI = new GoogleGenerativeAI(apiKey)
const modelCandidates = getGeminiModelCandidates(process.env.GEMINI_MODEL)
const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'Gymnastplanner@gmail.com').trim().toLowerCase()

const generarEjerciciosSchema = z.object({
  tema: z.string().trim().min(3).max(120),
  cantidad: z.coerce.number().int().min(1).max(15).default(5),
  global: z.boolean().optional().default(false),
})

async function isSuperAdminRequest() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return Boolean(!error && user?.email?.trim().toLowerCase() === SUPER_ADMIN_EMAIL)
}

export async function POST(request: Request) {
  try {
    const parsed = generarEjerciciosSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Entrada inválida', details: parsed.error.flatten() }, { status: 400 })
    }

    const { tema, cantidad, global } = parsed.data
    const esSuperAdmin = await isSuperAdminRequest()
    const authClub = global && esSuperAdmin
      ? { supabase: createSupabaseServiceClient(), clubId: null as string | null, error: null }
      : await getAuthenticatedClub()

    if (authClub.error || (!global && !authClub.clubId)) {
      return NextResponse.json({ error: authClub.error || 'No autenticado' }, { status: 401 })
    }

    if (global && !esSuperAdmin) {
      return NextResponse.json({ error: 'No autorizado para crear ejercicios globales' }, { status: 403 })
    }

    const cant = cantidad;
    const enfoque = tema;

    // 🔥 EL NUEVO PROMPT DINÁMICO Y ESTRICTO
    const prompt = `
      Actúa como un experto mundial en Gimnasia Artística Femenina y Biomecánica.
      Genera exactamente ${cant} ejercicios enfocados EXCLUSIVAMENTE en este tema: "${enfoque}".

      Reglas Estrictas de Formato (Devuelve ÚNICAMENTE un arreglo JSON válido, sin marcas de markdown, sin texto adicional):
      [
        {
          "nombre": "Nombre del ejercicio",
          "categoria": "Elige SOLO UNA: Técnico, Prep. Física - General, Prep. Física - Tarjeta Roja, Flexibilidad, Calentamiento, Calma / Cierre, Rutina Completa, Secuencia / Conexión",
          "aparato": "Elige SOLO UNO: General, Barras Asimétricas, Viga de Equilibrio, Suelo, Salto, Trampolín",
          "dificultad": "Elige SOLO UNA: Básico, Intermedio, Avanzado, Élite",
          "descripcion_corta": "Descripción técnica breve, máximo 15 palabras",
          "rangos_repeticiones": "Ej: 10-20 reps o 30-60 seg",
          "etiquetas": "2 o 3 palabras clave separadas por comas. Ej: Kip, Core, Fuerza"
        }
      ]
    `

    let ejerciciosParaGuardar = buildFallbackGeneratedExercises(enfoque, cant, global ? null : authClub.clubId)
    let generatedWith = 'fallback'

    if (apiKey) {
      try {
        // Limpieza extrema del JSON por si Gemini envía texto extra
        const responseText = await generateTextWithRetry(async () => {
          let lastError: unknown

          for (const modelName of modelCandidates) {
            try {
              const model = genAI.getGenerativeModel({ model: modelName })
              const result = await model.generateContent(prompt)
              generatedWith = modelName
              return result.response.text()
            } catch (error) {
              lastError = error
              if (!isGeminiModelUnavailableError(error)) throw error
            }
          }

          throw lastError
        })
        const ejerciciosGenerados = extractJsonArray(responseText)
        const ejerciciosIA = normalizeGeneratedExercises(ejerciciosGenerados, global ? null : authClub.clubId)

        if (ejerciciosIA.length > 0) {
          ejerciciosParaGuardar = ejerciciosIA
        }
      } catch (error) {
        console.error('Fallback ejercicios IA:', error)
      }
    }

    // Inserción directa en la base de datos
    const { error } = await authClub.supabase.from('ejercicios').insert(ejerciciosParaGuardar)
    
    if (error) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: ejerciciosParaGuardar.length, generatedWith })

  } catch (error) {
    console.error('Error generando ejercicios:', error)
    const message = error instanceof Error ? error.message : 'Fallo al generar'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

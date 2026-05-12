import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'
import { extractJsonArray, generateTextWithRetry, normalizeGeneratedExercises } from '../../../../lib/ai-helpers'
import { getAuthenticatedClub } from '../../../../lib/supabase-server'

const apiKey = process.env.GEMINI_API_KEY || ''
const genAI = new GoogleGenerativeAI(apiKey)
const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash'

const generarEjerciciosSchema = z.object({
  tema: z.string().trim().min(3).max(120),
  cantidad: z.coerce.number().int().min(1).max(15).default(5),
})

export async function POST(request: Request) {
  try {
    const { supabase, clubId, error: authError } = await getAuthenticatedClub()
    if (authError || !clubId) {
      return NextResponse.json({ error: authError || 'No autenticado' }, { status: 401 })
    }

    const parsed = generarEjerciciosSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Entrada inválida', details: parsed.error.flatten() }, { status: 400 })
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY no configurada' }, { status: 503 })
    }

    const { tema, cantidad } = parsed.data

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

    const model = genAI.getGenerativeModel({ model: modelName })
    
    // Limpieza extrema del JSON por si Gemini envía texto extra
    const responseText = await generateTextWithRetry(async () => {
      const result = await model.generateContent(prompt)
      return result.response.text()
    })
    const ejerciciosGenerados = extractJsonArray(responseText)

    // Agregamos la capa de seguridad Multiclub
    const ejerciciosParaGuardar = normalizeGeneratedExercises(ejerciciosGenerados, clubId)

    if (ejerciciosParaGuardar.length === 0) {
      return NextResponse.json({ error: 'La IA no devolvió ejercicios válidos' }, { status: 502 })
    }

    // Inserción directa en la base de datos
    const { error } = await supabase.from('ejercicios').insert(ejerciciosParaGuardar)
    
    if (error) throw error

    return NextResponse.json({ success: true, count: ejerciciosParaGuardar.length })

  } catch (error) {
    console.error('Error generando ejercicios:', error)
    return NextResponse.json({ error: 'Fallo al generar' }, { status: 500 })
  }
}

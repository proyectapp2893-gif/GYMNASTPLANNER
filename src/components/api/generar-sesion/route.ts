import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '../../../lib/supabase'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { isSingle, ejercicioUnico, nivel, objetivo, semana, enfoqueDia } = body

    // 🔥 Usamos gemini-1.5-flash: Más rápido, preciso y perfecto para JSON
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    // ============================================================================
    // CASO 1: ARRASTRAR Y SOLTAR (Calcula dosis de 1 solo ejercicio en tiempo real)
    // ============================================================================
    if (isSingle) {
      const descOriginal = ejercicioUnico.descripcion || ejercicioUnico.descripcion_corta || ''
      const tieneDesc = descOriginal.length > 5

      const prompt = `
        Eres un Head Coach Élite de Gimnasia. Vas a dosificar este ejercicio:
        Nombre: ${ejercicioUnico.contenido || ejercicioUnico.nombre}
        Descripción original del entrenador: "${descOriginal}"
        
        Contexto del Atleta:
        Nivel: ${nivel} | Fase: ${objetivo} | Semana: ${semana}
        
        REGLAS ESTRICTAS:
        1. Crea la carga exacta (Series x Repeticiones o Tiempo) para 3 subgrupos: avanzado, base y desarrollo.
        2. ${tieneDesc ? 'El ejercicio YA TIENE descripción técnica del entrenador. NO expliques cómo se hace, limitate estrictamente a devolver los números (Ej: "4x10").' : 'El ejercicio NO tiene descripción. En el campo "desarrollo", después de las series, agrega entre paréntesis un TIP TÉCNICO corto de 1 línea.'}

        Devuelve ÚNICAMENTE un JSON con esta estructura exacta:
        {
          "avanzado": "4 series x 10 reps",
          "base": "3 series x 8 reps",
          "desarrollo": "3 series x 5 reps ${tieneDesc ? '' : '(Tip: Mantener bloqueo)'}"
        }
      `
      const result = await model.generateContent(prompt)
      const cleanJson = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim()
      return NextResponse.json(JSON.parse(cleanJson))
    }

    // ============================================================================
    // CASO 2: BOTÓN MÁGICO "DISTRIBUIR CARGAS" (Arma la sesión completa)
    // ============================================================================
    const { data: ejercicios } = await supabase.from('ejercicios').select('id, nombre, categoria, aparato, dificultad, descripcion, descripcion_corta')

    const prompt = `
      Eres el Head Coach Élite de un equipo de gimnasia.
      Crea una sesión de entrenamiento usando EXCLUSIVAMENTE los ejercicios de este catálogo JSON:
      ${JSON.stringify(ejercicios)}

      Contexto de la Sesión:
      Nivel: ${nivel} | Fase: ${objetivo} | Semana: ${semana} | Enfoque Principal: ${enfoqueDia}

      REGLAS ESTRICTAS:
      1. Distribuye los IDs de los ejercicios seleccionados en las 5 fases de la clase.
      2. Para CADA ejercicio, genera un objeto "dosificacion" (Series x Reps) adaptado al nivel y la fase.
      3. NUNCA alteres, modifiques ni devuelvas la descripción del ejercicio. El frontend ya la tiene.

      Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta:
      {
        "calentamiento": [
          { "id": "id-del-ejercicio", "dosificacion": { "avanzado": "10 min", "base": "10 min", "desarrollo": "8 min" } }
        ],
        "prep-fisica": [],
        "tecnico": [],
        "flexibilidad": [],
        "cierre": []
      }
    `
    const result = await model.generateContent(prompt)
    const cleanJson = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim()
    return NextResponse.json(JSON.parse(cleanJson))

  } catch (error) {
    console.error('Error con IA:', error)
    return NextResponse.json({ error: 'Fallo al generar la sesión' }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '../../../lib/supabase'

const apiKey = process.env.GEMINI_API_KEY || ''
const genAI = new GoogleGenerativeAI(apiKey)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    // 🔥 NUEVO: Recibimos el nombreClub para que la IA sepa en qué academia está trabajando
    const { grupoId, nivel, objetivo, semana, dia, enfoqueDia, horario, isSingle, ejercicioUnico, nombreClub } = body

    const { data: ejercicios } = await supabase.from('ejercicios').select('id, nombre, categoria, aparato, dificultad')

    let contextoTestFisicos = "No hay evaluaciones físicas previas."
    // 🔥 NUEVO: Variable base para el inventario
    let contextoInventario = "El club tiene equipamiento completo estándar de gimnasia artística." 
    
    if (grupoId) {
      // --- Lógica original de Test Físicos intacta ---
      const { data: atletas } = await supabase.from('atletas').select('id').eq('grupo_id', grupoId)
      if (atletas && atletas.length > 0) {
        const atletaIds = atletas.map((a: any) => a.id)
        const { data: evaluaciones } = await supabase.from('evaluaciones_fisicas').select('resultados').in('atleta_id', atletaIds).order('created_at', { ascending: false }).limit(10)

        if (evaluaciones && evaluaciones.length > 0) {
          const resumenResultados = evaluaciones.map(e => e.resultados)
          contextoTestFisicos = `
            🚨 TEST FÍSICOS RECIENTES DEL GRUPO: 
            ${JSON.stringify(resumenResultados)}
            
            BAREMOS DEL NIVEL ${nivel}:
            - Niveles 1-2: Dominadas(1-3), Canoa(20s), Lagartijas(5).
            - Niveles 3-4: Dominadas(5-8), Canoa(45s), Lagartijas(15).
            - Niveles 5+: Dominadas(10+), Canoa(60s+), Lagartijas(20+).
          `
        }
      }

      // 🔥 NUEVO: Lógica de consulta del Inventario en Supabase
      const { data: config } = await supabase.from('configuracion_grupos').select('inventario').eq('grupo_id', grupoId).single()
      if (config && config.inventario && config.inventario.length > 0) {
        contextoInventario = `ATENCIÓN: El club tiene un INVENTARIO LIMITADO. Solo puedes utilizar el siguiente equipamiento para diseñar o adaptar los ejercicios: [${config.inventario.join(', ')}]. ESTÁ ESTRICTAMENTE PROHIBIDO sugerir ejercicios que requieran aparatos o materiales que no estén en esta lista.`
      }
    }

    const urlModelos = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    const respuestaModelos = await fetch(urlModelos)
    const datosModelos = await respuestaModelos.json()
    const modelosValidos = datosModelos.models || []
    const modeloIdeal = modelosValidos.find((m: any) => m.supportedGenerationMethods?.includes('generateContent') && (m.name.includes('flash') || m.name.includes('pro')))
    const nombreModelo = modeloIdeal ? modeloIdeal.name.replace('models/', '') : 'gemini-1.5-flash'
    const model = genAI.getGenerativeModel({ model: nombreModelo })

    // 🔥 MODO FRANCOTIRADOR
    if (isSingle && ejercicioUnico) {
      // 🔥 REEMPLAZADO: Ahora usa la variable ${nombreClub || 'la academia'} y añade el inventario
      const promptSingle = `
        Actúa como el Head Coach Principal de ${nombreClub || 'la academia deportiva'}.
        Acabo de agregar UN EJERCICIO a mi sesión. Calcula la dosificación ideal en 3 sub-grupos basándote en el contexto.

        CONTEXTO Y RESTRICCIONES:
        - Nivel: ${nivel} | Fase: ${objetivo} | Horario: ${horario}
        ${contextoInventario}
        ${contextoTestFisicos}

        EJERCICIO A CALCULAR:
        - Nombre: ${ejercicioUnico.contenido || ejercicioUnico.nombre}
        - Categoría: ${ejercicioUnico.categoria}

        INSTRUCCIONES FINALES:
        Devuelve ÚNICA Y EXCLUSIVAMENTE un JSON válido con esta estructura exacta:
        {
          "avanzado": "texto de carga",
          "base": "texto de carga",
          "desarrollo": "texto de carga"
        }
      `
      const result = await model.generateContent(promptSingle)
      const responseText = result.response.text()
      let cleanJson = responseText.substring(responseText.indexOf('{'), responseText.lastIndexOf('}') + 1) || responseText.replace(/```json/g, '').replace(/```/g, '').trim()
      return NextResponse.json(JSON.parse(cleanJson))
    }

    // 🌟 MODO NORMAL: CALCULA TODA LA SESIÓN DE GOLPE
    // 🔥 REEMPLAZADO: Ahora usa la variable ${nombreClub || 'la academia'} y añade el inventario
    const prompt = `
      Actúa como el Head Coach Principal de ${nombreClub || 'la academia deportiva'}.
      Diseña la sesión exacta para hoy, dividiendo SIEMPRE la carga física y técnica en 3 sub-grupos.

      CONTEXTO Y RESTRICCIONES:
      - Nivel: ${nivel} | Fase: ${objetivo} | Horario: ${horario} | Enfoque: ${enfoqueDia}
      ${contextoInventario}
      ${contextoTestFisicos}

      BASE DE DATOS DE EJERCICIOS A USAR: ${JSON.stringify(ejercicios)}

      Devuelve ÚNICA Y EXCLUSIVAMENTE un JSON válido con esta estructura:
      {
        "calentamiento": [{"id": "id", "dosificacion": {"avanzado": "texto", "base": "texto", "desarrollo": "texto"}}],
        "prep-fisica": [{"id": "id", "dosificacion": {"avanzado": "texto", "base": "texto", "desarrollo": "texto"}}],
        "tecnico": [{"id": "id", "dosificacion": {"avanzado": "texto", "base": "texto", "desarrollo": "texto"}}],
        "flexibilidad": [{"id": "id", "dosificacion": {"avanzado": "texto", "base": "texto", "desarrollo": "texto"}}],
        "cierre": []
      }
    `
    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    let cleanJson = responseText.substring(responseText.indexOf('{'), responseText.lastIndexOf('}') + 1) || responseText.replace(/```json/g, '').replace(/```/g, '').trim()
    return NextResponse.json(JSON.parse(cleanJson))

  } catch (error) {
    console.error('Error con IA:', error)
    return NextResponse.json({ error: 'Fallo al generar' }, { status: 500 })
  }
}
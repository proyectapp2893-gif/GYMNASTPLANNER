import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'
import {
  buildFallbackSession,
  extractJsonObject,
  generateTextWithRetry,
  limitCatalogForPrompt,
  normalizeSingleDose,
  sanitizeSessionResponse,
  type CatalogExercise,
} from '../../../lib/ai-helpers'
import { getAuthenticatedClub } from '../../../lib/supabase-server'
import { summarizePhysicalTestsForAI } from '../../../lib/physical-tests'
import { getCompetitionProximityForDate } from '../../../lib/sports-planning'

const apiKey = process.env.GEMINI_API_KEY || ''
const genAI = new GoogleGenerativeAI(apiKey)
const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash'

const aiRequestSchema = z.object({
  grupoId: z.string().min(1).optional().or(z.literal('')),
  nivel: z.string().min(1).max(80).default('Nivel General'),
  objetivo: z.string().min(1).max(160).default('Desarrollo General'),
  semana: z.string().max(80).optional(),
  dia: z.string().max(40).optional(),
  enfoqueDia: z.string().max(160).optional(),
  horario: z.string().max(80).optional(),
  isSingle: z.boolean().optional(),
  ejercicioUnico: z.unknown().optional(),
  nombreClub: z.string().max(120).optional(),
  competenciasSecundarias: z.array(z.object({ nombre: z.string().optional(), fecha: z.string().optional() })).default([]),
  diasEntrenamiento: z.coerce.number().int().min(1).max(7).default(6),
  fechaSesionActual: z.string().nullable().optional(),
})

export async function POST(request: Request) {
  try {
    const { supabase, clubId, error: authError } = await getAuthenticatedClub()
    if (authError || !clubId) {
      return NextResponse.json({ error: authError || 'No autenticado' }, { status: 401 })
    }

    const parsed = aiRequestSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Entrada inválida', details: parsed.error.flatten() }, { status: 400 })
    }

    const { grupoId, nivel, objetivo, semana, enfoqueDia, horario, isSingle, ejercicioUnico, nombreClub, competenciasSecundarias, diasEntrenamiento, fechaSesionActual } = parsed.data
    const proximidadCompetencia = getCompetitionProximityForDate(
      fechaSesionActual,
      competenciasSecundarias.map(comp => comp.fecha)
    )

    const { data: clubData } = await supabase
      .from('clubs')
      .select('acceso_biblioteca_elite')
      .eq('id', clubId)
      .single()

    let ejerciciosQuery = supabase
      .from('ejercicios')
      .select('id, nombre, categoria, aparato, dificultad, descripcion_corta')

    if (clubData?.acceso_biblioteca_elite) {
      ejerciciosQuery = ejerciciosQuery.or(`club_id.eq.${clubId},club_id.is.null`)
    } else {
      ejerciciosQuery = ejerciciosQuery.eq('club_id', clubId)
    }

    const { data: ejercicios } = await ejerciciosQuery
    const catalogoCompleto = (ejercicios || []) as CatalogExercise[]
    const catalogoPrompt = limitCatalogForPrompt(catalogoCompleto, enfoqueDia || objetivo, 80)

    let contextoTestFisicos = "No hay evaluaciones físicas previas."
    // 🔥 NUEVO: Variable base para el inventario
    let contextoInventario = "El club tiene equipamiento completo estándar de gimnasia artística." 
    
    if (grupoId) {
      const { data: grupoAutorizado } = await supabase
        .from('grupos')
        .select('id')
        .eq('id', grupoId)
        .eq('club_id', clubId)
        .single()

      if (!grupoAutorizado) {
        return NextResponse.json({ error: 'Grupo no autorizado para este club' }, { status: 403 })
      }

      // --- Lógica original de Test Físicos intacta ---
      const { data: atletas } = await supabase.from('atletas').select('id').eq('grupo_id', grupoId).eq('club_id', clubId)
      if (atletas && atletas.length > 0) {
        const atletaIds = atletas.map((a: { id: string }) => a.id)
        const { data: evaluaciones } = await supabase.from('evaluaciones_fisicas').select('resultados').eq('club_id', clubId).in('atleta_id', atletaIds).order('created_at', { ascending: false }).limit(10)

        if (evaluaciones && evaluaciones.length > 0) {
          const resumenResultados = summarizePhysicalTestsForAI(evaluaciones)
          contextoTestFisicos = `
            TEST FISICOS RECIENTES DEL GRUPO:
            ${JSON.stringify(resumenResultados)}
            
            BAREMOS DEL NIVEL ${nivel}:
            - Niveles 1-2: Dominadas(1-3), Canoa(20s), Lagartijas(5).
            - Niveles 3-4: Dominadas(5-8), Canoa(45s), Lagartijas(15).
            - Niveles 5+: Dominadas(10+), Canoa(60s+), Lagartijas(20+).
            REGLA: Si aparecen alertas o promedios menores a 45/100, reduce carga, aumenta progresion tecnica y evita trabajo al fallo.
          `
        }
      }

      // 🔥 NUEVO: Lógica de consulta del Inventario en Supabase
      const { data: config } = await supabase.from('configuracion_grupos').select('inventario').eq('grupo_id', grupoId).single()
      if (config && config.inventario && config.inventario.length > 0) {
        contextoInventario = `ATENCIÓN: El club tiene un INVENTARIO LIMITADO. Solo puedes utilizar el siguiente equipamiento para diseñar o adaptar los ejercicios: [${config.inventario.join(', ')}]. ESTÁ ESTRICTAMENTE PROHIBIDO sugerir ejercicios que requieran aparatos o materiales que no estén en esta lista.`
      }
    }

    if (!apiKey) {
      return NextResponse.json(buildFallbackSession(catalogoCompleto, objetivo))
    }

    const model = genAI.getGenerativeModel({ model: modelName })

    // 🔥 MODO FRANCOTIRADOR
    if (isSingle && ejercicioUnico) {
      const ejercicio = isRecord(ejercicioUnico) ? ejercicioUnico : {}
      const ejercicioId = typeof ejercicio.id === 'string' ? ejercicio.id : ''
      if (ejercicioId && !catalogoCompleto.some(item => item.id === ejercicioId)) {
        return NextResponse.json({ error: 'Ejercicio no autorizado para este club' }, { status: 403 })
      }

      // 🔥 REEMPLAZADO: Ahora usa la variable ${nombreClub || 'la academia'} y añade el inventario
      const promptSingle = `
        Actúa como el Head Coach Principal de ${nombreClub || 'la academia deportiva'}.
        Acabo de agregar UN EJERCICIO a mi sesión. Calcula la dosificación ideal en 3 sub-grupos basándote en el contexto.

        CONTEXTO Y RESTRICCIONES:
        - Nivel: ${nivel} | Fase: ${objetivo} | Horario: ${horario}
        - Frecuencia semanal: ${diasEntrenamiento} dias
        ${proximidadCompetencia.isNear ? `- Competencia cercana en ${proximidadCompetencia.days} dias: reduce carga pesada, evita fallo muscular y prioriza calidad tecnica.` : ''}
        ${contextoInventario}
        ${contextoTestFisicos}

        EJERCICIO A CALCULAR:
        - Nombre: ${String(ejercicio.contenido || ejercicio.nombre || '')}
        - Categoría: ${String(ejercicio.categoria || '')}

        INSTRUCCIONES FINALES:
        Devuelve ÚNICA Y EXCLUSIVAMENTE un JSON válido con esta estructura exacta:
        {
          "avanzado": "texto de carga",
          "base": "texto de carga",
          "desarrollo": "texto de carga"
        }
      `
      try {
        const responseText = await generateTextWithRetry(async () => {
          const result = await model.generateContent(promptSingle)
          return result.response.text()
        })
        return NextResponse.json(normalizeSingleDose(extractJsonObject(responseText)))
      } catch (error) {
        console.error('Fallback dosificacion IA:', error)
        return NextResponse.json(normalizeSingleDose(null))
      }
    }

    // 🌟 MODO NORMAL: CALCULA TODA LA SESIÓN DE GOLPE
    // 🔥 REEMPLAZADO: Ahora usa la variable ${nombreClub || 'la academia'} y añade el inventario
    const prompt = `
      Actúa como el Head Coach Principal de ${nombreClub || 'la academia deportiva'}.
      Diseña la sesión exacta para hoy, dividiendo SIEMPRE la carga física y técnica en 3 sub-grupos.

      CONTEXTO Y RESTRICCIONES:
      - Nivel: ${nivel} | Fase: ${objetivo} | Semana: ${semana || 'Sin especificar'} | Horario: ${horario} | Enfoque: ${enfoqueDia}
      - Frecuencia semanal: ${diasEntrenamiento} dias
      ${proximidadCompetencia.isNear ? `- Competencia cercana en ${proximidadCompetencia.days} dias: estamos en descarga/taper. Reduce preparacion fisica pesada y prioriza rutinas, tecnica limpia, recuperacion y confianza.` : ''}
      ${contextoInventario}
      ${contextoTestFisicos}

      BASE DE DATOS DE EJERCICIOS A USAR: ${JSON.stringify(catalogoPrompt)}

      REGLAS DE SEGURIDAD DEPORTIVA:
      - Usa únicamente IDs presentes en la base de datos anterior.
      - Si la fase es competitiva, precompetitiva o hay torneo cercano, evita HIIT, maximos, fatiga al fallo y volumen pesado.
      - No generes una sesión imposible para el horario indicado.
      - Prioriza técnica, rutinas y recuperación cuando el objetivo incluya competencia o pulimiento.

      Devuelve ÚNICA Y EXCLUSIVAMENTE un JSON válido con esta estructura:
      {
        "calentamiento": [{"id": "id", "dosificacion": {"avanzado": "texto", "base": "texto", "desarrollo": "texto"}}],
        "prep-fisica": [{"id": "id", "dosificacion": {"avanzado": "texto", "base": "texto", "desarrollo": "texto"}}],
        "tecnico": [{"id": "id", "dosificacion": {"avanzado": "texto", "base": "texto", "desarrollo": "texto"}}],
        "flexibilidad": [{"id": "id", "dosificacion": {"avanzado": "texto", "base": "texto", "desarrollo": "texto"}}],
        "cierre": []
      }
    `
    try {
      const responseText = await generateTextWithRetry(async () => {
        const result = await model.generateContent(prompt)
        return result.response.text()
      })
      const sanitized = sanitizeSessionResponse(extractJsonObject(responseText), catalogoCompleto)
      return NextResponse.json(sanitized)
    } catch (error) {
      console.error('Fallback sesion IA:', error)
      return NextResponse.json(buildFallbackSession(catalogoCompleto, objetivo))
    }

  } catch (error) {
    console.error('Error con IA:', error)
    return NextResponse.json({ error: 'Fallo al generar' }, { status: 500 })
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

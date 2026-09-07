import { NextResponse } from 'next/server'
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
import { generateGeminiTextRest } from '../../../lib/gemini-rest'
import { getAuthenticatedClub } from '../../../lib/supabase-server'
import { summarizePhysicalTestsForAI } from '../../../lib/physical-tests'
import { getCompetitionProximityForDate } from '../../../lib/sports-planning'
import { getApprovedSportsKnowledgeContext } from '../../../lib/sports-governance/context'

const apiKey = process.env.GEMINI_API_KEY || ''

async function generateGeminiText(prompt: string) {
  const result = await generateGeminiTextRest(prompt, apiKey)
  return result.text
}

const aiRequestSchema = z.object({
  grupoId: z.string().min(1).optional().or(z.literal('')),
  nivel: z.string().min(1).max(80).default('Nivel General'),
  objetivo: z.string().min(1).max(160).default('Desarrollo General'),
  semana: z.string().max(80).optional(),
  dia: z.string().max(40).optional(),
  enfoqueDia: z.string().max(160).optional(),
  aparatosDia: z.string().max(160).optional(),
  tipoSesion: z.enum(['dance_choreography', 'apparatus', 'physical_prevention', 'mixed']).optional(),
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

    const { grupoId, nivel, objetivo, semana, enfoqueDia, aparatosDia, tipoSesion, horario, isSingle, ejercicioUnico, nombreClub, competenciasSecundarias, diasEntrenamiento, fechaSesionActual } = parsed.data
    const conocimientoAprobado = await getApprovedSportsKnowledgeContext(['seguridad','carga','tecnica','recuperacion','bienestar','competencia'])
    const proximidadCompetencia = getCompetitionProximityForDate(
      fechaSesionActual,
      competenciasSecundarias.map(comp => comp.fecha)
    )

    const { data: clubData } = await supabase
      .from('clubs')
      .select('acceso_biblioteca_elite, inventario')
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
    let contextoInventario = buildInventoryContext(clubData?.inventario)
    
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
            
            Estos resultados son indicadores internos y tendencias, no baremos clínicos ni normas universales.
            Úsalos para comparar la evolución del grupo y señalar datos que requieren revisión del entrenador.
          `
        }
      }

      // 🔥 NUEVO: Lógica de consulta del Inventario en Supabase
      const { data: config } = await supabase.from('configuracion_grupos').select('inventario').eq('grupo_id', grupoId).maybeSingle()
      const inventarioCombinado = mergeInventory(clubData?.inventario, config?.inventario)
      contextoInventario = buildInventoryContext(inventarioCombinado)
    }

    if (!apiKey) {
      return NextResponse.json(buildFallbackSession(catalogoCompleto, objetivo, enfoqueDia, tipoSesion))
    }

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
        CONOCIMIENTO DEPORTIVO APROBADO Y TRAZABLE: ${JSON.stringify(conocimientoAprobado)}
        Si no existe una regla aprobada aplicable, indícalo y no inventes una norma.

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
        const responseText = await generateTextWithRetry(() => generateGeminiText(promptSingle))
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
      - Tipo pedagógico: ${tipoSesion || 'mixto'} | Aparatos técnicos explícitos: ${aparatosDia || 'ninguno'}
      - Frecuencia semanal: ${diasEntrenamiento} dias
      ${proximidadCompetencia.isNear ? `- Competencia cercana en ${proximidadCompetencia.days} dias: estamos en descarga/taper. Reduce preparacion fisica pesada y prioriza rutinas, tecnica limpia, recuperacion y confianza.` : ''}
      ${contextoInventario}
      ${contextoTestFisicos}
      CONOCIMIENTO DEPORTIVO APROBADO Y TRAZABLE: ${JSON.stringify(conocimientoAprobado)}
      No conviertas una fuente histórica o una regla no aprobada en una prescripción.

      BASE DE DATOS DE EJERCICIOS A USAR: ${JSON.stringify(catalogoPrompt)}

      REGLAS DE SEGURIDAD DEPORTIVA:
      - Usa únicamente IDs presentes en la base de datos anterior.
      - Si la fase es competitiva, precompetitiva o hay torneo cercano, evita HIIT, maximos, fatiga al fallo y volumen pesado.
      - No generes una sesión imposible para el horario indicado.
      - Prioriza técnica, rutinas y recuperación cuando el objetivo incluya competencia o pulimiento.
      - Si el tipo es dance_choreography, "Suelo" describe la superficie y NO un aparato técnico: no propongas acrobacia, pasadas ni rutinas de aparato. Usa "tecnico" para ballet y "rutinas" para frases coreográficas, musicalidad, expresión y enlaces; integra prevención de pie, tobillo, rodilla, cadera y postura.

      Devuelve ÚNICA Y EXCLUSIVAMENTE un JSON válido con esta estructura:
      {
        "calentamiento": [{"id": "id", "dosificacion": {"avanzado": "texto", "base": "texto", "desarrollo": "texto"}}],
        "prep-fisica": [{"id": "id", "dosificacion": {"avanzado": "texto", "base": "texto", "desarrollo": "texto"}}],
        "tecnico": [{"id": "id", "dosificacion": {"avanzado": "texto", "base": "texto", "desarrollo": "texto"}}],
        "rutinas": [{"id": "id", "dosificacion": {"avanzado": "texto", "base": "texto", "desarrollo": "texto"}}],
        "flexibilidad": [{"id": "id", "dosificacion": {"avanzado": "texto", "base": "texto", "desarrollo": "texto"}}],
        "cierre": []
      }
    `
    try {
      const responseText = await generateTextWithRetry(() => generateGeminiText(prompt))
      const sanitized = sanitizeSessionResponse(extractJsonObject(responseText), catalogoCompleto, {
        objetivo,
        competenciaCercana: proximidadCompetencia.isNear,
        diasEntrenamiento,
      })
      return NextResponse.json(sanitized)
    } catch (error) {
      console.error('Fallback sesion IA:', error)
      return NextResponse.json(buildFallbackSession(catalogoCompleto, objetivo, enfoqueDia, tipoSesion))
    }

  } catch (error) {
    console.error('Error con IA:', error)
    return NextResponse.json({ error: 'Fallo al generar' }, { status: 500 })
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeInventory(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean)
}

function mergeInventory(...values: unknown[]) {
  return Array.from(new Set(values.flatMap(normalizeInventory)))
}

function buildInventoryContext(value: unknown) {
  const inventario = normalizeInventory(value)
  if (inventario.length === 0) {
    return "El club tiene equipamiento completo estándar de gimnasia artística."
  }

  return `ATENCIÓN: El club tiene un INVENTARIO LIMITADO. Solo puedes utilizar el siguiente equipamiento para diseñar o adaptar los ejercicios: [${inventario.join(', ')}]. ESTÁ ESTRICTAMENTE PROHIBIDO sugerir ejercicios que requieran aparatos o materiales que no estén en esta lista.`
}

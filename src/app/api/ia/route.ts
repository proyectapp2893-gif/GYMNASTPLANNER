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
import { summarizeTeamAssessments, type AssessmentSession } from '../../../lib/physical-assessments/team-context'
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
  cargaDia: z.object({ volumen: z.number().min(0).max(100), intensidad: z.number().min(0).max(100) }).optional(),
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

    const { grupoId, nivel, objetivo, semana, enfoqueDia, aparatosDia, tipoSesion, horario, isSingle, ejercicioUnico, nombreClub, competenciasSecundarias, diasEntrenamiento, fechaSesionActual, cargaDia } = parsed.data
    const conocimientoAprobado = await getApprovedSportsKnowledgeContext(['seguridad','carga','tecnica','recuperacion','bienestar','competencia'])
    const proximidadCompetencia = getCompetitionProximityForDate(
      fechaSesionActual,
      competenciasSecundarias.map(comp => comp.fecha)
    )
    const indicacionCompetencia = proximidadCompetencia.days === 0
      ? 'La competencia es hoy: evita cargas de entrenamiento adicionales; prioriza calentamiento, rutinas previstas y recuperación.'
      : proximidadCompetencia.isNear
        ? `Competencia en ${proximidadCompetencia.days} dias: reduce la fatiga acumulada y prioriza calidad tecnica, rutinas y recuperación.`
        : ''

    const { data: clubData } = await supabase
      .from('clubs')
      .select('acceso_biblioteca_elite, inventario')
      .eq('id', clubId)
      .single()

    const catalogoCompleto: CatalogExercise[] = []
    const pageSize = 500
    for (let offset = 0; ; offset += pageSize) {
      let query = supabase.from('ejercicios')
        .select('id, nombre, categoria, aparato, dificultad, descripcion_corta')
        .order('id').range(offset, offset + pageSize - 1)
      query = clubData?.acceso_biblioteca_elite
        ? query.or(`club_id.eq.${clubId},club_id.is.null`)
        : query.eq('club_id', clubId)
      const { data, error } = await query
      if (error) throw error
      catalogoCompleto.push(...((data || []) as CatalogExercise[]))
      if (!data || data.length < pageSize) break
    }
    const recentUsage = new Map<string, number>()
    const recentSessions: Array<{ fecha: string; objetivo: string; volumen: number | null; intensidad: number | null; exerciseCount: number }> = []

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

      if (fechaSesionActual && /^\d{4}-\d{2}-\d{2}$/.test(fechaSesionActual)) {
        const { data: history, error: historyError } = await supabase.from('sesiones')
          .select('fecha_calendario,objetivo,volumen_planificado,intensidad_planificada,ejercicios')
          .eq('club_id', clubId).eq('grupo_id', grupoId).is('atleta_id', null).is('deleted_at', null)
          .lt('fecha_calendario', fechaSesionActual)
          .order('fecha_calendario', { ascending: false }).limit(8)
        if (historyError) console.error('No se pudo consultar el historial de sesiones:', historyError)
        for (const session of history || []) {
          const blocks = session.ejercicios && typeof session.ejercicios === 'object' ? Object.values(session.ejercicios) : []
          let exerciseCount = 0
          for (const block of blocks) {
            if (!Array.isArray(block)) continue
            for (const exercise of block) {
              if (!exercise || typeof exercise !== 'object' || typeof exercise.id !== 'string') continue
              exerciseCount += 1
              recentUsage.set(exercise.id, (recentUsage.get(exercise.id) || 0) + 1)
            }
          }
          recentSessions.push({ fecha: session.fecha_calendario, objetivo: session.objetivo,
            volumen: session.volumen_planificado, intensidad: session.intensidad_planificada, exerciseCount })
        }
      }

      const { data: atletas } = await supabase.from('atletas').select('id').eq('grupo_id', grupoId).eq('club_id', clubId).is('deleted_at', null)
      if (atletas && atletas.length > 0) {
        const atletaIds = atletas.map((a: { id: string }) => a.id)
        const assessmentDate = fechaSesionActual && /^\d{4}-\d{2}-\d{2}$/.test(fechaSesionActual)
          ? fechaSesionActual : new Date().toISOString().slice(0, 10)
        const windowStart = new Date(`${assessmentDate}T12:00:00Z`)
        windowStart.setUTCDate(windowStart.getUTCDate() - 180)
        const { data: evaluaciones, error: assessmentError } = await supabase.from('sesiones_pruebas_fisicas')
          .select('atleta_id,fecha,resultados_pruebas_fisicas(prueba_id,valor,unidad,catalogo_pruebas_fisicas(nombre,mayor_es_mejor))')
          .eq('club_id', clubId).in('atleta_id', atletaIds).is('deleted_at', null)
          .gte('fecha', windowStart.toISOString().slice(0, 10)).lte('fecha', assessmentDate)
          .order('fecha', { ascending: false }).limit(500)
        if (assessmentError) console.error('No se pudieron consultar los test físicos:', assessmentError)
        if (evaluaciones && evaluaciones.length > 0) {
          const resumenResultados = summarizeTeamAssessments(evaluaciones as AssessmentSession[], atletas.length)
          contextoTestFisicos = `
            TEST FÍSICOS DEL GRUPO (últimos 180 días, hasta la fecha de la sesión):
            ${JSON.stringify(resumenResultados)}
            Compara solo la misma prueba en la misma gimnasta y unidad. La media describe al grupo evaluado; no indica preparación, diagnóstico ni respuesta individual. Considera cobertura y antigüedad. No aumentes o reduzcas automáticamente la carga por estos datos.
          `
        }
      }

      // 🔥 NUEVO: Lógica de consulta del Inventario en Supabase
      const { data: config } = await supabase.from('configuracion_grupos').select('inventario').eq('grupo_id', grupoId).maybeSingle()
      const inventarioCombinado = mergeInventory(clubData?.inventario, config?.inventario)
      contextoInventario = buildInventoryContext(inventarioCombinado)
    }

    const catalogoOrdenado = [...catalogoCompleto].sort((a, b) => (recentUsage.get(a.id) || 0) - (recentUsage.get(b.id) || 0))
    const catalogoPrompt = limitCatalogForPrompt(catalogoOrdenado, enfoqueDia || objetivo, 80)

    if (isSingle && isRecord(ejercicioUnico) && typeof ejercicioUnico.id === 'string'
      && !catalogoCompleto.some(item => item.id === ejercicioUnico.id)) {
      return NextResponse.json({ error: 'Ejercicio no autorizado para este club' }, { status: 403 })
    }

    if (!apiKey) {
      return NextResponse.json(buildFallbackSession(catalogoOrdenado, objetivo, enfoqueDia, tipoSesion, cargaDia))
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
        ${indicacionCompetencia ? `- ${indicacionCompetencia}` : ''}
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
      ${cargaDia ? `- Objetivo relativo para este día: volumen ${cargaDia.volumen}/100 e intensidad ${cargaDia.intensidad}/100. Ajusta la dosificación al microciclo y al estado del grupo; son objetivos de planificación, no carga realizada.` : ''}
      - Sesiones anteriores guardadas, de reciente a antigua: ${JSON.stringify(recentSessions)}
      - IDs de ejercicios usados recientemente y número de apariciones: ${JSON.stringify(Object.fromEntries(recentUsage))}
      - Continúa la progresión del grupo y alterna estímulos y recuperación. Evita repetir ejercicios recientes cuando haya alternativas adecuadas para el mismo objetivo; conserva los básicos necesarios.
      ${indicacionCompetencia ? `- ${indicacionCompetencia}` : ''}
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
      return NextResponse.json(buildFallbackSession(catalogoOrdenado, objetivo, enfoqueDia, tipoSesion, cargaDia))
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

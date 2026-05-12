import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'
import {
  buildFallbackSession,
  extractJsonObject,
  generateTextWithRetry,
  getGeminiModelCandidates,
  isGeminiModelUnavailableError,
  normalizeSingleDose,
  sanitizeSessionResponse,
  type CatalogExercise,
} from '../../../lib/ai-helpers'
import { getAuthenticatedClub } from '../../../lib/supabase-server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const modelCandidates = getGeminiModelCandidates(process.env.GEMINI_MODEL)

async function generateGeminiText(prompt: string) {
  let lastError: unknown

  for (const modelName of modelCandidates) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent(prompt)
      return result.response.text()
    } catch (error) {
      lastError = error
      if (!isGeminiModelUnavailableError(error)) throw error
    }
  }

  throw lastError
}

const sessionSchema = z.object({
  isSingle: z.boolean().optional(),
  ejercicioUnico: z.unknown().optional(),
  nivel: z.string().min(1).max(80).default('Nivel General'),
  objetivo: z.string().min(1).max(160).default('Desarrollo General'),
  semana: z.string().max(80).optional(),
  enfoqueDia: z.string().max(160).optional(),
  competenciasSecundarias: z.array(z.object({ nombre: z.string().optional(), fecha: z.string().optional() })).default([]),
  diasEntrenamiento: z.coerce.number().int().min(1).max(7).default(6),
  fechaSesionActual: z.string().optional().nullable(),
})

export async function POST(request: Request) {
  try {
    const { supabase, clubId, error: authError } = await getAuthenticatedClub()
    if (authError || !clubId) {
      return NextResponse.json({ error: authError || 'No autenticado' }, { status: 401 })
    }

    const parsed = sessionSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Entrada inválida', details: parsed.error.flatten() }, { status: 400 })
    }

    // 🔥 NUEVO: Recibimos las competencias secundarias, los días de entrenamiento y la fecha de la sesión actual
    const { isSingle, ejercicioUnico, nivel, objetivo, semana, enfoqueDia, competenciasSecundarias, diasEntrenamiento, fechaSesionActual } = parsed.data

    // ============================================================================
    // CASO 1: ARRASTRAR Y SOLTAR (Calcula dosis de 1 solo ejercicio en tiempo real)
    // ============================================================================
    if (isSingle) {
      const ejercicio = isRecord(ejercicioUnico) ? ejercicioUnico : {}
      const ejercicioId = typeof ejercicio.id === 'string' ? ejercicio.id : ''
      if (ejercicioId) {
        const { data: clubData } = await supabase
          .from('clubs')
          .select('acceso_biblioteca_elite')
          .eq('id', clubId)
          .single()

        let ejercicioQuery = supabase
          .from('ejercicios')
          .select('id')
          .eq('id', ejercicioId)

        if (clubData?.acceso_biblioteca_elite) {
          ejercicioQuery = ejercicioQuery.or(`club_id.eq.${clubId},club_id.is.null`)
        } else {
          ejercicioQuery = ejercicioQuery.eq('club_id', clubId)
        }

        const { data: ejercicioPermitido } = await ejercicioQuery.single()
        if (!ejercicioPermitido) {
          return NextResponse.json({ error: 'Ejercicio no autorizado para este club' }, { status: 403 })
        }
      }

      const descOriginal = String(ejercicio.descripcion || ejercicio.descripcion_corta || '')
      const tieneDesc = descOriginal.length > 5

      const prompt = `
        Eres un Head Coach Élite de Gimnasia. Vas a dosificar este ejercicio:
        Nombre: ${String(ejercicio.contenido || ejercicio.nombre || '')}
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
      try {
        const responseText = await generateTextWithRetry(() => generateGeminiText(prompt))
        return NextResponse.json(normalizeSingleDose(extractJsonObject(responseText)))
      } catch (error) {
        console.error('Fallback dosificacion IA:', error)
        return NextResponse.json(normalizeSingleDose(null))
      }
    }

    // ============================================================================
    // CASO 2: BOTÓN MÁGICO "DISTRIBUIR CARGAS" (Arma la sesión completa)
    // ============================================================================
    
    // 🔥 NUEVO: Lógica Matemática para detectar Fogueos Cercanos
    let alertaFogueo = false;
    let diasParaFogueo = 999;
    
    if (fechaSesionActual && competenciasSecundarias.length > 0) {
      const fechaClase = new Date(fechaSesionActual);
      
      // Buscar si hay alguna competencia en los próximos 7 días
      for (const comp of competenciasSecundarias) {
        if (comp.fecha) {
          const fechaTorneo = new Date(comp.fecha);
          const diferenciaTiempo = fechaTorneo.getTime() - fechaClase.getTime();
          const diferenciaDias = Math.ceil(diferenciaTiempo / (1000 * 3600 * 24));
          
          if (diferenciaDias >= 0 && diferenciaDias <= 7) {
            alertaFogueo = true;
            diasParaFogueo = diferenciaDias;
            break; // Si encontramos uno cercano, no necesitamos seguir buscando
          }
        }
      }
    }

    const { data: clubData } = await supabase
      .from('clubs')
      .select('acceso_biblioteca_elite')
      .eq('id', clubId)
      .single()

    let ejerciciosQuery = supabase
      .from('ejercicios')
      .select('id, nombre, categoria, aparato, dificultad, descripcion, descripcion_corta')

    if (clubData?.acceso_biblioteca_elite) {
      ejerciciosQuery = ejerciciosQuery.or(`club_id.eq.${clubId},club_id.is.null`)
    } else {
      ejerciciosQuery = ejerciciosQuery.eq('club_id', clubId)
    }

    const { data: ejercicios } = await ejerciciosQuery
    const catalogoCompleto = (ejercicios || []) as CatalogExercise[]

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(buildFallbackSession(catalogoCompleto, objetivo))
    }

    const prompt = `
      Eres el Head Coach Élite de un equipo de gimnasia.
      Crea una sesión de entrenamiento usando EXCLUSIVAMENTE los ejercicios de este catálogo JSON:
      ${JSON.stringify(catalogoCompleto.slice(0, 80))}

      Contexto de la Sesión:
      Nivel: ${nivel} | Fase: ${objetivo} | Semana: ${semana} | Enfoque Principal: ${enfoqueDia}
      
      // 🔥 NUEVO: Inyectamos el contexto crítico de la carga
      Frecuencia de Entrenamiento: Este equipo entrena ${diasEntrenamiento} días a la semana. Ajusta el volumen de la sesión para distribuir la carga adecuadamente según esta frecuencia.
      
      ${alertaFogueo ? `⚠️ ALERTA TÁCTICA ⚠️: El equipo tiene una competencia de fogueo en ${diasParaFogueo} días. 
      ESTAMOS EN SEMANA DE DESCARGA. 
      REGLA INQUEBRANTABLE: Reduce la Preparación Física pesada al mínimo (o elimínala). Aumenta significativamente la carga en la categoría "tecnico" enfocándote en ESQUEMAS, PASADAS COMPLETAS y afinación de rutinas.` : ''}

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
    try {
      const responseText = await generateTextWithRetry(() => generateGeminiText(prompt))
      return NextResponse.json(sanitizeSessionResponse(extractJsonObject(responseText), catalogoCompleto))
    } catch (error) {
      console.error('Fallback sesion IA:', error)
      return NextResponse.json(buildFallbackSession(catalogoCompleto, objetivo))
    }

  } catch (error) {
    console.error('Error con IA:', error)
    return NextResponse.json({ error: 'Fallo al generar la sesión' }, { status: 500 })
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

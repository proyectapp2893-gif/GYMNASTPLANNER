import { normalizeExerciseInput } from './exercise-normalization'

export const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash'

export function getGeminiModelCandidates(configuredModel?: string | null) {
  return [
    configuredModel,
    DEFAULT_GEMINI_MODEL,
    'gemini-flash-latest',
    'gemini-2.0-flash-lite',
  ].filter((model, index, models): model is string => {
    return Boolean(model && models.indexOf(model) === index)
  })
}

export function isGeminiModelUnavailableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('404 Not Found') || message.includes('is not found') || message.includes('not supported for generateContent')
}

export type CatalogExercise = {
  id: string
  nombre?: string | null
  categoria?: string | null
  aparato?: string | null
  dificultad?: string | null
  descripcion?: string | null
  descripcion_corta?: string | null
}

type Dose = {
  avanzado: string
  base: string
  desarrollo: string
}

const SESSION_KEYS = ['calentamiento', 'prep-fisica', 'tecnico', 'rutinas', 'flexibilidad', 'cierre'] as const

const DEFAULT_DOSE: Dose = {
  avanzado: 'Carga moderada controlada',
  base: 'Carga base controlada',
  desarrollo: 'Carga reducida con técnica estricta',
}

export function extractJsonObject(text: string) {
  const clean = text.replace(/```json/g, '').replace(/```/g, '').trim()
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) throw new Error('Respuesta IA sin objeto JSON')
  return JSON.parse(clean.substring(start, end + 1))
}

export function extractJsonArray(text: string) {
  const clean = text.replace(/```json/g, '').replace(/```/g, '').trim()
  const start = clean.indexOf('[')
  const end = clean.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) throw new Error('Respuesta IA sin arreglo JSON')
  return JSON.parse(clean.substring(start, end + 1))
}

export async function generateTextWithRetry(generate: () => Promise<string>, retries = 2) {
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await generate()
    } catch (error) {
      lastError = error
      if (attempt === retries) break
      await new Promise(resolve => setTimeout(resolve, 700 * (attempt + 1)))
    }
  }

  throw lastError
}

export function limitCatalogForPrompt(catalog: CatalogExercise[], enfoque = '', limit = 80) {
  const normalizedFocus = normalize(enfoque)
  const apparatusHints = ['suelo', 'salto', 'barras', 'viga', 'trampolin', 'tumbling', 'general']

  const scored = catalog.map(exercise => {
    const haystack = normalize(`${exercise.nombre || ''} ${exercise.categoria || ''} ${exercise.aparato || ''} ${exercise.dificultad || ''}`)
    const focusScore = normalizedFocus && haystack.includes(normalizedFocus) ? 3 : 0
    const apparatusScore = apparatusHints.some(hint => normalizedFocus.includes(hint) && haystack.includes(hint)) ? 2 : 0
    return { exercise, score: focusScore + apparatusScore }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.exercise)
}

export function sanitizeSessionResponse(raw: unknown, catalog: CatalogExercise[]) {
  const allowedIds = new Set(catalog.map(exercise => exercise.id))
  const source = isRecord(raw) ? raw : {}
  const sanitized: Record<string, Array<{ id: string; dosificacion: Dose }>> = {}

  SESSION_KEYS.forEach(key => {
    const value = source[key]
    const items = Array.isArray(value) ? value : []

    sanitized[key] = items
      .map(item => normalizeSessionItem(item))
      .filter((item): item is { id: string; dosificacion: Dose } => Boolean(item && allowedIds.has(item.id)))
      .slice(0, 12)
  })

  return sanitized
}

export function buildFallbackSession(catalog: CatalogExercise[], objetivo = '') {
  const fase = normalize(objetivo)
  const competitive = fase.includes('compet') || fase.includes('pulimiento')
  const pick = (matcher: (exercise: CatalogExercise) => boolean, max: number) =>
    catalog.filter(matcher).slice(0, max).map(exercise => ({ id: exercise.id, dosificacion: fallbackDose(fase) }))

  const byCategory = (category: string) => (exercise: CatalogExercise) => normalize(exercise.categoria || '').includes(category)
  const technical = (exercise: CatalogExercise) => normalize(exercise.categoria || '').includes('tecn')

  return {
    calentamiento: pick(byCategory('calent'), 4),
    'prep-fisica': competitive ? pick(byCategory('prep'), 2) : pick(byCategory('prep'), 5),
    tecnico: pick(technical, competitive ? 8 : 5),
    rutinas: pick(exercise => normalize(exercise.categoria || '').includes('rutina') || normalize(exercise.categoria || '').includes('secuencia'), competitive ? 4 : 2),
    flexibilidad: pick(byCategory('flex'), 3),
    cierre: pick(exercise => normalize(exercise.categoria || '').includes('cierre') || normalize(exercise.categoria || '').includes('calma'), 2),
  }
}

export function normalizeGeneratedExercises(raw: unknown, clubId?: string | null) {
  const items = Array.isArray(raw) ? raw : []
  return items
    .map(item => (isRecord(item) ? item : null))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map(item => normalizeExerciseInput(item, clubId))
    .filter(item => item.nombre && item.descripcion_corta)
}

export function normalizeSingleDose(raw: unknown) {
  if (!isRecord(raw)) return DEFAULT_DOSE
  return {
    avanzado: cleanString(raw.avanzado, 120) || DEFAULT_DOSE.avanzado,
    base: cleanString(raw.base, 120) || DEFAULT_DOSE.base,
    desarrollo: cleanString(raw.desarrollo, 160) || DEFAULT_DOSE.desarrollo,
  }
}

function normalizeSessionItem(item: unknown) {
  if (typeof item === 'string') return { id: item, dosificacion: DEFAULT_DOSE }
  if (!isRecord(item) || typeof item.id !== 'string') return null
  return {
    id: item.id,
    dosificacion: normalizeSingleDose(item.dosificacion),
  }
}

function fallbackDose(fase: string): Dose {
  if (fase.includes('compet') || fase.includes('pulimiento')) {
    return {
      avanzado: '2-3 series tecnicas, intensidad baja-media',
      base: '2 series tecnicas, intensidad baja',
      desarrollo: '1-2 series con asistencia y descanso amplio',
    }
  }

  return {
    avanzado: '4 series x 8-12 reps',
    base: '3 series x 6-10 reps',
    desarrollo: '2-3 series x 5-8 reps',
  }
}

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

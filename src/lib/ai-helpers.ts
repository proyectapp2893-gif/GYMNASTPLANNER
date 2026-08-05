import { normalizeExerciseInput } from './exercise-normalization'

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

type SessionSafetyContext = {
  objetivo?: string
  competenciaCercana?: boolean
  diasEntrenamiento?: number
}

const SESSION_KEYS = ['calentamiento', 'prep-fisica', 'tecnico', 'rutinas', 'flexibilidad', 'cierre'] as const
type SessionKey = typeof SESSION_KEYS[number]

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

export function sanitizeSessionResponse(raw: unknown, catalog: CatalogExercise[], safety: SessionSafetyContext = {}) {
  const allowedIds = new Set(catalog.map(exercise => exercise.id))
  const source = isRecord(raw) ? raw : {}
  const sanitized: Record<string, Array<{ id: string; dosificacion: Dose }>> = {}

  SESSION_KEYS.forEach(key => {
    const value = source[key]
    const items = Array.isArray(value) ? value : []

    sanitized[key] = items
      .map(item => normalizeSessionItem(item, safety))
      .filter((item): item is { id: string; dosificacion: Dose } => Boolean(item && allowedIds.has(item.id)))
      .slice(0, getMaxItemsForBlock(key, safety))
  })

  return sanitized
}

export function buildFallbackSession(catalog: CatalogExercise[], objetivo = '', enfoque = '', tipoSesion = '') {
  const fase = normalize(objetivo)
  const focus = normalize(enfoque)
  const isDance = tipoSesion === 'dance_choreography' || ['coreografia', 'ballet', 'danza'].some(term => focus.includes(term))
  const competitive = fase.includes('compet') || fase.includes('pulimiento')
  const pick = (matcher: (exercise: CatalogExercise) => boolean, max: number) =>
    catalog.filter(matcher).slice(0, max).map(exercise => ({ id: exercise.id, dosificacion: fallbackDose(fase) }))

  const byCategory = (category: string) => (exercise: CatalogExercise) => normalize(exercise.categoria || '').includes(category)
  const technical = (exercise: CatalogExercise) => normalize(exercise.categoria || '').includes('tecn')
  const dance = (exercise: CatalogExercise) => {
    const text = normalize(`${exercise.nombre || ''} ${exercise.categoria || ''} ${exercise.descripcion_corta || ''}`)
    return ['ballet', 'danza', 'coreografia', 'expresion', 'musicalidad', 'releve'].some(term => text.includes(term))
  }
  const prevention = (exercise: CatalogExercise) => {
    const text = normalize(`${exercise.nombre || ''} ${exercise.categoria || ''} ${exercise.descripcion_corta || ''}`)
    return ['prevencion', 'estabilidad', 'alineacion', 'tobillo', 'movilidad'].some(term => text.includes(term))
  }

  if (isDance) {
    return {
      calentamiento: pick(byCategory('calent'), 4),
      'prep-fisica': pick(exercise => prevention(exercise) || byCategory('prep')(exercise), 5),
      tecnico: pick(dance, 6),
      rutinas: pick(dance, 5),
      flexibilidad: pick(byCategory('flex'), 3),
      cierre: pick(exercise => normalize(exercise.categoria || '').includes('cierre') || normalize(exercise.categoria || '').includes('calma'), 2),
    }
  }

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

export function buildFallbackGeneratedExercises(tema: string, cantidad: number, clubId?: string | null) {
  const focus = cleanString(tema, 80) || 'Gimnasia general'
  const apparatus = inferApparatus(focus)
  const category = inferCategory(focus)

  const templates = [
    {
      suffix: 'progresivo tecnico',
      descripcion_corta: `Progresion controlada para ${focus}`,
      rangos_repeticiones: '3-4 series x 6-8 reps',
      dificultad: 'Básico',
    },
    {
      suffix: 'con asistencia',
      descripcion_corta: `Ejecucion asistida enfocada en ${focus}`,
      rangos_repeticiones: '3 series x 5-8 reps',
      dificultad: 'Intermedio',
    },
    {
      suffix: 'por estaciones',
      descripcion_corta: `Circuito corto para reforzar ${focus}`,
      rangos_repeticiones: '30-45 seg por estacion',
      dificultad: 'Básico',
    },
    {
      suffix: 'de precision',
      descripcion_corta: `Trabajo de calidad tecnica en ${focus}`,
      rangos_repeticiones: '4 series x 4-6 reps',
      dificultad: 'Avanzado',
    },
    {
      suffix: 'con control postural',
      descripcion_corta: `Control corporal aplicado a ${focus}`,
      rangos_repeticiones: '3 series x 20-30 seg',
      dificultad: 'Intermedio',
    },
  ]

  return Array.from({ length: Math.max(1, Math.min(cantidad, 15)) }, (_, index) => {
    const template = templates[index % templates.length]
    return normalizeExerciseInput({
      nombre: `${capitalize(focus)} - ${template.suffix} ${index + 1}`,
      categoria: category,
      aparato: apparatus,
      dificultad: template.dificultad,
      descripcion_corta: template.descripcion_corta,
      rangos_repeticiones: template.rangos_repeticiones,
      etiquetas: `${focus}, progresion, tecnica`,
    }, clubId)
  })
}

export function normalizeSingleDose(raw: unknown) {
  if (!isRecord(raw)) return DEFAULT_DOSE
  return {
    avanzado: cleanString(raw.avanzado, 120) || DEFAULT_DOSE.avanzado,
    base: cleanString(raw.base, 120) || DEFAULT_DOSE.base,
    desarrollo: cleanString(raw.desarrollo, 160) || DEFAULT_DOSE.desarrollo,
  }
}

function normalizeSessionItem(item: unknown, safety: SessionSafetyContext) {
  if (typeof item === 'string') return { id: item, dosificacion: sanitizeDoseForSafety(DEFAULT_DOSE, safety) }
  if (!isRecord(item) || typeof item.id !== 'string') return null
  return {
    id: item.id,
    dosificacion: sanitizeDoseForSafety(normalizeSingleDose(item.dosificacion), safety),
  }
}

function getMaxItemsForBlock(key: SessionKey, safety: SessionSafetyContext) {
  const fase = normalize(safety.objetivo || '')
  const competitive = Boolean(safety.competenciaCercana || fase.includes('compet') || fase.includes('pulimiento'))
  const weeklyDays = Number(safety.diasEntrenamiento || 6)

  if (competitive) {
    if (key === 'prep-fisica') return 2
    if (key === 'tecnico' || key === 'rutinas') return 8
  }

  if (weeklyDays <= 3 && key === 'prep-fisica') return 3
  if (weeklyDays <= 3 && key === 'tecnico') return 5

  return 12
}

function sanitizeDoseForSafety(dose: Dose, safety: SessionSafetyContext): Dose {
  const fase = normalize(safety.objetivo || '')
  const competitive = Boolean(safety.competenciaCercana || fase.includes('compet') || fase.includes('pulimiento'))
  if (!competitive) return dose

  return {
    avanzado: sanitizeCompetitiveDoseText(dose.avanzado, '2-3 series tecnicas, intensidad baja-media, descanso amplio'),
    base: sanitizeCompetitiveDoseText(dose.base, '2 series tecnicas, intensidad baja, descanso amplio'),
    desarrollo: sanitizeCompetitiveDoseText(dose.desarrollo, '1-2 series asistidas, calidad tecnica, descanso amplio'),
  }
}

function sanitizeCompetitiveDoseText(value: string, fallback: string) {
  const normalized = normalize(value)
  const unsafe = [
    'hiit',
    'fallo',
    'maximo',
    'maxima',
    'maximos',
    'amrap',
    'tabata',
    'sin descanso',
    'agotamiento',
  ]

  return unsafe.some(term => normalized.includes(term)) ? fallback : value
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

function inferApparatus(value: string) {
  const normalized = normalize(value)
  if (normalized.includes('barra')) return 'Barras Asimétricas'
  if (normalized.includes('viga')) return 'Viga de Equilibrio'
  if (normalized.includes('salto')) return 'Salto'
  if (normalized.includes('tramp') || normalized.includes('tumbling')) return 'Trampolín / Tumbling'
  if (normalized.includes('suelo') || normalized.includes('piso') || normalized.includes('roll')) return 'Suelo'
  return 'General / Ninguno'
}

function inferCategory(value: string) {
  const normalized = normalize(value)
  if (normalized.includes('calent')) return 'Calentamiento'
  if (normalized.includes('flex')) return 'Flexibilidad'
  if (normalized.includes('fisic') || normalized.includes('fuerza') || normalized.includes('core')) return 'Prep. Física - General'
  if (normalized.includes('rutina') || normalized.includes('pasada')) return 'Rutina Completa'
  return 'Técnico'
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

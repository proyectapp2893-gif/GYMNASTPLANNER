export const EXERCISE_CATEGORIES = [
  'Técnico',
  'Prep. Física - General',
  'Prep. Física - Tarjeta Azul',
  'Prep. Física - Tarjeta Roja',
  'Flexibilidad',
  'Calentamiento',
  'Calma / Cierre',
  'Rutina Completa',
  'Secuencia / Conexión',
] as const

export const APPARATUS = [
  'General / Ninguno',
  'Barras Asimétricas',
  'Viga de Equilibrio',
  'Suelo',
  'Salto',
  'Trampolín / Tumbling',
] as const

export const DIFFICULTIES = [
  'Básico',
  'Intermedio',
  'Avanzado',
  'Élite',
  'Niveles 1-3',
  'Niveles 4-6',
  'Niveles 7-9',
  'Nivel 10',
] as const

export type ExerciseInput = {
  nombre?: unknown
  categoria?: unknown
  dificultad?: unknown
  aparato?: unknown
  descripcion?: unknown
  descripcion_corta?: unknown
  rangos_repeticiones?: unknown
  etiquetas?: unknown
  video_url?: unknown
  club_id?: unknown
}

export function normalizeExerciseInput(input: ExerciseInput, clubId?: string | null) {
  return {
    nombre: cleanString(input.nombre, 120),
    categoria: normalizeCategory(input.categoria),
    dificultad: normalizeDifficulty(input.dificultad),
    aparato: normalizeApparatus(input.aparato),
    descripcion: cleanString(input.descripcion, 800),
    descripcion_corta: cleanString(input.descripcion_corta, 220),
    rangos_repeticiones: cleanString(input.rangos_repeticiones, 80) || '10-20 reps',
    etiquetas: normalizeTags(input.etiquetas),
    video_url: normalizeVideoUrl(input.video_url),
    ...(clubId ? { club_id: clubId } : {}),
  }
}

export function normalizeCategory(value: unknown) {
  const text = cleanString(value, 80)
  const normalized = normalize(text)

  if (normalized.includes('calent')) return 'Calentamiento'
  if (normalized.includes('calma') || normalized.includes('cierre')) return 'Calma / Cierre'
  if (normalized.includes('flex')) return 'Flexibilidad'
  if (normalized.includes('rutina completa')) return 'Rutina Completa'
  if (normalized.includes('secuencia') || normalized.includes('conexion')) return 'Secuencia / Conexión'
  if (normalized.includes('tarjeta azul')) return 'Prep. Física - Tarjeta Azul'
  if (normalized.includes('tarjeta roja')) return 'Prep. Física - Tarjeta Roja'
  if (normalized.includes('prep') || normalized.includes('fisica') || normalized.includes('física')) return 'Prep. Física - General'
  if (normalized.includes('tecn')) return 'Técnico'

  return EXERCISE_CATEGORIES.includes(text as (typeof EXERCISE_CATEGORIES)[number]) ? text : 'Técnico'
}

export function normalizeApparatus(value: unknown) {
  const text = cleanString(value, 80)
  const normalized = normalize(text)

  if (!text || normalized === 'general' || normalized.includes('ninguno')) return 'General / Ninguno'
  if (normalized.includes('barra') || normalized.includes('asimetr')) return 'Barras Asimétricas'
  if (normalized.includes('viga') || normalized.includes('equilibrio')) return 'Viga de Equilibrio'
  if (normalized.includes('suelo') || normalized.includes('piso')) return 'Suelo'
  if (normalized.includes('salto')) return 'Salto'
  if (normalized.includes('tramp') || normalized.includes('tumbling')) return 'Trampolín / Tumbling'

  return APPARATUS.includes(text as (typeof APPARATUS)[number]) ? text : 'General / Ninguno'
}

export function normalizeDifficulty(value: unknown) {
  const text = cleanString(value, 80)
  const normalized = normalize(text)

  if (normalized.includes('1-3') || normalized.includes('1 a 3')) return 'Niveles 1-3'
  if (normalized.includes('4-6') || normalized.includes('4 a 6')) return 'Niveles 4-6'
  if (normalized.includes('7-9') || normalized.includes('7 a 9')) return 'Niveles 7-9'
  if (normalized.includes('10')) return 'Nivel 10'
  if (normalized.includes('elite') || normalized.includes('élite')) return 'Élite'
  if (normalized.includes('avanz')) return 'Avanzado'
  if (normalized.includes('inter')) return 'Intermedio'
  if (normalized.includes('bas')) return 'Básico'

  return DIFFICULTIES.includes(text as (typeof DIFFICULTIES)[number]) ? text : 'Básico'
}

export function normalizeVideoUrl(value: unknown) {
  const raw = cleanString(value, 500)
  if (!raw) return ''

  const withProtocol = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`

  try {
    const url = new URL(withProtocol)
    const host = url.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      return `https://www.youtube.com/embed/${url.pathname.replace('/', '')}${url.search}`
    }

    if (host.includes('youtube.com')) {
      const id = url.searchParams.get('v')
      if (id) return `https://www.youtube.com/embed/${id}`
      return url.toString()
    }

    if (host.includes('drive.google.com')) {
      const match = url.pathname.match(/\/file\/d\/([^/]+)/)
      if (match?.[1]) return `https://drive.google.com/file/d/${match[1]}/preview`
      return url.toString()
    }

    return url.toString()
  } catch {
    return ''
  }
}

export function buildExerciseFingerprint(input: ExerciseInput) {
  return normalize(`${cleanString(input.nombre, 120)}|${normalizeApparatus(input.aparato)}`)
}

function normalizeTags(value: unknown) {
  return cleanString(value, 120)
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean)
    .slice(0, 5)
    .join(', ')
}

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

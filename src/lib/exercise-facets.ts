export const normalizeExerciseFacet = (value?: string | null) => (value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()

export function canonicalExerciseCategory(value?: string | null) {
  const text = value?.trim() || ''
  const key = normalizeExerciseFacet(text)
  if (key.includes('retroaliment') || key.includes('feedback')) return 'Retroalimentación y Feedback'
  if (key.includes('calma') || key.includes('cierre')) return 'Calma / Cierre'
  if (key.includes('tarjeta azul')) return 'Prep. Física - Tarjeta Azul'
  if (key.includes('tarjeta roja')) return 'Prep. Física - Tarjeta Roja'
  if (key.includes('tarjeta amarilla')) return 'Prep. Física - Tarjeta Amarilla'
  if (key.includes('tarjeta verde')) return 'Prep. Física - Tarjeta Verde'
  if (key.includes('tarjeta naranja')) return 'Prep. Física - Tarjeta Naranja'
  if (key === 'fisico' || key === 'fisica' || key.startsWith('preparacion fisica') || key.startsWith('prep fisica')) return 'Prep. Física - General'
  if (key === 'tecnico' || key === 'tecnica') return 'Técnico'
  if (key === 'calentamiento') return 'Calentamiento'
  if (key === 'flexibilidad') return 'Flexibilidad'
  if (key === 'rutinas completas' || key === 'rutina completa') return 'Rutina Completa'
  if (key === 'secuencias y conexiones' || key === 'secuencia conexion') return 'Secuencia / Conexión'
  if (key === 'progresion') return 'Progresión'
  if (key === 'posicion basica') return 'Posición Básica'
  if (key === 'habilidad') return 'Habilidad'
  return text
}

export function canonicalExerciseApparatus(value?: string | null) {
  const text = value?.trim() || ''
  const key = normalizeExerciseFacet(text)
  if (key === 'general' || key === 'general ninguno' || key === 'ninguno') return 'General / Ninguno'
  if (key === 'barras' || key === 'barras asimetricas') return 'Barras Asimétricas'
  if (key === 'viga' || key === 'viga de equilibrio') return 'Viga de Equilibrio'
  if (key === 'trampolin' || key === 'tumbling' || key === 'trampolin tumbling') return 'Trampolín / Tumbling'
  return text
}

export function canonicalExerciseDifficulty(value?: string | null) {
  const text = value?.trim() || ''
  const key = normalizeExerciseFacet(text)
  if (key === 'principiante') return 'Básico'
  if (key === 'basico' || key === 'intermedio' || key === 'avanzado' || key === 'elite') {
    return { basico: 'Básico', intermedio: 'Intermedio', avanzado: 'Avanzado', elite: 'Élite' }[key]
  }
  return text
}

export interface FilterableSessionExercise {
  categoria?: string | null
  descripcion?: string | null
  descripcion_corta?: string | null
  dificultad?: string | null
  aparato?: string | null
  contenido: string
}

const normalize = (value?: string | null) => (value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')

const includesAny = (value: string, terms: string[]) => terms.some(term => value.includes(term))

export function exerciseMatchesSessionSection(
  exercise: FilterableSessionExercise,
  sectionId: string,
  sectionName: string,
  selectedLevel: string,
) {
  const category = normalize(exercise.categoria)
  const apparatus = normalize(exercise.aparato)
  const searchable = normalize(`${exercise.contenido} ${exercise.descripcion || ''} ${exercise.descripcion_corta || ''}`)

  if (sectionId.startsWith('calentamiento_')) return category.includes('calentamiento')
  if (sectionId.startsWith('prep_fisica_')) {
    if (!category.includes('prep') && !category.includes('fisica')) return false
    if (sectionId === 'prep_fisica_core') return includesAny(searchable, ['core', 'abdom', 'lumbar', 'canoa', 'hollow', 'tronco', 'estabiliza', 'zona media'])
    if (sectionId === 'prep_fisica_superior') return includesAny(searchable, ['brazo', 'hombro', 'escap', 'pectoral', 'dorsal', 'dominada', 'flexion', 'push', 'empuje', 'traccion', 'handstand', 'parada de manos', 'tren superior'])
    if (sectionId === 'prep_fisica_inferior') return includesAny(searchable, ['pierna', 'glute', 'cadera', 'rodilla', 'tobillo', 'pantorr', 'gemelo', 'sentadilla', 'zancada', 'salto', 'pliometr', 'tren inferior'])
    return true
  }
  if (sectionId.startsWith('tecnico_')) {
    return category.includes('tecn')
      && apparatusMatchesSection(apparatus, sectionName)
      && difficultyMatchesLevel(exercise.dificultad, selectedLevel, searchable)
  }
  if (sectionId === 'rutinas_mitades') return category.includes('secuencia') || category.includes('conexion')
  if (sectionId === 'rutinas_completas') return category.includes('rutina completa')
  if (sectionId.startsWith('flexibilidad_')) {
    if (!category.includes('flexibilidad')) return false
    if (sectionId === 'flexibilidad_activa') return includesAny(searchable, ['activ', 'lanzamiento', 'balanceo', 'dinamic'])
    if (sectionId === 'flexibilidad_pasiva') return includesAny(searchable, ['pasiv', 'spagat', 'split', 'estiramiento', 'elongacion', 'gravedad'])
    return true
  }
  if (sectionId === 'cierre_elongacion') return (category.includes('calma') || category.includes('cierre')) && !includesAny(searchable, ['feedback', 'retroaliment'])
  if (sectionId === 'cierre_retroalimentacion') return (category.includes('calma') || category.includes('cierre')) && includesAny(searchable, ['feedback', 'retroaliment', 'reflexion'])
  return false
}

function apparatusMatchesSection(apparatus: string, sectionName: string) {
  const section = normalize(sectionName)
  if (section.includes('preparacion especifica') || section.includes('basicos')) {
    return !apparatus || apparatus.includes('general') || apparatus.includes('ninguno')
  }
  if (section.includes('barra') && (section.includes('asimetr') || section.includes('posiciones'))) return apparatus.includes('barra') || apparatus.includes('asimetr')
  if (section.includes('viga')) return apparatus.includes('viga') || apparatus.includes('equilibrio')
  if (section.includes('suelo') || section.includes('centro') || section.includes('coreograf')) return apparatus.includes('suelo')
  if (section.includes('salto')) return apparatus === 'salto'
  if (section.includes('tramp') || section.includes('tumbling')) return apparatus.includes('tramp') || apparatus.includes('tumbling')
  return apparatus === section
}

function difficultyMatchesLevel(difficultyValue?: string | null, levelValue?: string | null, exerciseText = '') {
  const difficulty = normalize(difficultyValue)
  const level = Number(normalize(levelValue).match(/\d+/)?.[0])
  if (!level) return true

  const explicitExerciseLevels = [...normalize(exerciseText).matchAll(/\bnivel(?:es)?\s*(\d{1,2})\b/g)]
    .map(match => Number(match[1]))
  if (explicitExerciseLevels.length > 0 && !explicitExerciseLevels.includes(level)) return false

  const exactDifficulty = difficulty.match(/^nivel\s*(\d{1,2})$/)
  if (exactDifficulty) return Number(exactDifficulty[1]) === level

  if (level <= 3) return difficulty.includes('1-3') || difficulty.includes('1 a 3') || difficulty.includes('basic')
  if (level <= 6) return difficulty.includes('4-6') || difficulty.includes('4 a 6') || difficulty.includes('intermedio')
  if (level <= 9) return difficulty.includes('7-9') || difficulty.includes('7 a 9') || difficulty.includes('avanzado')
  return difficulty.includes('nivel 10') || difficulty.includes('elite')
}

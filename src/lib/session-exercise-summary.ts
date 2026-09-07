const SESSION_PHASE_KEYS: Record<string, string[]> = {
  calentamiento: ['calentamiento_general', 'calentamiento_especifico'],
  'prep-fisica': ['prep_fisica_core', 'prep_fisica_superior', 'prep_fisica_inferior'],
  tecnico: ['tecnico_aparato1', 'tecnico_aparato2'],
  rutinas: ['rutinas_mitades', 'rutinas_completas'],
  flexibilidad: ['flexibilidad_activa', 'flexibilidad_pasiva'],
  cierre: ['cierre_elongacion', 'cierre_retroalimentacion'],
}

type ExerciseGroups<T> = Record<string, T[] | undefined> | null | undefined

export function getSessionPhaseExercises<T>(exercises: ExerciseGroups<T>, phase: string): T[] {
  if (!exercises) return []
  const current = (SESSION_PHASE_KEYS[phase] || []).flatMap(key => exercises[key] || [])
  return current.length > 0 ? current : exercises[phase] || []
}

export function getSessionExerciseCount<T>(exercises: ExerciseGroups<T>): number {
  if (!exercises) return 0
  return Object.values(exercises).reduce<number>((total, items) => total + (Array.isArray(items) ? items.length : 0), 0)
}

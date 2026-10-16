export const phaseNames: Record<string, string> = {
  calentamiento_general: 'Calentamiento general', calentamiento_especifico: 'Calentamiento específico',
  prep_fisica_core: 'Preparación física · core', prep_fisica_superior: 'Preparación física · tren superior',
  prep_fisica_inferior: 'Preparación física · tren inferior', tecnico_aparato1: 'Técnica · aparato 1',
  tecnico_aparato2: 'Técnica · aparato 2', rutinas_mitades: 'Rutinas · mitades', rutinas_completas: 'Rutinas completas',
  flexibilidad_activa: 'Flexibilidad activa', flexibilidad_pasiva: 'Flexibilidad pasiva',
  cierre_elongacion: 'Vuelta a la calma · elongación', cierre_retroalimentacion: 'Retroalimentación',
  calentamiento: 'Calentamiento', 'prep-fisica': 'Preparación física', tecnico: 'Técnica', rutinas: 'Rutinas',
  flexibilidad: 'Flexibilidad', cierre: 'Vuelta a la calma',
}
const missing = 'No registrado'
export function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
export function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}
export function dosage(value: unknown) {
  return text(value) || Object.entries(record(value)).map(([group, dose]) => `${group}: ${text(dose)}`).join('\n') || missing
}

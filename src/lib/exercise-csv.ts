export const EXERCISE_CSV_HEADERS = [
  'nombre',
  'categoria',
  'aparato',
  'dificultad',
  'descripcion',
  'video_url',
  'rangos_repeticiones',
  'etiquetas',
] as const

export const EXERCISE_CSV_EXAMPLE_NAME = 'EJEMPLO - Eliminar esta fila'

const escapeCsvValue = (value: string) => `"${value.replaceAll('"', '""')}"`

export function buildExerciseCsvTemplate() {
  const example = [
    EXERCISE_CSV_EXAMPLE_NAME,
    'Técnico',
    'Suelo',
    'Básico',
    'Descripción técnica, ejecución y criterios de seguridad.',
    'https://www.youtube.com/watch?v=ejemplo',
    '3 series de 5 repeticiones',
    'Suelo, Técnica, Base',
  ]

  return `\uFEFF${EXERCISE_CSV_HEADERS.map(escapeCsvValue).join(',')}\r\n${example.map(escapeCsvValue).join(',')}\r\n`
}

export function isExerciseCsvExampleName(name: string) {
  return name.trim().toLocaleLowerCase('es') === EXERCISE_CSV_EXAMPLE_NAME.toLocaleLowerCase('es')
}

import { describe, expect, it } from 'vitest'
import { buildExerciseCsvTemplate, EXERCISE_CSV_HEADERS, isExerciseCsvExampleName } from './exercise-csv'

describe('plantilla CSV de ejercicios', () => {
  it('incluye BOM UTF-8, columnas compatibles y ejemplo entre comillas', () => {
    const csv = buildExerciseCsvTemplate()
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain(EXERCISE_CSV_HEADERS.map(header => `"${header}"`).join(','))
    expect(csv).toContain('"Descripción técnica, ejecución y criterios de seguridad."')
  })

  it('reconoce la fila demostrativa para no importarla', () => {
    expect(isExerciseCsvExampleName(' EJEMPLO - Eliminar esta fila ')).toBe(true)
    expect(isExerciseCsvExampleName('Rondada')).toBe(false)
  })
})

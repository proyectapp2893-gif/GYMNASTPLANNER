import { describe, expect, it } from 'vitest'
import { canonicalExerciseApparatus, canonicalExerciseCategory, canonicalExerciseDifficulty } from './exercise-facets'

describe('exercise facet labels', () => {
  it('groups equivalent imported labels without rewriting existing rows', () => {
    expect(canonicalExerciseCategory('Calma y cierre')).toBe(canonicalExerciseCategory('Calma / Cierre'))
    expect(canonicalExerciseApparatus('General')).toBe(canonicalExerciseApparatus('General / Ninguno'))
    expect(canonicalExerciseApparatus('Barras')).toBe(canonicalExerciseApparatus('Barras Asimétricas'))
    expect(canonicalExerciseApparatus('Viga')).toBe(canonicalExerciseApparatus('Viga de Equilibrio'))
    expect(canonicalExerciseDifficulty('Principiante')).toBe(canonicalExerciseDifficulty('Básico'))
  })

  it('preserves distinct section categories', () => {
    expect(canonicalExerciseCategory('Retroalimentación y Feedback')).toBe('Retroalimentación y Feedback')
    expect(canonicalExerciseCategory('Progresión')).toBe('Progresión')
  })
})

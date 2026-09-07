import { describe, expect, it } from 'vitest'
import { getSessionExerciseCount, getSessionPhaseExercises } from './session-exercise-summary'

describe('session exercise summary', () => {
  it('combina las subdivisiones actuales de cada bloque', () => {
    const exercises = {
      calentamiento_general: [{ id: 'general' }],
      calentamiento_especifico: [{ id: 'especifico' }],
      rutinas_mitades: [{ id: 'mitades' }],
      rutinas_completas: [{ id: 'completas' }],
    }

    expect(getSessionPhaseExercises(exercises, 'calentamiento').map(item => item.id)).toEqual(['general', 'especifico'])
    expect(getSessionPhaseExercises(exercises, 'rutinas').map(item => item.id)).toEqual(['mitades', 'completas'])
    expect(getSessionExerciseCount(exercises)).toBe(4)
  })

  it('mantiene compatibilidad con sesiones del formato anterior', () => {
    const exercises = { calentamiento: [{ id: 'legacy' }], tecnico: [{ id: 'legacy-tech' }] }

    expect(getSessionPhaseExercises(exercises, 'calentamiento')).toEqual([{ id: 'legacy' }])
    expect(getSessionPhaseExercises(exercises, 'tecnico')).toEqual([{ id: 'legacy-tech' }])
  })

  it('identifica una sesión vacía aunque sus bloques existan', () => {
    expect(getSessionExerciseCount({ calentamiento_general: [], tecnico_aparato1: [] })).toBe(0)
  })
})

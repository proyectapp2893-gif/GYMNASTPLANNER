import { describe, expect, it } from 'vitest'
import { exerciseMatchesSessionSection } from './session-exercise-filter'

const exercise = (overrides: Record<string, string> = {}) => ({
  contenido: 'Ejercicio', categoria: 'Técnico', aparato: 'Suelo', dificultad: 'Niveles 4-6', ...overrides,
})

describe('exerciseMatchesSessionSection', () => {
  it('limits every general block to its category', () => {
    expect(exerciseMatchesSessionSection(exercise({ categoria: 'Calentamiento' }), 'calentamiento_general', 'Activación', 'Nivel 4')).toBe(true)
    expect(exerciseMatchesSessionSection(exercise(), 'calentamiento_general', 'Activación', 'Nivel 4')).toBe(false)
    expect(exerciseMatchesSessionSection(exercise({ categoria: 'Flexibilidad', contenido: 'Balanceos dinámicos activos' }), 'flexibilidad_activa', 'Flexibilidad activa', 'Nivel 4')).toBe(true)
    expect(exerciseMatchesSessionSection(exercise({ categoria: 'Flexibilidad', contenido: 'Split pasivo' }), 'flexibilidad_activa', 'Flexibilidad activa', 'Nivel 4')).toBe(false)
  })

  it('separates physical preparation by body area', () => {
    const upper = exercise({ categoria: 'Prep. Física - General', contenido: 'Dominadas asistidas' })
    expect(exerciseMatchesSessionSection(upper, 'prep_fisica_superior', 'Tren superior', 'Nivel 4')).toBe(true)
    expect(exerciseMatchesSessionSection(upper, 'prep_fisica_inferior', 'Tren inferior', 'Nivel 4')).toBe(false)
  })

  it('requires both apparatus and current level for technical work', () => {
    expect(exerciseMatchesSessionSection(exercise(), 'tecnico_aparato1', 'Suelo', 'Nivel 5')).toBe(true)
    expect(exerciseMatchesSessionSection(exercise({ aparato: 'Viga de Equilibrio' }), 'tecnico_aparato1', 'Suelo', 'Nivel 5')).toBe(false)
    expect(exerciseMatchesSessionSection(exercise({ dificultad: 'Niveles 1-3' }), 'tecnico_aparato1', 'Suelo', 'Nivel 5')).toBe(false)
  })

  it('rejects exercises labeled for another exact level inside a compatible range', () => {
    const levelOne = exercise({ contenido: 'Arco atrás — Nivel 1', dificultad: 'Niveles 1-3' })
    const levelThree = exercise({ contenido: 'Arco atrás — Nivel 3', dificultad: 'Niveles 1-3' })
    expect(exerciseMatchesSessionSection(levelOne, 'tecnico_aparato1', 'Suelo', 'Nivel 3')).toBe(false)
    expect(exerciseMatchesSessionSection(levelThree, 'tecnico_aparato1', 'Suelo', 'Nivel 3')).toBe(true)
  })

  it('shows feedback imported under its own category in the feedback block', () => {
    const feedback = exercise({ categoria: 'Retroalimentación y Feedback', contenido: 'Dos estrellas y un deseo', aparato: 'General' })
    expect(exerciseMatchesSessionSection(feedback, 'cierre_retroalimentacion', 'Retroalimentación (Feedback)', 'Nivel 1')).toBe(true)
    expect(exerciseMatchesSessionSection(feedback, 'cierre_elongacion', 'Elongación de Relajación', 'Nivel 1')).toBe(false)
  })

  it('accepts closure, physical and technical aliases from imported exercises', () => {
    expect(exerciseMatchesSessionSection(exercise({ categoria: 'Calma y cierre', contenido: 'Respiración y reflexión' }), 'cierre_retroalimentacion', 'Retroalimentación', 'Nivel 1')).toBe(true)
    expect(exerciseMatchesSessionSection(exercise({ categoria: 'Calma / Cierre', contenido: 'Elongación suave' }), 'cierre_elongacion', 'Elongación', 'Nivel 1')).toBe(true)
    expect(exerciseMatchesSessionSection(exercise({ categoria: 'Físico', contenido: 'Estabilización de core' }), 'prep_fisica_core', 'Zona Media', 'Nivel 1')).toBe(true)
    expect(exerciseMatchesSessionSection(exercise({ categoria: 'Habilidad', contenido: 'Parada de manos', dificultad: 'Principiante' }), 'tecnico_aparato1', 'Suelo', 'Nivel 1')).toBe(true)
  })
})

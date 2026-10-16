import {describe,expect,it} from 'vitest'
import {normalizeExerciseInput} from './exercise-normalization'

describe('exercise readiness metadata',()=>{
  it('keeps readiness fields as structured lists',()=>{
    expect(normalizeExerciseInput({nombre:'Rondada',patrones_fundamentales:['apoyo','rotación'],prerrequisitos:['vertical'],requisitos_fisicos:['estabilidad escapular'],nivel_impacto:'moderado',bilateralidad:'bilateral'})).toMatchObject({patrones_fundamentales:['apoyo','rotación'],prerrequisitos:['vertical'],requisitos_fisicos:['estabilidad escapular'],nivel_impacto:'moderado',bilateralidad:'bilateral'})
  })
  it('preserves feedback and technical subcategories when editing an exercise',()=>{
    expect(normalizeExerciseInput({nombre:'Dos estrellas y un deseo',categoria:'Retroalimentación y Feedback'}).categoria).toBe('Retroalimentación y Feedback')
    expect(normalizeExerciseInput({nombre:'Vertical',categoria:'Posición Básica'}).categoria).toBe('Posición Básica')
    expect(normalizeExerciseInput({nombre:'Circuito',categoria:'Prep. Física - Tarjeta Verde'}).categoria).toBe('Prep. Física - Tarjeta Verde')
  })
})

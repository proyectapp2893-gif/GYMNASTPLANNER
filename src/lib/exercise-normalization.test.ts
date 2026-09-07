import {describe,expect,it} from 'vitest'
import {normalizeExerciseInput} from './exercise-normalization'

describe('exercise readiness metadata',()=>{
  it('keeps readiness fields as structured lists',()=>{
    expect(normalizeExerciseInput({nombre:'Rondada',patrones_fundamentales:['apoyo','rotación'],prerrequisitos:['vertical'],requisitos_fisicos:['estabilidad escapular'],nivel_impacto:'moderado',bilateralidad:'bilateral'})).toMatchObject({patrones_fundamentales:['apoyo','rotación'],prerrequisitos:['vertical'],requisitos_fisicos:['estabilidad escapular'],nivel_impacto:'moderado',bilateralidad:'bilateral'})
  })
})

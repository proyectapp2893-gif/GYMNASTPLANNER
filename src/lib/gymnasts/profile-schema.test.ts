import { describe,expect,it } from 'vitest'
import { updateGymnastProfileSchema } from './profile-schema'

const valid={nombre:'Ana Pérez',fechaNacimiento:'2014-03-01',fechaIngreso:'2025-01-10',lateralidad:'diestra' as const,categoriaCompetitiva:'Nivel 4',diasEntrenamiento:['lunes','jueves'] as const,duracionSesionHabitualMin:180,objetivoTemporada:'Consolidar rutina',observaciones:''}

describe('updateGymnastProfileSchema',()=>{
  it('accepts a valid sports profile',()=>{expect(updateGymnastProfileSchema.safeParse(valid).success).toBe(true)})
  it('rejects sessions longer than the safe application limit',()=>{expect(updateGymnastProfileSchema.safeParse({...valid,duracionSesionHabitualMin:900}).success).toBe(false)})
  it('normalizes empty optional fields to null',()=>{const result=updateGymnastProfileSchema.parse({...valid,fechaIngreso:'',categoriaCompetitiva:''});expect(result.fechaIngreso).toBeNull();expect(result.categoriaCompetitiva).toBeNull()})
})

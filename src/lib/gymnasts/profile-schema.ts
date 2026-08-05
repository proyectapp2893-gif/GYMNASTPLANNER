import { z } from 'zod'

const optionalDate=z.union([z.string().date(),z.literal('')]).transform(value=>value||null)
const optionalText=(max:number)=>z.string().trim().max(max).transform(value=>value||null)

export const updateGymnastProfileSchema=z.object({
  nombre:z.string().trim().min(2,'El nombre es obligatorio').max(160),
  fechaNacimiento:optionalDate,
  fechaIngreso:optionalDate,
  lateralidad:z.enum(['diestra','zurda','ambidiestra','']).transform(value=>value||null),
  categoriaCompetitiva:optionalText(120),
  diasEntrenamiento:z.array(z.enum(['lunes','martes','miercoles','jueves','viernes','sabado','domingo'])).max(7),
  duracionSesionHabitualMin:z.union([z.number().int().min(1).max(720),z.null()]),
  objetivoTemporada:optionalText(1200),
  observaciones:optionalText(2000),
})

export type UpdateGymnastProfileInput=z.input<typeof updateGymnastProfileSchema>

import {z} from 'zod'

export const createProgressReviewSchema=z.object({
  periodStart:z.iso.date(),periodEnd:z.iso.date(),snapshot:z.record(z.string(),z.unknown()),
  achievements:z.string().trim().min(10).max(3000),developmentAreas:z.string().trim().min(10).max(3000),
  nextPriorities:z.array(z.string().trim().min(2).max(200)).min(1).max(10),athleteVoice:z.string().trim().max(2000).nullable(),
  familySummary:z.string().trim().min(10).max(3000).nullable(),visibleToFamily:z.boolean(),
}).refine(value=>value.periodEnd>=value.periodStart,{message:'El periodo de revisión no es válido'}).refine(value=>!value.visibleToFamily||Boolean(value.familySummary),{message:'La versión familiar necesita un resumen autorizado'})

import { z } from 'zod'

const nullableMetric = (min:number,max:number) => z.number().min(min).max(max).nullable()
const score = z.number().int().min(1).max(5)

export const athleteDevelopmentCommandSchema = z.discriminatedUnion('kind', [
  z.object({ kind:z.literal('stage'), stageId:z.string().uuid() }),
  z.object({
    kind:z.literal('measurement'), date:z.iso.date(), standingHeightCm:nullableMetric(30,250),
    sittingHeightCm:nullableMetric(20,180), armSpanCm:nullableMetric(30,260), weightKg:nullableMetric(5,250),
    protocol:z.string().trim().min(2).max(120), consentConfirmed:z.literal(true), notes:z.string().trim().max(2000).nullable(),
  }).refine(value=>[value.standingHeightCm,value.sittingHeightCm,value.armSpanCm,value.weightKg].some(value=>value!==null),{message:'Registra al menos una medición'})
    .refine(value=>value.standingHeightCm===null||value.sittingHeightCm===null||value.sittingHeightCm<value.standingHeightCm,{message:'La estatura sentada debe ser menor que la estatura de pie'}),
  z.object({
    kind:z.literal('checkin'), date:z.iso.date(), confidence:score, motivation:score, enjoyment:score,
    stress:score, readiness:score, reportedFear:z.boolean(), gymnastVoice:z.string().trim().max(2000).nullable(),
  }),
])

export type AthleteDevelopmentCommand=z.infer<typeof athleteDevelopmentCommandSchema>

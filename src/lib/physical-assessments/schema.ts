import { z } from 'zod'

export const physicalAssessmentSchema = z.object({
  batteryId: z.string().uuid().nullable().optional(),
  date: z.string().date(),
  notes: z.string().trim().max(1500).nullable(),
  results: z.array(z.object({
    testId: z.string().uuid(),
    value: z.number().finite().min(0),
    notes: z.string().trim().max(500).nullable(),
  })).min(1),
})

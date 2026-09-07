import { z } from 'zod'

const code = z.string().trim().min(2).max(80).regex(/^[a-z0-9_-]+$/)

export const createSportsGovernanceRecordSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('source'), code, title: z.string().trim().min(3).max(240),
    organization: z.string().trim().min(2).max(160), version: z.string().trim().max(80).nullable(),
    publicationYear: z.number().int().min(1900).max(2200).nullable(),
    validity: z.enum(['vigente','historica','pendiente_revision','retirada']),
    usageScope: z.enum(['solo_referencia','extractos_licenciados','uso_interno_completo']),
    sourceUrl: z.string().url().max(1000).nullable(), licenseNote: z.string().trim().min(3).max(2000),
  }),
  z.object({
    kind: z.literal('stage'), code, name: z.string().trim().min(2).max(160), order: z.number().int().min(1).max(100),
    description: z.string().trim().min(3).max(2000), referenceMinAge: z.number().min(0).max(100).nullable(),
    referenceMaxAge: z.number().min(0).max(100).nullable(), objectives: z.array(z.string().trim().min(1).max(160)).max(20),
  }).refine(value => value.referenceMaxAge === null || value.referenceMinAge === null || value.referenceMaxAge >= value.referenceMinAge, { message: 'El rango de edad no es válido' }),
  z.object({
    kind: z.literal('rule'), code, sourceId: z.string().uuid(), stageId: z.string().uuid().nullable(),
    title: z.string().trim().min(3).max(240), category: z.enum(['desarrollo','seguridad','carga','tecnica','recuperacion','bienestar','competencia','inclusion']),
    actionLevel: z.enum(['informativa','precaucion','bloqueo']), condition: z.record(z.string(), z.unknown()),
    recommendation: z.record(z.string(), z.unknown()), rationale: z.string().trim().min(10).max(3000),
    referencePages: z.string().trim().max(120).nullable(),
  }),
])

export const updateSportsRuleSchema = z.object({
  kind: z.literal('rule'), id: z.string().uuid(),
  status: z.enum(['borrador','en_revision','aprobada','retirada']),
})

export type CreateSportsGovernanceRecord = z.infer<typeof createSportsGovernanceRecordSchema>

import {z} from 'zod'

export const adaptationPlanCommandSchema=z.discriminatedUnion('kind',[
  z.object({kind:z.literal('create'),signals:z.array(z.object({code:z.string().min(2).max(80),level:z.enum(['observe','review']),title:z.string().max(200),detail:z.string().max(1000),recommendation:z.string().max(1000)})).max(20),decision:z.string().trim().min(10).max(2000),reviewDate:z.iso.date()}),
  z.object({kind:z.literal('close'),planId:z.string().uuid(),result:z.string().trim().min(10).max(2000)}),
])

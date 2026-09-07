import { describe, expect, it } from 'vitest'
import { createSportsGovernanceRecordSchema, updateSportsRuleSchema } from './schema'

describe('sports knowledge governance schemas', () => {
  it('requires explicit license limits for every source', () => {
    expect(createSportsGovernanceRecordSchema.safeParse({kind:'source',code:'ltad',title:'LTAD histórico',organization:'GymCan',version:'2008',publicationYear:2008,validity:'historica',usageScope:'solo_referencia',sourceUrl:'https://example.com/source.pdf',licenseNote:''}).success).toBe(false)
  })

  it('creates new rules as structured, traceable records', () => {
    expect(createSportsGovernanceRecordSchema.safeParse({kind:'rule',code:'growth_review',sourceId:'00000000-0000-4000-8000-000000000001',stageId:null,title:'Revisar crecimiento',category:'seguridad',actionLevel:'precaucion',condition:{growth:true},recommendation:{actions:['review']},rationale:'Fundamento suficientemente detallado.',referencePages:'10-12'}).success).toBe(true)
  })

  it('only accepts controlled rule states', () => {
    const base={kind:'rule',id:'00000000-0000-4000-8000-000000000001'}
    expect(updateSportsRuleSchema.safeParse({...base,status:'aprobada'}).success).toBe(true)
    expect(updateSportsRuleSchema.safeParse({...base,status:'publicada'}).success).toBe(false)
  })
})

import {describe,expect,it} from 'vitest'
import {athleteDevelopmentCommandSchema} from './schema'

describe('athlete development commands',()=>{
  it('requires explicit measurement consent',()=>{expect(athleteDevelopmentCommandSchema.safeParse({kind:'measurement',date:'2026-09-04',standingHeightCm:140,sittingHeightCm:null,armSpanCm:null,weightKg:null,protocol:'estándar',consentConfirmed:false,notes:null}).success).toBe(false)})
  it('requires at least one measurement',()=>{expect(athleteDevelopmentCommandSchema.safeParse({kind:'measurement',date:'2026-09-04',standingHeightCm:null,sittingHeightCm:null,armSpanCm:null,weightKg:null,protocol:'estándar',consentConfirmed:true,notes:null}).success).toBe(false)})
  it('accepts a complete athlete check-in',()=>{expect(athleteDevelopmentCommandSchema.safeParse({kind:'checkin',date:'2026-09-04',confidence:4,motivation:5,enjoyment:4,stress:2,readiness:4,reportedFear:false,gymnastVoice:'Me sentí segura.'}).success).toBe(true)})
})

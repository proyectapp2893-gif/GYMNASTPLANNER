import {describe,expect,it} from 'vitest'
import {assessSessionReadiness,requiresCoachReview,type ReadinessContext} from './engine'

const context:ReadinessContext={stageName:'Construcción de habilidades',stageReviewedAt:'2026-09-01',latestCheckin:{date:'2026-09-04',readiness:4,stress:2,confidence:4,reportedFear:false},restrictions:[],masteredSkills:['Vertical']}

describe('athlete readiness engine',()=>{
  it('accepts verified prerequisites without review findings',()=>{const findings=assessSessionReadiness(context,[{id:'1',name:'Rondada',category:'Técnico',impact:'moderado',prerequisites:['Vertical'],physicalRequirements:[],fundamentalPatterns:[]}]);expect(requiresCoachReview(findings)).toBe(false)})
  it('requires review when a prerequisite is not verified',()=>{const findings=assessSessionReadiness(context,[{id:'1',name:'Flic flac',category:'Técnico',impact:'alto',prerequisites:['Rondada'],physicalRequirements:[],fundamentalPatterns:[]}]);expect(findings.some(item=>item.code==='prerequisite_unverified')).toBe(true)})
  it('elevates athlete voice before exercise selection',()=>{const findings=assessSessionReadiness({...context,latestCheckin:{...context.latestCheckin!,reportedFear:true}},[]);expect(findings[0]).toMatchObject({code:'fear_reported',level:'review'})})
})

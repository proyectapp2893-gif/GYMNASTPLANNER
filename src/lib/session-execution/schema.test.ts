import { describe,expect,it } from 'vitest'
import { calculateInternalLoad,sessionExecutionSchema } from './schema'
describe('session execution',()=>{
  it('calculates transparent internal load',()=>expect(calculateInternalLoad(90,7.5)).toBe(675))
  it('rejects RPE outside 0-10',()=>expect(sessionExecutionSchema.safeParse({status:'completada',actualDurationMin:90,sessionRpe:11,landings:0,actualIntensity:70,attendanceStatus:'confirmada',participationPercent:100,energy:4,sleepQuality:4,fatigue:2,readiness:4,discomfort:false,wellnessNotes:null,blocks:[],exercises:[]}).success).toBe(false))
  it('requires zero participation for an absence',()=>expect(sessionExecutionSchema.safeParse({status:'cancelada',actualDurationMin:0,sessionRpe:null,landings:0,actualIntensity:null,attendanceStatus:'ausente',participationPercent:50,attendanceReason:null,energy:null,sleepQuality:null,fatigue:null,readiness:null,discomfort:false,wellnessNotes:null,blocks:[],exercises:[]}).success).toBe(false))
  it('requires a reason when a session is reprogrammed',()=>expect(sessionExecutionSchema.safeParse({status:'reprogramada',actualDurationMin:0,sessionRpe:null,landings:0,actualIntensity:null,attendanceStatus:'reprogramada',participationPercent:0,attendanceReason:null,energy:null,sleepQuality:null,fatigue:null,readiness:null,discomfort:false,wellnessNotes:null,blocks:[],exercises:[]}).success).toBe(false))
})

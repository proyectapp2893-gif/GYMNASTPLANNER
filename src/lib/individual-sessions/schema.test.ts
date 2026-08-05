import { describe,expect,it } from 'vitest'
import { calculatePlannedDuration,phaseCodes,saveIndividualSessionSchema,validatePublishableSession } from './schema'

const blocks=phaseCodes.map((phase,index)=>({phase,title:`Fase ${index+1}`,objective:'Objetivo pedagógico',plannedDurationMin:10,content:{},exercises:[],origin:'individual' as const}))
const session={date:'2026-08-05',startTime:'16:00',availableDurationMin:60,mainObjective:'Consolidar alineación',priority:'Técnica',plannedIntensity:60,plannedVolume:50,notes:null,blocks}

describe('individual session validation',()=>{
  it('calculates duration from all blocks',()=>{expect(calculatePlannedDuration(blocks)).toBe(50)})
  it('requires the five distinct pedagogical phases',()=>{const invalid={...session,blocks:blocks.map(block=>({...block,phase:'tecnico'}))};expect(saveIndividualSessionSchema.safeParse(invalid).success).toBe(false)})
  it('prevents publishing over the available time',()=>{expect(validatePublishableSession({...session,availableDurationMin:40})).toContain('La duración planificada supera el tiempo disponible.')})
  it('requires an objective and duration in every phase before publishing',()=>{const invalid={...session,blocks:[...blocks.slice(0,4),{...blocks[4],objective:'',plannedDurationMin:0}]};expect(validatePublishableSession(invalid).length).toBe(2)})
  it('requires a dose before publishing a prescribed exercise',()=>{const invalid={...session,blocks:[{...blocks[0],exercises:[{instanceId:'fd8770bc-36d4-4e60-9025-860a20f590af',exerciseId:'ac787639-24c1-41d8-b0c1-669e93da7418',name:'Hollow hold',series:null,repetitions:null,timeSeconds:null}]},...blocks.slice(1)]};expect(validatePublishableSession(invalid)).toContain('Hollow hold necesita series, repeticiones o tiempo.')})
})

import {describe,expect,it} from 'vitest'
import {summarizePlanningExecution} from './comparison'
describe('planning execution comparison',()=>{
  it('compares planning with execution',()=>expect(summarizePlanningExecution([{planned:120,actual:105,sourceId:'general',status:'completada_con_ajustes'},{planned:90,actual:null,sourceId:null,status:'reprogramada'}])).toEqual({plannedMinutes:210,actualMinutes:105,differenceMinutes:-105,completionPercent:50,adaptedSessions:1,individualSessions:1,missedSessions:1}))
  it('does not invent a percentage without sessions',()=>expect(summarizePlanningExecution([]).completionPercent).toBeNull())
})

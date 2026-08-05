export type ComparableSession={planned:number|null;actual:number|null;sourceId:string|null;status:string}

export function summarizePlanningExecution(sessions:ComparableSession[]){
  const plannedMinutes=sessions.reduce((sum,item)=>sum+(item.planned||0),0)
  const actualMinutes=sessions.reduce((sum,item)=>sum+(item.actual||0),0)
  const completed=sessions.filter(item=>item.status==='completada'||item.status==='completada_con_ajustes').length
  return {plannedMinutes,actualMinutes,differenceMinutes:actualMinutes-plannedMinutes,completionPercent:sessions.length?Math.round(completed/sessions.length*100):null,adaptedSessions:sessions.filter(item=>Boolean(item.sourceId)).length,individualSessions:sessions.filter(item=>!item.sourceId).length,missedSessions:sessions.filter(item=>['cancelada','reprogramada'].includes(item.status)).length}
}

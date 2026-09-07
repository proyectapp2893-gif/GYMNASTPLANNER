export type LoadObservation={date:string;plannedDuration:number|null;actualDuration:number|null;plannedIntensity:number|null;actualIntensity:number|null;rpe:number|null;internalLoad:number|null}
export type WellnessObservation={date:string;fatigue:number|null;readiness:number|null;discomfort:boolean}
export type MonitoringSignal={code:string;level:'observe'|'review';title:string;detail:string;recommendation:string}

export function buildMonitoringSignals(input:{loads:LoadObservation[];wellness:WellnessObservation[];currentLoad:number;previousLoad:number;loadIncreaseThreshold:number;highRpeThreshold:number;highFatigueThreshold:number;lowReadinessThreshold?:number;intensityDeviationThreshold?:number;durationDeviationPercent?:number;recentSessionWindow?:number}):MonitoringSignal[]{
  const signals:MonitoringSignal[]=[]
  if(input.previousLoad>0){const variation=Math.round(((input.currentLoad-input.previousLoad)/input.previousLoad)*1000)/10;if(variation>input.loadIncreaseThreshold)signals.push(signal('load_increase','review','Aumento de carga semanal',`La carga aumentó ${variation}% frente a la semana anterior.`,`Revisar volumen, impacto y recuperación antes de mantener el incremento.`))}
  const recentLoads=[...input.loads].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,input.recentSessionWindow??3)
  if(recentLoads.some(row=>row.rpe!==null&&row.rpe>=input.highRpeThreshold))signals.push(signal('high_rpe','review','RPE elevado reciente','Al menos una de las últimas tres sesiones alcanzó el umbral configurado.','Conversar sobre esfuerzo percibido y ajustar la siguiente exposición si corresponde.'))
  const intensityDeviation=input.intensityDeviationThreshold??15,durationFactor=1+(input.durationDeviationPercent??20)/100
  if(recentLoads.some(row=>row.plannedIntensity!==null&&row.actualIntensity!==null&&row.actualIntensity-row.plannedIntensity>=intensityDeviation))signals.push(signal('intensity_deviation','review','Intensidad real superior a la planificada',`Se observó una desviación de ${intensityDeviation} puntos o más.`,'Revisar dosificación, pausas y expectativas de ejecución.'))
  if(recentLoads.some(row=>row.plannedDuration&&row.actualDuration!==null&&row.actualDuration>row.plannedDuration*durationFactor))signals.push(signal('duration_deviation','observe','Duración mayor a la prevista',`Una sesión reciente superó en más de ${input.durationDeviationPercent??20}% la duración planificada.`,'Comprobar transiciones, pausas y cantidad de tareas.'))
  const recentWellness=[...input.wellness].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,input.recentSessionWindow??3)
  if(recentWellness.some(row=>row.discomfort))signals.push(signal('discomfort','review','Molestia reportada','Existe una molestia reciente registrada por la gimnasta o el entrenador.','No interpretar como diagnóstico; revisar adaptaciones y derivar al profesional correspondiente cuando aplique.'))
  if(recentWellness.some(row=>row.fatigue!==null&&row.fatigue>=input.highFatigueThreshold))signals.push(signal('fatigue','review','Fatiga elevada','La fatiga reciente alcanzó el umbral del club.','Revisar disposición, recuperación y demanda de la siguiente sesión.'))
  const lowReadiness=input.lowReadinessThreshold??2
  if(recentWellness.some(row=>row.readiness!==null&&row.readiness<=lowReadiness))signals.push(signal('low_readiness','review','Baja disposición para entrenar',`Se registró disposición de ${lowReadiness}/5 o menor.`,'Escuchar a la gimnasta y adaptar objetivo, intensidad o participación.'))
  return signals
}

function signal(code:string,level:'observe'|'review',title:string,detail:string,recommendation:string):MonitoringSignal{return{code,level,title,detail,recommendation}}

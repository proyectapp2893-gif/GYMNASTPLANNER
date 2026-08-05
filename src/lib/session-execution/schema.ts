import { z } from 'zod'

export const sessionExecutionSchema=z.object({
  status:z.enum(['en_ejecucion','completada','completada_con_ajustes','cancelada','reprogramada']),
  actualDurationMin:z.number().int().min(0).max(720),
  sessionRpe:z.number().min(0).max(10).nullable(),
  landings:z.number().int().min(0).max(10000).default(0),
  actualIntensity:z.number().min(0).max(100).nullable(),
  attendanceStatus:z.enum(['confirmada','ausente','ausencia_justificada','parcial','reprogramada','fuera_del_plan']),
  participationPercent:z.number().min(0).max(100).nullable(),
  attendanceReason:z.string().trim().max(500).nullable().default(null),
  energy:z.number().int().min(1).max(5).nullable(),sleepQuality:z.number().int().min(1).max(5).nullable(),fatigue:z.number().int().min(1).max(5).nullable(),readiness:z.number().int().min(1).max(5).nullable(),
  discomfort:z.boolean(),wellnessNotes:z.string().trim().max(1500).nullable(),
  blocks:z.array(z.object({id:z.string().uuid(),actualDurationMin:z.number().int().min(0).max(360),completed:z.boolean()})).max(5),
  exercises:z.array(z.object({id:z.string().uuid(),attempts:z.number().int().min(0).max(10000),actualRepetitions:z.number().min(0).max(10000).nullable(),notes:z.string().trim().max(1000).nullable()})).max(500),
}).superRefine((value,context)=>{
  if(['ausente','ausencia_justificada','reprogramada'].includes(value.attendanceStatus)&&value.participationPercent!==0)context.addIssue({code:'custom',path:['participationPercent'],message:'Una ausencia o reprogramación debe registrar 0% de participación.'})
  if(value.attendanceStatus==='parcial'&&(value.participationPercent===null||value.participationPercent<=0||value.participationPercent>=100))context.addIssue({code:'custom',path:['participationPercent'],message:'Una sesión parcial debe estar entre 1% y 99%.'})
  if(['ausencia_justificada','reprogramada'].includes(value.attendanceStatus)&&!value.attendanceReason)context.addIssue({code:'custom',path:['attendanceReason'],message:'Registra el motivo de la justificación o reprogramación.'})
})

export function calculateInternalLoad(duration:number,rpe:number|null){return rpe===null?null:Math.round(duration*rpe*10)/10}

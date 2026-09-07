import { z } from 'zod'

export const phaseCodes=['encuadre','calentamiento','tecnico','fisico','vuelta_calma'] as const
export type SessionPhaseCode=(typeof phaseCodes)[number]

export const exercisePrescriptionSchema=z.object({
  instanceId:z.string().uuid(),
  exerciseId:z.string().uuid(),
  name:z.string().trim().min(1).max(160),
  apparatus:z.string().trim().max(120).nullable().optional(),
  series:z.number().min(0).max(100).nullable().optional(),
  repetitions:z.number().min(0).max(10000).nullable().optional(),
  timeSeconds:z.number().min(0).max(86400).nullable().optional(),
  load:z.number().min(0).max(100000).nullable().optional(),
  loadUnit:z.string().trim().max(30).nullable().optional(),
  pauseSeconds:z.number().min(0).max(3600).nullable().optional(),
  tempo:z.string().trim().max(50).nullable().optional(),
  expectedRpe:z.number().min(0).max(10).nullable().optional(),
  distanceMeters:z.number().min(0).max(100000).nullable().optional(),
  dominantCapacity:z.string().trim().max(120).nullable().optional(),
  movementPattern:z.string().trim().max(120).nullable().optional(),
  bodySegment:z.string().trim().max(120).nullable().optional(),
  movementPlane:z.string().trim().max(120).nullable().optional(),
  energySystem:z.string().trim().max(120).nullable().optional(),
  apparatusTransfer:z.string().trim().max(300).nullable().optional(),
  difficulty:z.string().trim().max(120).nullable().optional(),
  commonErrors:z.string().trim().max(800).nullable().optional(),
  progression:z.string().trim().max(800).nullable().optional(),
  regression:z.string().trim().max(800).nullable().optional(),
  instructions:z.string().trim().max(1500).nullable().optional(),
}).superRefine((value,context)=>{
  if(value.load!==null&&value.load!==undefined&&!value.loadUnit)context.addIssue({code:'custom',message:'Una carga necesita unidad',path:['loadUnit']})
})

export const sessionBlockSchema=z.object({
  phase:z.enum(phaseCodes),
  title:z.string().trim().min(2).max(160),
  objective:z.string().trim().max(1000),
  plannedDurationMin:z.number().int().min(0).max(360),
  content:z.record(z.string(),z.unknown()).default({}),
  exercises:z.array(exercisePrescriptionSchema).max(100).default([]),
  origin:z.enum(['heredado','adaptado','individual','suspendido','reemplazado']).default('individual'),
})

export const saveIndividualSessionSchema=z.object({
  sessionId:z.string().uuid().optional(),
  sourceSessionId:z.string().uuid().nullable().optional(),
  date:z.string().date(),
  startTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  availableDurationMin:z.number().int().min(1).max(720),
  mainObjective:z.string().trim().min(3).max(1000),
  priority:z.string().trim().max(120).nullable().optional(),
  plannedIntensity:z.number().min(0).max(100).nullable().optional(),
  plannedVolume:z.number().min(0).max(100).nullable().optional(),
  notes:z.string().trim().max(2000).nullable().optional(),
  readinessOverrideReason:z.string().trim().min(10).max(1000).nullable().optional(),
  blocks:z.array(sessionBlockSchema).length(5),
}).superRefine((value,context)=>{
  const unique=new Set(value.blocks.map(block=>block.phase))
  if(unique.size!==phaseCodes.length)context.addIssue({code:'custom',message:'La sesión debe contener las cinco fases pedagógicas',path:['blocks']})
})

export type SaveIndividualSessionInput=z.infer<typeof saveIndividualSessionSchema>

export function calculatePlannedDuration(blocks:Array<{plannedDurationMin:number}>){
  return blocks.reduce((total,block)=>total+block.plannedDurationMin,0)
}

export function validatePublishableSession(input:SaveIndividualSessionInput){
  const issues:string[]=[]
  if(calculatePlannedDuration(input.blocks)<=0)issues.push('La duración total debe ser mayor que cero.')
  for(const block of input.blocks){
    if(block.plannedDurationMin<=0)issues.push(`La fase ${block.title} debe tener duración.`)
    if(!block.objective.trim())issues.push(`La fase ${block.title} debe tener un objetivo.`)
    for(const exercise of block.exercises){
      const hasDose=[exercise.series,exercise.repetitions,exercise.timeSeconds].some(value=>value!==null&&value!==undefined&&value>0)
      if(!hasDose)issues.push(`${exercise.name} necesita series, repeticiones o tiempo.`)
      if(exercise.load!==null&&exercise.load!==undefined&&!exercise.loadUnit)issues.push(`${exercise.name} tiene carga sin unidad.`)
    }
  }
  if(calculatePlannedDuration(input.blocks)>input.availableDurationMin)issues.push('La duración planificada supera el tiempo disponible.')
  return issues
}

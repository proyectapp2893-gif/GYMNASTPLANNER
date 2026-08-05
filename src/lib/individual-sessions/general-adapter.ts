import type { SaveIndividualSessionInput, SessionPhaseCode } from './schema'

type LegacyExercise = {
  id?: unknown
  contenido?: unknown
  nombre?: unknown
  aparato?: unknown
  descripcion?: unknown
}

type AdaptedBlock = SaveIndividualSessionInput['blocks'][number]

const definitions: Array<{
  phase: SessionPhaseCode
  title: string
  objective: string
  duration: number
  keys: string[]
}> = [
  { phase:'encuadre',title:'1. Encuadre inicial',objective:'Explicar el objetivo heredado, los criterios de éxito y los recordatorios de seguridad.',duration:10,keys:[] },
  { phase:'calentamiento',title:'2. Calentamiento general y específico',objective:'Preparar a la gimnasta para los contenidos previstos en la sesión general.',duration:20,keys:['calentamiento_general','calentamiento_especifico','calentamiento'] },
  { phase:'tecnico',title:'3. Trabajo técnico',objective:'Desarrollar los contenidos técnicos y secuencias definidos para el grupo.',duration:50,keys:['tecnico_aparato1','tecnico_aparato2','tecnico','rutinas_mitades','rutinas_completas','rutinas'] },
  { phase:'fisico',title:'4. Trabajo físico complementario',objective:'Aplicar la preparación física y la flexibilidad relacionadas con el objetivo técnico.',duration:25,keys:['prep_fisica_core','prep_fisica_superior','prep_fisica_inferior','prep-fisica','flexibilidad_activa','flexibilidad_pasiva','flexibilidad'] },
  { phase:'vuelta_calma',title:'5. Vuelta a la calma',objective:'Reducir progresivamente la intensidad y cerrar con retroalimentación.',duration:15,keys:['cierre_elongacion','cierre_retroalimentacion','cierre'] },
]

export function adaptGeneralSession(input:{
  id:string
  date:string
  objective:string
  exercises:unknown
  availableDurationMin?:number
},createId:()=>string=()=>crypto.randomUUID()):SaveIndividualSessionInput {
  const source=isRecord(input.exercises)?input.exercises:{}
  const blocks=definitions.map<AdaptedBlock>(definition=>({
    phase:definition.phase,
    title:definition.title,
    objective:definition.objective,
    plannedDurationMin:definition.duration,
    content:{sourceKeys:definition.keys},
    origin:'heredado',
    exercises:deduplicate(definition.keys.flatMap(key=>toArray(source[key]))).flatMap(item=>{
      const exercise=asLegacyExercise(item)
      const exerciseId=typeof exercise.id==='string'?exercise.id:''
      const name=typeof exercise.contenido==='string'?exercise.contenido:typeof exercise.nombre==='string'?exercise.nombre:''
      if(!exerciseId||!name)return []
      return [{
        instanceId:createId(),exerciseId,name,
        apparatus:typeof exercise.aparato==='string'?exercise.aparato:null,
        series:null,repetitions:null,timeSeconds:null,load:null,loadUnit:null,pauseSeconds:null,tempo:null,expectedRpe:null,distanceMeters:null,
        dominantCapacity:null,movementPattern:null,bodySegment:null,movementPlane:null,energySystem:null,apparatusTransfer:null,difficulty:null,
        commonErrors:null,progression:null,regression:null,instructions:typeof exercise.descripcion==='string'?exercise.descripcion:null,
      }]
    }),
  }))
  return {
    sourceSessionId:input.id,date:input.date,availableDurationMin:input.availableDurationMin||120,
    mainObjective:input.objective,priority:null,plannedIntensity:null,plannedVolume:null,notes:null,startTime:null,blocks,
  }
}

function isRecord(value:unknown):value is Record<string,unknown>{return typeof value==='object'&&value!==null&&!Array.isArray(value)}
function asLegacyExercise(value:unknown):LegacyExercise{return isRecord(value)?value:{}}
function toArray(value:unknown):unknown[]{return Array.isArray(value)?value:[]}
function deduplicate(values:unknown[]){const seen=new Set<string>();return values.filter(value=>{const item=asLegacyExercise(value);const id=typeof item.id==='string'?item.id:'';if(!id||seen.has(id))return false;seen.add(id);return true})}

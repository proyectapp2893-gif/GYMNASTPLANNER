import {describe,expect,it} from 'vitest'
import {restrictionSchema,restrictionUpdateSchema} from './restrictions/schema'
import {physicalAssessmentSchema} from './physical-assessments/schema'
import {evidenceConfirmSchema,evidenceUploadSchema,MAX_EVIDENCE_BYTES} from './evidence/schema'
import {goalSchema} from './goals/schema'
import {progressionSchema,technicalErrorSchema} from './technical-tracking/schema'
import {aiDecisionSchema,aiSuggestionSchema} from './ai-suggestions/schema'

const uuid='fd8770bc-36d4-4e60-9025-860a20f590af'
describe('validaciones críticas del módulo individual',()=>{
  it('rechaza restricciones con fechas invertidas',()=>expect(restrictionSchema.safeParse({bodyArea:'Muñeca',reportedIntensity:4,startDate:'2026-08-10',endDate:'2026-08-09',temporaryAdaptations:'Evitar apoyo',notes:null}).success).toBe(false))
  it('exige identificar quién autorizó el retorno',()=>expect(restrictionUpdateSchema.safeParse({status:'finalizada',returnAuthorized:true,authorizedBy:null}).success).toBe(false))
  it('exige resultados no negativos en evaluaciones físicas',()=>expect(physicalAssessmentSchema.safeParse({date:'2026-08-04',notes:null,results:[{testId:uuid,value:-1,notes:null}]}).success).toBe(false))
  it('rechaza archivos que superan el límite configurable',()=>expect(evidenceUploadSchema.safeParse({fileName:'video.mp4',mimeType:'video/mp4',sizeBytes:MAX_EVIDENCE_BYTES+1}).success).toBe(false))
  it('solo admite rutas y metadatos de evidencia coherentes',()=>expect(evidenceConfirmSchema.safeParse({storagePath:'club/athlete/video.mp4',mimeType:'application/pdf',sizeBytes:100,sessionId:null,elementId:null,moment:'antes',comment:null,privacy:'privado',representativeFrameSeconds:null}).success).toBe(false))
  it('mantiene el avance de objetivos entre cero y cien',()=>expect(goalSchema.safeParse({typeItemId:null,description:'Mejorar estabilidad',startDate:'2026-08-04',targetDate:'2026-09-04',indicator:null,initialValue:null,expectedValue:null,progressPercent:101,status:'en_progreso',priority:3,notes:null}).success).toBe(false))
  it('no aprueba una progresión solo por repeticiones',()=>expect(progressionSchema.safeParse({stepId:uuid,status:'aprobado',startDate:'2026-08-01',masteryDate:'2026-08-04',technicalQuality:null,safety:null,consistency:null,understanding:null,bodyControl:null,correctExecutions:20,notes:null}).success).toBe(false))
  it('valida severidad y tendencia de errores técnicos',()=>expect(technicalErrorSchema.safeParse({elementId:uuid,errorItemId:uuid,date:'2026-08-04',movementPhase:null,frequency:null,severity:6,possibleCause:null,correction:null,verbalCue:null,subsequentResult:null,trend:'nuevo'}).success).toBe(false))
  it('exige fundamento explicable en propuestas de IA',()=>expect(aiSuggestionSchema.safeParse({type:'progresion',context:{},originalProposal:{},editedProposal:null,rationale:'corto',model:null}).success).toBe(false))
  it('exige motivo en toda aprobación o rechazo de IA',()=>expect(aiDecisionSchema.safeParse({decision:'aprobar',editedProposal:null,reason:''}).success).toBe(false))
})

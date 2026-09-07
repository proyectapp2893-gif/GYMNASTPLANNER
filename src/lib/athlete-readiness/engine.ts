export type ReadinessExercise={id:string;name:string;category:string|null;impact:'bajo'|'moderado'|'alto'|null;prerequisites:string[];physicalRequirements:string[];fundamentalPatterns:string[]}
export type ReadinessContext={stageName:string|null;stageReviewedAt:string|null;latestCheckin:{date:string;readiness:number;stress:number;confidence:number;reportedFear:boolean}|null;restrictions:Array<{bodyArea:string;adaptations:string|null}>;masteredSkills:string[]}
export type ReadinessFinding={code:string;level:'info'|'review';title:string;detail:string;exerciseId:string|null}

export function assessSessionReadiness(context:ReadinessContext,exercises:ReadinessExercise[]):ReadinessFinding[]{
  const findings:ReadinessFinding[]=[]
  if(!context.stageName)findings.push({code:'stage_missing',level:'info',title:'Etapa de desarrollo pendiente',detail:'Confirma la etapa individual antes de utilizarla para adaptar progresiones.',exerciseId:null})
  const checkin=context.latestCheckin
  if(checkin?.reportedFear)findings.push({code:'fear_reported',level:'review',title:'Miedo o inseguridad reportada',detail:'Conversa con la gimnasta y adapta el objetivo antes de publicar.',exerciseId:null})
  if(checkin&&(checkin.readiness<=2||checkin.stress>=4))findings.push({code:'low_readiness',level:'review',title:'Disposición requiere revisión',detail:`Último registro: disposición ${checkin.readiness}/5 y estrés ${checkin.stress}/5.`,exerciseId:null})
  const mastered=new Set(context.masteredSkills.map(normalize))
  for(const exercise of exercises){
    const missing=exercise.prerequisites.filter(item=>!mastered.has(normalize(item)))
    if(missing.length)findings.push({code:'prerequisite_unverified',level:'review',title:`Prerrequisitos por verificar: ${exercise.name}`,detail:missing.join(', '),exerciseId:exercise.id})
    if(exercise.impact==='alto'&&exercise.prerequisites.length===0)findings.push({code:'high_impact_unclassified',level:'review',title:`Impacto alto sin prerrequisitos: ${exercise.name}`,detail:'Clasifica los prerrequisitos o justifica la decisión antes de publicar.',exerciseId:exercise.id})
    const haystack=normalize([exercise.name,...exercise.physicalRequirements,...exercise.fundamentalPatterns].join(' '))
    for(const restriction of context.restrictions){if(matchesBodyArea(haystack,restriction.bodyArea))findings.push({code:'restriction_match',level:'review',title:`Revisar restricción en ${restriction.bodyArea}`,detail:`${exercise.name}${restriction.adaptations?`. Adaptación registrada: ${restriction.adaptations}`:''}`,exerciseId:exercise.id})}
  }
  return dedupe(findings)
}

export function requiresCoachReview(findings:ReadinessFinding[]){return findings.some(item=>item.level==='review')}
const normalize=(value:string)=>value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()
function matchesBodyArea(text:string,area:string){const normalized=normalize(area);const terms=normalized.split(/[^a-z0-9]+/).filter(term=>term.length>=4);return terms.some(term=>text.includes(term))}
function dedupe(findings:ReadinessFinding[]){const seen=new Set<string>();return findings.filter(item=>{const key=`${item.code}:${item.exerciseId||''}:${item.title}`;if(seen.has(key))return false;seen.add(key);return true})}

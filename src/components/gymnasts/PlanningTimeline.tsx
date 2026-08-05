import {CalendarRange,CheckCircle2,GitCompareArrows} from 'lucide-react'
import {summarizePlanningExecution} from '../../lib/individual-planning/comparison'

type Meso={id:string;name:string;start:string;end:string;objective:string;volume:number|null;intensity:number|null;technical:string|null;physical:string|null}
type Micro={id:string;mesoId:string;week:number;type:string|null;start:string;end:string;objective:string;volume:number|null;intensity:number|null;deload:boolean;status:string}
type Session={id:string;date:string;objective:string;status:string;planned:number|null;actual:number|null;sourceId:string|null}

export default function PlanningTimeline({mesocycles,microcycles,sessions}:{mesocycles:Meso[];microcycles:Micro[];sessions:Session[]}){
  const summary=summarizePlanningExecution(sessions)
  return <section className="space-y-5">
    <div className="flex items-center gap-2"><CalendarRange className="h-5 w-5 text-indigo-600"/><h3 className="text-lg font-black">Línea de tiempo y cumplimiento</h3></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Summary label="Cumplimiento" value={summary.completionPercent===null?'Sin sesiones':`${summary.completionPercent}%`} note={`${summary.missedSessions} canceladas o reprogramadas`}/>
      <Summary label="Volumen temporal" value={`${summary.actualMinutes} / ${summary.plannedMinutes} min`} note={`${summary.differenceMinutes>=0?'+':''}${summary.differenceMinutes} min frente al plan`}/>
      <Summary label="Adaptadas del general" value={String(summary.adaptedSessions)} note="Con trazabilidad de origen"/>
      <Summary label="Creadas individualmente" value={String(summary.individualSessions)} note="Sin sesión general de origen"/>
    </div>
    {mesocycles.map(meso=><article key={meso.id} className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-black uppercase text-indigo-600">{meso.start} — {meso.end}</p><h4 className="text-xl font-black">{meso.name}</h4><p className="text-sm text-slate-600">{meso.objective}</p></div><div className="flex gap-2 text-xs font-bold"><span className="rounded-full bg-blue-50 px-3 py-1">Vol. {meso.volume??'—'}</span><span className="rounded-full bg-rose-50 px-3 py-1">Int. {meso.intensity??'—'}</span></div></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{microcycles.filter(x=>x.mesoId===meso.id).map(micro=>{const weekSessions=sessions.filter(s=>s.date>=micro.start&&s.date<=micro.end);return <div key={micro.id} className={`rounded-xl border p-4 ${micro.deload?'border-emerald-200 bg-emerald-50':'bg-slate-50'}`}><div className="flex justify-between"><b>Semana {micro.week}</b><span className="text-xs font-bold">{micro.status}</span></div><p className="mt-1 text-xs text-slate-500">{micro.start} — {micro.end}{micro.deload?' · descarga':''}</p><p className="mt-2 text-sm">{micro.objective}</p><div className="mt-3 space-y-2">{weekSessions.map(session=><div key={session.id} className="rounded-lg bg-white p-2 text-xs"><p className="font-bold">{session.date} · {session.objective}</p><p className="mt-1 text-slate-500">{session.sourceId?<><GitCompareArrows className="inline h-3 w-3"/> Adaptada del plan general</>:'Creada individualmente'} · {session.status}</p><p>{session.planned??'—'} min planificados → <b>{session.actual??'pendiente'} min realizados</b>{session.actual!==null&&session.planned!==null&&<span> ({session.actual-session.planned>=0?'+':''}{session.actual-session.planned})</span>}</p></div>)}</div>{weekSessions.some(x=>x.status.startsWith('completada'))&&<p className="mt-3 text-xs font-bold text-emerald-700"><CheckCircle2 className="inline h-3 w-3"/> Con ejecución registrada</p>}</div>})}</div></article>)}
  </section>
}

function Summary({label,value,note}:{label:string;value:string;note:string}){return <article className="rounded-2xl border bg-white p-4"><p className="text-xs font-black uppercase text-slate-500">{label}</p><p className="mt-1 text-xl font-black text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></article>}

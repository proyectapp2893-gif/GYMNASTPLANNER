'use client'

import {useState} from 'react'
import {useRouter} from 'next/navigation'
import {Activity,HeartHandshake,Ruler,Save,ShieldCheck} from 'lucide-react'

type Stage={id:string;code:string;name:string;order:number;description:string;minAge:number|null;maxAge:number|null;objectives:string[]}
type Measurement={id:string;date:string;standingHeightCm:number|null;sittingHeightCm:number|null;armSpanCm:number|null;weightKg:number|null;protocol:string;notes:string|null}
type Checkin={id:string;date:string;confidence:number;motivation:number;enjoyment:number;stress:number;readiness:number;reportedFear:boolean;gymnastVoice:string|null}
type Props={athleteId:string;initialData:{selectedStageId:string|null;reviewedAt:string|null;stages:Stage[];measurements:Measurement[];checkins:Checkin[];growthObservation:{status:string;days:number|null;changeCm:number|null;annualizedCm:number|null;message:string}}}

const today=()=>new Date().toISOString().slice(0,10)
const field='mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'

export default function AthleteDevelopmentProfile({athleteId,initialData}:Props){
  const router=useRouter()
  const [stageId,setStageId]=useState(initialData.selectedStageId||'')
  const [busy,setBusy]=useState('')
  const [message,setMessage]=useState('')
  const selected=initialData.stages.find(stage=>stage.id===stageId)

  async function send(kind:string,payload:Record<string,unknown>){
    setBusy(kind);setMessage('')
    const response=await fetch(`/api/gimnastas/${athleteId}/desarrollo`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,...payload})})
    const result=await response.json().catch(()=>({}))
    setBusy('')
    if(!response.ok){setMessage(String(result.error||'No fue posible guardar'));return false}
    setMessage('Registro guardado correctamente.');router.refresh();return true
  }

  async function saveMeasurement(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();const form=new FormData(event.currentTarget)
    const metric=(name:string)=>form.get(name)?Number(form.get(name)):null
    const ok=await send('measurement',{date:String(form.get('date')),standingHeightCm:metric('standingHeightCm'),sittingHeightCm:metric('sittingHeightCm'),armSpanCm:metric('armSpanCm'),weightKg:metric('weightKg'),protocol:String(form.get('protocol')),consentConfirmed:form.get('consent')==='on',notes:String(form.get('notes')||'').trim()||null})
    if(ok)event.currentTarget.reset()
  }
  async function saveCheckin(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();const form=new FormData(event.currentTarget)
    const ok=await send('checkin',{date:String(form.get('date')),confidence:Number(form.get('confidence')),motivation:Number(form.get('motivation')),enjoyment:Number(form.get('enjoyment')),stress:Number(form.get('stress')),readiness:Number(form.get('readiness')),reportedFear:form.get('reportedFear')==='on',gymnastVoice:String(form.get('gymnastVoice')||'').trim()||null})
    if(ok)event.currentTarget.reset()
  }

  return <div className="mx-auto max-w-7xl space-y-6">
    <section><p className="text-xs font-black uppercase tracking-widest text-indigo-600">Fase 2 · Desarrollo individual</p><h2 className="mt-1 text-2xl font-black text-slate-900">Crecimiento, preparación y voz de la gimnasta</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Registro longitudinal para adaptar el entrenamiento. Las tendencias son observaciones para revisión profesional; no diagnostican maduración, salud ni lesiones.</p></section>
    {message&&<div role="status" className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-800">{message}</div>}
    <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="flex items-center gap-2 font-black text-slate-900"><ShieldCheck className="h-5 w-5 text-indigo-600"/> Etapa de desarrollo revisada</h3><p className="mt-2 text-sm text-slate-600">Es independiente del nivel competitivo y debe confirmarla el entrenador con evidencia individual.</p><label className="mt-5 block text-sm font-bold text-slate-700">Etapa<select className={field} value={stageId} onChange={event=>setStageId(event.target.value)}><option value="">Seleccionar etapa…</option>{initialData.stages.map(stage=><option key={stage.id} value={stage.id}>{stage.order}. {stage.name}</option>)}</select></label>{selected&&<div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-sm leading-6 text-slate-700">{selected.description}</p>{selected.objectives.length>0&&<p className="mt-2 text-xs font-bold text-slate-500">Focos: {selected.objectives.join(' · ')}</p>}</div>}<button disabled={!stageId||busy==='stage'} onClick={()=>send('stage',{stageId})} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50"><Save className="h-4 w-4"/> Confirmar revisión</button>{initialData.reviewedAt&&<p className="mt-3 text-xs text-slate-500">Última revisión: {formatDate(initialData.reviewedAt.slice(0,10))}</p>}</article>
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="flex items-center gap-2 font-black text-slate-900"><Activity className="h-5 w-5 text-emerald-600"/> Tendencia de estatura</h3>{initialData.growthObservation.status==='observation_available'?<div className="mt-5 grid grid-cols-2 gap-3"><Metric label="Cambio observado" value={`${initialData.growthObservation.changeCm} cm`}/><Metric label="Ritmo descriptivo" value={`${initialData.growthObservation.annualizedCm} cm/año`}/></div>:<p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{initialData.growthObservation.message}</p>}<p className="mt-4 text-xs leading-5 text-slate-500">{initialData.growthObservation.message}</p></article>
    </section>
    <section className="grid gap-6 xl:grid-cols-2">
      <form onSubmit={saveMeasurement} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="flex items-center gap-2 font-black text-slate-900"><Ruler className="h-5 w-5 text-sky-600"/> Nueva medición</h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><Input name="date" label="Fecha" type="date" defaultValue={today()} required/><Input name="standingHeightCm" label="Estatura de pie (cm)" type="number" step="0.1"/><Input name="sittingHeightCm" label="Estatura sentada (cm)" type="number" step="0.1"/><Input name="armSpanCm" label="Envergadura (cm)" type="number" step="0.1"/><Input name="weightKg" label="Peso opcional (kg)" type="number" step="0.1"/><Input name="protocol" label="Protocolo" defaultValue="Estándar del club" required/></div><label className="mt-3 block text-sm font-bold text-slate-700">Observaciones<textarea name="notes" maxLength={2000} className={field}/></label><label className="mt-4 flex gap-2 text-sm leading-5 text-slate-700"><input name="consent" type="checkbox" required className="mt-1"/> Confirmo que existe autorización para registrar estas mediciones sensibles.</label><Submit busy={busy==='measurement'} label="Guardar medición"/></form>
      <form onSubmit={saveCheckin} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="flex items-center gap-2 font-black text-slate-900"><HeartHandshake className="h-5 w-5 text-rose-600"/> Voz y disposición</h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><Input name="date" label="Fecha" type="date" defaultValue={today()} required/>{[['confidence','Confianza'],['motivation','Motivación'],['enjoyment','Disfrute'],['stress','Estrés'],['readiness','Disposición']].map(([name,label])=><Score key={name} name={name} label={label}/>)}</div><label className="mt-3 block text-sm font-bold text-slate-700">¿Qué quiere contar la gimnasta?<textarea name="gymnastVoice" maxLength={2000} className={field}/></label><label className="mt-4 flex gap-2 text-sm text-slate-700"><input name="reportedFear" type="checkbox"/> Reportó miedo o inseguridad que debe revisarse</label><Submit busy={busy==='checkin'} label="Guardar registro"/></form>
    </section>
    <section className="grid gap-6 xl:grid-cols-2"><History title="Historial de mediciones" empty="Aún no hay mediciones.">{initialData.measurements.map(row=><div key={row.id} className="rounded-xl bg-slate-50 p-3 text-sm"><b>{formatDate(row.date)}</b><p className="mt-1 text-slate-600">Pie {show(row.standingHeightCm,'cm')} · Sentada {show(row.sittingHeightCm,'cm')} · Envergadura {show(row.armSpanCm,'cm')} · Peso {show(row.weightKg,'kg')}</p></div>)}</History><History title="Historial de voz y bienestar" empty="Aún no hay registros.">{initialData.checkins.map(row=><div key={row.id} className="rounded-xl bg-slate-50 p-3 text-sm"><b>{formatDate(row.date)}</b><p className="mt-1 text-slate-600">Confianza {row.confidence}/5 · Motivación {row.motivation}/5 · Disfrute {row.enjoyment}/5 · Estrés {row.stress}/5 · Disposición {row.readiness}/5</p>{row.gymnastVoice&&<p className="mt-2 italic text-slate-700">“{row.gymnastVoice}”</p>}{row.reportedFear&&<p className="mt-2 font-bold text-amber-700">Requiere conversación sobre miedo o seguridad.</p>}</div>)}</History></section>
  </div>
}

function Input(props:React.InputHTMLAttributes<HTMLInputElement>&{label:string}){const {label,...input}=props;return <label className="text-sm font-bold text-slate-700">{label}<input {...input} className={field}/></label>}
function Score({name,label}:{name:string;label:string}){return <label className="text-sm font-bold text-slate-700">{label}<select name={name} defaultValue="3" className={field}>{[1,2,3,4,5].map(value=><option key={value} value={value}>{value} / 5</option>)}</select></label>}
function Submit({busy,label}:{busy:boolean;label:string}){return <button disabled={busy} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:opacity-50"><Save className="h-4 w-4"/>{busy?'Guardando…':label}</button>}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs font-bold text-emerald-700">{label}</p><p className="mt-1 text-xl font-black text-emerald-950">{value}</p></div>}
function History({title,empty,children}:{title:string;empty:string;children:React.ReactNode}){const hasChildren=Array.isArray(children)?children.length>0:Boolean(children);return <article className="rounded-2xl border border-slate-200 bg-white p-6"><h3 className="font-black text-slate-900">{title}</h3><div className="mt-4 space-y-3">{hasChildren?children:<p className="text-sm text-slate-500">{empty}</p>}</div></article>}
function formatDate(value:string){return new Intl.DateTimeFormat('es-CO',{dateStyle:'medium',timeZone:'America/Bogota'}).format(new Date(`${value}T12:00:00`))}
function show(value:number|null,unit:string){return value===null?'—':`${value} ${unit}`}

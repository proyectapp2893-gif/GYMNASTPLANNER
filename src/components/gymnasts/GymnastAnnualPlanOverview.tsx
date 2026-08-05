'use client'

import Link from 'next/link'
import {useMemo,useState} from 'react'
import {CalendarDays,ChevronRight,Dumbbell,Gauge,Layers3,Target} from 'lucide-react'
import PlanAnualGrid from '../dashboard/PlanAnualGrid'
import {calculateCurrentWeek,getWeekPlan,type PlanningConfig} from '../../lib/sports-planning'

export default function GymnastAnnualPlanOverview({gymnastId,configuration}:{gymnastId:string;configuration:PlanningConfig|null}){
  const initialWeek=configuration?calculateCurrentWeek(configuration):1
  const [selectedWeek,setSelectedWeek]=useState(initialWeek)
  const weekPlan=useMemo(()=>configuration?getWeekPlan(configuration,selectedWeek):null,[configuration,selectedWeek])
  if(!configuration?.fecha_inicio||!configuration.semanas_totales)return <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><Layers3 className="mx-auto h-9 w-9 text-slate-300"/><h3 className="mt-3 font-black text-slate-800">El grupo todavía no tiene macrociclo anual</h3><p className="mt-1 text-sm text-slate-500">Configura el plan general del grupo para que esta gimnasta lo herede automáticamente.</p><Link href="/dashboard" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white">Ir al plan general <ChevronRight className="h-4 w-4"/></Link></section>
  return <section className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Macrociclo heredado del grupo</p><h2 className="mt-1 text-2xl font-black text-slate-900">Plan anual de la gimnasta</h2><p className="mt-1 text-sm text-slate-500">Selecciona una semana para consultar su objetivo y carga. Los ajustes individuales se conservan por separado.</p></div><div className="flex flex-wrap gap-2"><Link href={`/gimnastas/${gymnastId}/planificacion`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700">Ver ajustes individuales</Link><Link href={`/gimnastas/${gymnastId}/sesiones/nueva`} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white">Crear sesión individual</Link></div></div><PlanAnualGrid configuracion={configuration} semanaSeleccionada={selectedWeek} onSeleccionarSemana={week=>setSelectedWeek(week)}/>{weekPlan&&<div className="grid gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 sm:grid-cols-2 xl:grid-cols-5"><Detail icon={<CalendarDays/>} label="Semana" value={`${selectedWeek} de ${configuration.semanas_totales}`}/><Detail icon={<Target/>} label="Objetivo" value={weekPlan.objetivo}/><Detail icon={<Layers3/>} label="Mesociclo" value={weekPlan.mesociclo}/><Detail icon={<Dumbbell/>} label="Microciclo" value={weekPlan.microciclo}/><Detail icon={<Gauge/>} label="Carga" value={`Vol. ${weekPlan.carga.volumen}% · Int. ${weekPlan.carga.intensidad}%`}/></div>}</section>
}

function Detail({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <article className="rounded-xl bg-white p-3 shadow-sm"><div className="flex items-center gap-2 text-indigo-600 [&_svg]:h-4 [&_svg]:w-4">{icon}<span className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</span></div><p className="mt-2 text-sm font-black text-slate-800">{value}</p></article>}

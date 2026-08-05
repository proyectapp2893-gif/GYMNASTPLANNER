import { Activity, AlertTriangle, CalendarCheck, Gauge, Target, TrendingUp } from 'lucide-react'
import ModuleEmptyState from '../../../../components/gymnasts/ModuleEmptyState'
import ProfileEditor from '../../../../components/gymnasts/ProfileEditor'
import CoachAssignments from '../../../../components/gymnasts/CoachAssignments'
import GymnastAnnualPlanOverview from '../../../../components/gymnasts/GymnastAnnualPlanOverview'
import { getCoachAssignments, getGymnastAnnualConfiguration, getGymnastDashboardMetrics, getGymnastProfile } from '../../../../lib/gymnasts/server'

export default async function GymnastSummaryPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params
  const [gymnast,metrics,coachData,annualConfiguration]=await Promise.all([getGymnastProfile(id),getGymnastDashboardMetrics(id),getCoachAssignments(id),getGymnastAnnualConfiguration(id)])
  const cards=[
    ['Sesiones esta semana',String(metrics.sessions.length),CalendarCheck],
    ['Asistencia',metrics.attendancePercent===null?'Sin datos':`${metrics.attendancePercent}%`,TrendingUp],
    ['Carga semanal',String(Math.round(metrics.weeklyLoad)),Activity],
    ['RPE promedio',metrics.averageRpe===null?'Sin datos':String(metrics.averageRpe),Gauge],
  ] as const
  return <div className="mx-auto max-w-7xl space-y-6">
    <GymnastAnnualPlanOverview gymnastId={id} configuration={annualConfiguration}/>
    <section><p className="text-xs font-black uppercase tracking-widest text-indigo-600">Resumen deportivo</p><h2 className="mt-1 text-2xl font-black text-slate-900">Qué trabajar, qué evitar y qué evaluar</h2></section>
    {metrics.restrictions.length>0&&<section className="rounded-2xl border border-amber-300 bg-amber-50 p-4"><h3 className="flex items-center gap-2 font-black text-amber-900"><AlertTriangle className="h-5 w-5"/> Revisar antes de continuar</h3><p className="mt-1 text-sm text-amber-800">Hay {metrics.restrictions.length} restricción(es) activa(s). Deben revisarse antes de programar ejercicios.</p></section>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value,Icon])=><article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Icon className="mb-4 h-5 w-5 text-indigo-600"/><p className="text-sm font-bold text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-900">{value}</p></article>)}</section>
    <ProfileEditor gymnast={gymnast}/>
    <CoachAssignments gymnastId={id} coaches={coachData.coaches.map(x=>({id:String(x.id),name:String(x.nombre||'Entrenador'),role:String(x.rol)}))} assignments={coachData.assignments.map(x=>{const p=Array.isArray(x.perfiles)?x.perfiles[0]:x.perfiles;return{id:String(x.id),coachId:String(x.entrenador_id),name:String(p?.nombre||'Entrenador'),role:String(p?.rol||''),primary:Boolean(x.es_principal)}})}/>
    <section className="grid gap-6 xl:grid-cols-2">
      <article className="rounded-2xl border border-slate-200 bg-white p-6"><h3 className="flex items-center gap-2 font-black text-slate-800"><Target className="h-5 w-5 text-indigo-600"/> Objetivo principal</h3><p className="mt-3 text-sm leading-6 text-slate-600">{gymnast.objetivo_temporada||'Aún no se ha definido el objetivo principal de la temporada.'}</p>{metrics.goals.length>0&&<div className="mt-5 space-y-3">{metrics.goals.map(goal=><div key={String(goal.id)}><div className="flex justify-between gap-3 text-xs font-bold"><span className="truncate text-slate-700">{String(goal.descripcion)}</span><span>{Number(goal.porcentaje_avance)}%</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{width:`${Number(goal.porcentaje_avance)}%`}}/></div></div>)}</div>}</article>
      <article className="rounded-2xl border border-slate-200 bg-white p-6"><h3 className="flex items-center gap-2 font-black text-slate-800"><TrendingUp className="h-5 w-5 text-emerald-600"/> Progreso técnico reciente</h3>{metrics.skills.length===0?<p className="mt-3 text-sm text-slate-500">Todavía no hay elementos técnicos evaluados.</p>:<div className="mt-4 space-y-3">{metrics.skills.map(skill=><div key={String(skill.id)} className="rounded-xl bg-slate-50 p-3"><p className="text-sm font-bold text-slate-800">Elemento evaluado</p><p className="text-xs text-slate-500">Dominio estimado: {Number(skill.porcentaje_dominio)}%</p></div>)}</div>}</article>
    </section>
    {metrics.sessions.length===0&&<ModuleEmptyState title="Sin sesiones individuales esta semana" description="El plan general continúa disponible. Crea o adapta una sesión únicamente cuando esta gimnasta lo necesite."/>}
  </div>
}

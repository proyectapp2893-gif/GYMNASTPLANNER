'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarRange, CheckCircle2, Circle, Loader2, RefreshCw } from 'lucide-react'
import { getWeekPlan, getWeekStartDate, type PlanningConfig } from '../../lib/sports-planning'
import { getWeeklyLoadDays, localDateKey, type TrainingDay, type WeeklySession } from '../../lib/weekly-load-planning'

type Props = {
  grupoId: string
  configuracion: PlanningConfig
  semanaNum: number
  horario: TrainingDay[]
  diaActivo: string
  refreshKey: number
  onSeleccionarDia: (dia: string, enfoque: string, fecha: string, hora: string, aparatos: string) => void
}

export default function DistribucionSemanal({ grupoId, configuracion, semanaNum, horario, diaActivo, refreshKey, onSeleccionarDia }: Props) {
  const [sessions, setSessions] = useState<WeeklySession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generationKey, setGenerationKey] = useState(0)
  const [regenerated, setRegenerated] = useState(false)
  const monday = useMemo(() => getWeekStartDate(configuracion, semanaNum), [configuracion, semanaNum])
  const mondayKey = monday ? localDateKey(monday) : ''

  useEffect(() => {
    if (!mondayKey || !grupoId) return
    const controller = new AbortController()
    const end = new Date(`${mondayKey}T12:00:00`)
    end.setDate(end.getDate() + 6)
    const params = new URLSearchParams({ grupoId, inicio: mondayKey, fin: localDateKey(end) })
    Promise.resolve().then(() => {
      if (controller.signal.aborted) return null
      setLoading(true)
      setError('')
      return fetch(`/api/sesiones/semana?${params}`, { signal: controller.signal })
    })
      .then(async response => {
        if (!response) return
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'No se pudo consultar el historial')
        setSessions(payload.sessions || [])
        if (generationKey > 0) setRegenerated(true)
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudo consultar el historial')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [grupoId, mondayKey, refreshKey, generationKey])

  const week = getWeekPlan(configuracion, semanaNum)
  const days = getWeeklyLoadDays(configuracion, semanaNum, horario, sessions)
  const previous = sessions.filter(session => session.fecha_calendario && session.fecha_calendario < mondayKey)
  const pending = days.find(day => !day.session)
  const openDay = (day: typeof days[number]) => {
    const date = new Date(`${day.fecha}T12:00:00`)
    const label = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    onSeleccionarDia(day.dia, day.enfoque || 'Entrenamiento General', label.charAt(0).toUpperCase() + label.slice(1), day.hora || '', day.aparatos || '')
    document.getElementById('constructor-sesion')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (!monday || !horario.length) return null
  return <section className="mb-8 rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm md:p-6 print:hidden" aria-label="Distribución semanal de cargas">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-lg font-black text-slate-900"><CalendarRange className="h-5 w-5 text-indigo-600"/>Distribuir cargas semanal</h2>
        <p className="mt-1 text-sm text-slate-600">{week.etapa} · {week.mesociclo} · Microciclo {week.microciclo}</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-xl bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-800">Objetivo semanal: volumen {week.carga.volumen}% · intensidad {week.carga.intensidad}%</div>
        <button type="button" disabled={loading} onClick={() => { setRegenerated(false); setGenerationKey(value => value + 1) }} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}
          Generar cargas de la semana
        </button>
      </div>
    </div>
    <p className="mt-3 text-xs text-slate-500">Objetivos relativos de planificación. La carga realizada se evalúa con los registros de las gimnastas.</p>
    {regenerated && !loading && !error ? <p className="mt-2 text-xs font-semibold text-emerald-700" role="status">Propuesta semanal actualizada con las sesiones guardadas. Abre cada día para revisar y guardar su entrenamiento.</p> : null}
    {error ? <p className="mt-3 text-sm text-rose-700" role="alert">{error}</p> : null}
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {days.map(day => <button key={day.fecha} type="button" onClick={() => openDay(day)}
        className={`rounded-xl border p-3 text-left transition hover:border-indigo-400 hover:shadow-sm ${diaActivo === day.dia ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50'}`}>
        <div className="flex items-center justify-between gap-2"><span className="font-black text-slate-800">{day.dia}</span>{day.session ? <CheckCircle2 className="h-4 w-4 text-emerald-600"/> : <Circle className="h-4 w-4 text-slate-400"/>}</div>
        <span className="text-xs text-slate-500">{day.fecha}</span>
        <p className="mt-2 line-clamp-2 text-xs font-medium text-slate-700">{day.enfoque || 'Entrenamiento general'}</p>
        <p className="mt-2 text-xs font-bold text-indigo-700">Vol. {day.volumen}% · Int. {day.intensidad}%</p>
        <p className="mt-1 text-xs text-slate-500">{day.session ? `Guardada · ${day.session.exerciseCount} ejercicios` : 'Pendiente de crear'}</p>
      </button>)}
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 text-sm">
      {loading ? <span className="flex items-center gap-1 text-slate-500"><Loader2 className="h-4 w-4 animate-spin"/>Cargando historial...</span> : <span className="text-slate-600">Historial reciente: <strong>{previous.length}</strong> sesiones guardadas en las 4 semanas anteriores.</span>}
      {pending && !loading ? <button type="button" onClick={() => openDay(pending)} className="rounded-lg bg-indigo-600 px-3 py-2 font-bold text-white hover:bg-indigo-700">Crear siguiente sesión: {pending.dia}</button> : null}
      {!pending && !loading ? <span className="font-bold text-emerald-700">Todas las sesiones de esta semana están guardadas.</span> : null}
    </div>
    {previous.length > 0 ? <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
      <p className="font-bold text-slate-700">Sesiones recientes que guían la siguiente propuesta</p>
      <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        {previous.slice(0, 3).map(session => <li key={session.id}>{session.fecha_calendario} · {session.exerciseCount} ejercicios{session.volumen_planificado === null ? '' : ` · Vol. ${session.volumen_planificado}%`}{session.intensidad_planificada === null ? '' : ` · Int. ${session.intensidad_planificada}%`}</li>)}
      </ul>
    </div> : null}
  </section>
}

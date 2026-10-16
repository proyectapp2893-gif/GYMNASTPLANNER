'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Dumbbell, LockKeyhole, Loader2 } from 'lucide-react'
import { getWeeklyLoadDays } from '../../lib/weekly-load-planning'
import { getWeekPlan } from '../../lib/sports-planning'
import type { SharedGroup, SharedSession } from '../../lib/shared-macrocycles'

type Payload = { club: string; groups: SharedGroup[]; sessions: SharedSession[] }
type DayEntry = { group: SharedGroup; session: SharedSession | null; enfoque: string; hora: string; semana: number; fase: string }

function monthShift(month: string, amount: number) {
  const [year, index] = month.split('-').map(Number)
  const date = new Date(year, index - 1 + amount, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function firstPlanMonth(groups: SharedGroup[]) {
  return groups.map(group => group.config.fecha_inicio?.slice(0, 7)).filter((value): value is string => Boolean(value)).sort()[0]
}

export default function SharedMacrocycleCalendar({ token }: { token: string }) {
  const [month, setMonth] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  })
  const [payload, setPayload] = useState<Payload | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState('all')

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/plan-publico/${encodeURIComponent(token)}?mes=${month}`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'No se pudo cargar el calendario')
        if (controller.signal.aborted) return
        const result = data as Payload
        const first = firstPlanMonth(result.groups)
        const latestEnd = result.groups.every(group => group.config.fecha_fin)
          ? result.groups.map(group => group.config.fecha_fin!.slice(0, 7)).sort().at(-1) : null
        if (first && month < first) {
          setMonth(first)
          return
        }
        if (latestEnd && month > latestEnd) {
          setMonth(latestEnd)
          return
        }
        setPayload(result)
        setError('')
        setLoading(false)
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setPayload(null)
        setError(cause instanceof Error ? cause.message : 'No se pudo cargar el calendario')
        setLoading(false)
      })
    return () => controller.abort()
  }, [month, token])

  const visibleGroups = useMemo(() => payload?.groups.filter(group => selectedGroupId === 'all' || group.id === selectedGroupId) || [], [payload, selectedGroupId])
  const entriesByDate = useMemo(() => {
    const map = new Map<string, DayEntry[]>()
    if (!payload) return map
    for (const group of visibleGroups) {
      const weeks = Math.min(260, Number(group.config.semanas_totales || 0))
      for (let week = 1; week <= weeks; week += 1) {
        const plan = getWeekPlan(group.config, week)
        for (const day of getWeeklyLoadDays(group.config, week, group.config.horario_semanal)) {
          if (!day.fecha.startsWith(month) || day.fecha < String(group.config.fecha_inicio).slice(0, 10) || (group.config.fecha_fin && day.fecha > group.config.fecha_fin)) continue
          const session = payload.sessions.find(item => item.grupoId === group.id && item.fecha === day.fecha) || null
          map.set(day.fecha, [...(map.get(day.fecha) || []), { group, session, enfoque: day.enfoque || 'Entrenamiento general', hora: day.hora || '', semana: week, fase: `${plan.etapa} · ${plan.mesociclo} · Microciclo ${plan.microciclo}` }])
        }
      }
    }
    return map
  }, [month, payload, visibleGroups])

  const cells = useMemo(() => {
    const [year, index] = month.split('-').map(Number)
    const first = new Date(year, index - 1, 1)
    const offset = (first.getDay() + 6) % 7
    const count = new Date(year, index, 0).getDate()
    return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, position) => {
      const number = position - offset + 1
      return number >= 1 && number <= count ? `${month}-${String(number).padStart(2, '0')}` : null
    })
  }, [month])

  const selectedEntries = selectedDate ? entriesByDate.get(selectedDate) || [] : []
  const monthTitle = new Date(`${month}-01T12:00:00`).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

  return <div data-public-plan className="min-h-screen bg-[linear-gradient(145deg,#f1f5ff,#f8fafc_46%,#e9f6f3)] p-3 text-slate-900 sm:p-6 lg:p-10">
    <div className="mx-auto max-w-7xl">
      <header className="rounded-3xl bg-slate-950 px-5 py-6 text-white shadow-xl sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Planificación compartida</p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">{payload?.club || 'Macrociclos de entrenamiento'}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Calendario de entrenamientos por equipo y nivel. Selecciona un día habilitado para ver la sesión guardada.</p></div>
          <span className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white"><LockKeyhole className="h-4 w-4"/>Solo lectura</span>
        </div>
      </header>

      {error ? <div className="mt-6 rounded-2xl border border-rose-200 bg-white p-6 text-rose-800" role="alert">{error}</div> : null}
      {!error && !payload ? <div className="flex items-center justify-center gap-2 py-20 text-slate-600"><Loader2 className="h-5 w-5 animate-spin"/>Cargando calendario...</div> : null}
      {payload ? <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5">
            <div><p className="text-xs font-black uppercase tracking-wider text-indigo-600">Macrociclo</p><h2 className="mt-1 flex items-center gap-2 text-xl font-black capitalize"><CalendarDays className="h-5 w-5 text-indigo-600"/>{monthTitle}</h2></div>
            <div className="flex items-center gap-2">
              {payload.groups.length > 1 ? <select aria-label="Filtrar equipo" value={selectedGroupId} onChange={event => { setSelectedGroupId(event.target.value); setSelectedDate(null) }} className="max-w-44 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"><option value="all">Todos los equipos</option>{payload.groups.map(group => <option key={group.id} value={group.id}>{group.nombre} · {group.nivel}</option>)}</select> : null}
              <button type="button" onClick={() => { setMonth(value => monthShift(value, -1)); setSelectedDate(null); setLoading(true) }} aria-label="Mes anterior" className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50"><ChevronLeft className="h-5 w-5"/></button>
              <button type="button" onClick={() => { setMonth(value => monthShift(value, 1)); setSelectedDate(null); setLoading(true) }} aria-label="Mes siguiente" className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50"><ChevronRight className="h-5 w-5"/></button>
            </div>
          </div>
          {loading ? <p className="pb-3 text-xs text-indigo-600">Actualizando mes...</p> : null}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-wider text-slate-500 sm:gap-2 sm:text-xs">{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(day => <div key={day} className="pb-2">{day}</div>)}</div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">{cells.map((date, index) => {
            const entries = date ? entriesByDate.get(date) || [] : []
            return date ? <button key={date} type="button" disabled={!entries.length} onClick={() => setSelectedDate(date)} aria-label={`${date}: ${entries.length} entrenamientos`}
              className={`min-h-20 rounded-xl border p-1 text-left sm:min-h-28 sm:p-2 ${entries.length ? 'border-indigo-200 bg-indigo-50/70 hover:border-indigo-500 hover:bg-indigo-100' : 'border-slate-100 bg-slate-50 text-slate-400'} ${selectedDate === date ? 'ring-2 ring-indigo-500' : ''}`}>
              <span className="text-xs font-black sm:text-sm">{Number(date.slice(-2))}</span>
              {entries.slice(0, 2).map(entry => <span key={entry.group.id} title={`${entry.group.nombre} · ${entry.group.nivel}`} className="mt-1 block truncate rounded bg-white px-1 py-0.5 text-[9px] font-bold text-indigo-800 sm:text-[11px]">{entry.group.nombre} · {entry.group.nivel}</span>)}
              {entries.length > 2 ? <span className="text-[9px] text-indigo-700">+{entries.length - 2} más</span> : null}
            </button> : <div key={`empty-${index}`} className="min-h-20 rounded-xl bg-slate-50/40 sm:min-h-28"/>
          })}</div>
          <p className="mt-4 text-xs text-slate-500">Los días coloreados corresponden al horario configurado de cada equipo. Una sesión aparece cuando el entrenador la guarda.</p>
        </section>

        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:self-start">
          <h2 className="text-lg font-black text-slate-900">{selectedDate ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Detalle del entrenamiento'}</h2>
          {!selectedDate ? <p className="mt-3 text-sm text-slate-500">Toca un día habilitado en el calendario para consultar su planificación.</p> : null}
          {selectedEntries.map(entry => <article key={entry.group.id} className="mt-4 border-t border-slate-200 pt-4">
            <p className="text-xs font-black uppercase tracking-wide text-indigo-600">{entry.group.nombre} · {entry.group.nivel} · Semana {entry.semana}</p>
            <h3 className="mt-1 text-base font-black">{entry.enfoque}</h3>
            <p className="mt-1 text-xs text-slate-600">{entry.fase}</p>
            {entry.hora ? <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock3 className="h-3 w-3"/>{entry.hora}</p> : null}
            {!entry.session ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Sesión todavía no guardada.</p> : <div className="mt-3">
              {entry.session.duracion ? <p className="text-xs font-semibold text-slate-500">Duración prevista: {entry.session.duracion} min</p> : null}
              {entry.session.bloques.length ? entry.session.bloques.map(block => <section key={block.nombre} className="mt-3 rounded-xl bg-slate-50 p-3">
                <h4 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-slate-700"><Dumbbell className="h-3.5 w-3.5"/>{block.nombre}</h4>
                <ul className="mt-2 space-y-2">{block.ejercicios.map((exercise, index) => <li key={`${exercise.nombre}-${index}`} className="rounded-lg border border-slate-200 bg-white p-2 text-sm"><strong>{exercise.nombre}</strong>{exercise.descripcion ? <p className="mt-1 text-xs text-slate-600">{exercise.descripcion}</p> : null}{exercise.dosificacion ? <p className="mt-1 text-xs text-indigo-700">{typeof exercise.dosificacion === 'string' ? exercise.dosificacion : Object.entries(exercise.dosificacion).map(([level, dose]) => `${level}: ${dose}`).join(' · ')}</p> : null}</li>)}</ul>
              </section>) : <p className="mt-2 text-sm text-slate-500">La sesión no tiene ejercicios registrados.</p>}
            </div>}
          </article>)}
        </aside>
      </div> : null}
    </div>
  </div>
}

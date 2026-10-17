'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Dumbbell, LockKeyhole, Loader2 } from 'lucide-react'
import { getWeeklyLoadDays } from '../../lib/weekly-load-planning'
import { calculateCurrentWeek, getTotalWeeks, getWeekPlan } from '../../lib/sports-planning'
import type { SharedGroup, SharedSession } from '../../lib/shared-macrocycles'
import PlanAnualGrid from '../dashboard/PlanAnualGrid'
import GraficosCarga from '../dashboard/GraficosCarga'

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
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [selectedWeek, setSelectedWeek] = useState(1)

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

  const selectedGroup = payload?.groups.find(group => group.id === selectedGroupId) || payload?.groups[0] || null
  const visibleGroups = useMemo(() => selectedGroup ? [selectedGroup] : [], [selectedGroup])
  const entriesByDate = useMemo(() => {
    const map = new Map<string, DayEntry[]>()
    if (!payload) return map
    for (const group of visibleGroups) {
      const weeks = Math.min(260, getTotalWeeks(group.config))
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
      {payload ? <div className="mt-6 space-y-6">
        {payload.groups.length > 1 ? <nav aria-label="Seleccionar nivel o equipo" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {payload.groups.map(group => <button key={group.id} type="button" onClick={() => { setSelectedGroupId(group.id); setSelectedWeek(Math.max(1, Math.min(getTotalWeeks(group.config), calculateCurrentWeek(group.config)))); setSelectedDate(null) }} aria-pressed={selectedGroup?.id === group.id} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${selectedGroup?.id === group.id ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-slate-200 bg-white hover:border-indigo-300'}`}>
            <span className="block text-base font-black text-slate-900">{group.nombre}</span><span className="mt-1 block text-sm font-semibold text-slate-500">{group.nivel}</span>
          </button>)}
        </nav> : null}
        {selectedGroup ? <>
        <section aria-label={`Macrociclo de ${selectedGroup.nombre}`} className="space-y-5">
          <PlanAnualGrid configuracion={selectedGroup.config} semanaSeleccionada={selectedWeek} onSeleccionarSemana={semana => setSelectedWeek(semana)} />
          <GraficosCarga configuracion={selectedGroup.config} semanaNum={selectedWeek} mesocicloActivo={getWeekPlan(selectedGroup.config, selectedWeek).mesociclo} />
        </section>
        <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5">
            <div><p className="text-xs font-black uppercase tracking-wider text-indigo-600">Macrociclo</p><h2 className="mt-1 flex items-center gap-2 text-xl font-black capitalize"><CalendarDays className="h-5 w-5 text-indigo-600"/>{monthTitle}</h2></div>
            <div className="flex items-center gap-2">
              <span className="mr-1 hidden text-sm font-bold text-slate-600 sm:inline">{selectedGroup.nombre} · {selectedGroup.nivel}</span>
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
              {entries.map(entry => <span key={entry.group.id} title={`${entry.group.nombre} · ${entry.group.nivel}`} className="mt-1 block truncate rounded bg-white px-1 py-0.5 text-[9px] font-bold text-indigo-800 sm:text-[11px]">{entry.enfoque}</span>)}
            </button> : <div key={`empty-${index}`} className="min-h-20 rounded-xl bg-slate-50/40 sm:min-h-28"/>
          })}</div>
          <p className="mt-4 text-xs text-slate-500">Los días coloreados corresponden al horario configurado de cada equipo. Una sesión aparece cuando el entrenador la guarda.</p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
            <div><p className="text-xs font-black uppercase tracking-wider text-indigo-600">Sesión de entrenamiento</p><h2 className="mt-1 text-xl font-black capitalize text-slate-900">{selectedDate ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Selecciona un día del calendario'}</h2></div>
            {selectedEntries[0] ? <div className="text-sm text-slate-600"><p className="font-bold text-slate-800">{selectedGroup.nombre} · {selectedGroup.nivel} · Semana {selectedEntries[0].semana}</p><p>{selectedEntries[0].fase}</p>{selectedEntries[0].hora ? <p className="mt-1 flex items-center gap-1"><Clock3 className="h-3.5 w-3.5"/>{selectedEntries[0].hora}</p> : null}</div> : null}
          </div>
          {!selectedDate ? <p className="mt-5 text-sm text-slate-500">Toca un día habilitado para consultar la sesión guardada.</p> : null}
          {selectedEntries.map(entry => <article key={entry.group.id} className="pt-5">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-indigo-600">Objetivo de la sesión</p><h3 className="mt-1 text-lg font-black">{entry.enfoque}</h3></div>{entry.session?.duracion ? <p className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700">Duración prevista: {entry.session.duracion} min</p> : null}</div>
            {!entry.session ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Sesión todavía no guardada.</p> : <div className="grid gap-4 lg:grid-cols-3">
              {([
                { title: 'Parte preparatoria', subtitle: 'Activación y preparación para el trabajo', keys: ['Calentamiento general', 'Preparación específica', 'Zona media y estabilizadores', 'Tren superior', 'Tren inferior', 'Calentamiento', 'Preparación física'] },
                { title: 'Parte principal', subtitle: 'Desarrollo de los objetivos técnico físicos', keys: ['Trabajo técnico 1', 'Trabajo técnico 2', 'Secuencias y conexiones', 'Rutinas completas', 'Flexibilidad activa', 'Flexibilidad pasiva', 'Trabajo técnico', 'Rutinas', 'Flexibilidad'] },
                { title: 'Parte final', subtitle: 'Vuelta a la calma y cierre pedagógico', keys: ['Elongación', 'Retroalimentación', 'Vuelta a la calma'] },
              ] as const).map(phase => {
                const blocks = entry.session!.bloques.filter(block => phase.keys.includes(block.nombre))
                return <section key={phase.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="border-b border-slate-200 pb-3"><h4 className="text-base font-black text-slate-900">{phase.title}</h4><p className="mt-1 text-xs text-slate-500">{phase.subtitle}</p></div>
                  {!blocks.length ? <p className="py-4 text-sm text-slate-400">Sin ejercicios registrados en esta fase.</p> : blocks.map(block => <div key={block.nombre} className="mt-4 first:mt-3"><h5 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-slate-600"><Dumbbell className="h-3.5 w-3.5"/>{block.nombre}</h5><ul className="mt-2 space-y-2">{block.ejercicios.map((exercise, index) => <li key={`${exercise.nombre}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3 text-sm"><strong>{exercise.nombre}</strong>{exercise.descripcion ? <p className="mt-1 text-xs leading-relaxed text-slate-600">{exercise.descripcion}</p> : null}{exercise.dosificacion ? <p className="mt-2 text-xs font-semibold leading-relaxed text-indigo-700">{typeof exercise.dosificacion === 'string' ? exercise.dosificacion : Object.entries(exercise.dosificacion).map(([level, dose]) => `${level}: ${dose}`).join(' · ')}</p> : null}</li>)}</ul></div>)}
                </section>
              })}
            </div>}
            {entry.session && !entry.session.bloques.length ? <p className="mt-4 text-sm text-slate-500">La sesión no tiene ejercicios registrados.</p> : null}
          </article>)}
        </section>
        </> : null}
      </div> : null}
    </div>
  </div>
}

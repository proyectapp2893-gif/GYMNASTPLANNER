import { z } from 'zod'
import { buildPlanningModel, getWeekPlan, getWeekStartDate, type PlanningConfig } from '../sports-planning'
import type { Sesion } from '../types'

export const monthlyReportSchema = z.object({
  formato: z.enum(['xlsx', 'pdf']).optional(),
  grupoId: z.string().uuid(),
  mes: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).refine(value => Number(value.slice(0, 4)) >= 2000 && Number(value.slice(0, 4)) <= 2100),
  modalidad: z.string().trim().min(1).max(80),
  categoria: z.string().trim().min(1).max(80),
  entrenador: z.string().trim().max(120).default(''),
  observaciones: z.string().trim().max(2000).default(''),
})

export type ReportOptions = z.infer<typeof monthlyReportSchema>
export type ReportScheduleDay = { dia: string; hora?: string | null; lugar?: string | null; enfoque?: string | null; aparatos?: string | null }
export type ReportSession = Sesion & { hora_inicio?: string | null; duracion_prevista_min?: number | null; observaciones?: string | null }
export type ReportInput = ReportOptions & {
  club: string
  grupo: string
  config: PlanningConfig & { horario_semanal?: ReportScheduleDay[] | null }
  sessions: ReportSession[]
}

const weekdays = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
function normalizeDay(day: string) { return day.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') }

export function assignedSchedule(input: ReportInput, date: string) {
  const offset = (new Date(`${date}T12:00:00`).getDay() + 6) % 7
  return (input.config.horario_semanal || []).filter(day => normalizeDay(day.dia) === weekdays[offset])
}

export function sessionDetails(input: ReportInput, session: ReportSession) {
  const assigned = assignedSchedule(input, session.fecha_calendario!)
  return {
    time: session.hora_inicio || assigned.map(day => day.hora).filter(Boolean).join(' / ') || 'No registrado',
    place: assigned.map(day => day.lugar).filter(Boolean).join(' / ') || 'No registrado',
    duration: session.duracion_prevista_min != null ? `${session.duracion_prevista_min} min` : 'No registrada',
    notes: session.observaciones || 'No registradas',
  }
}

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function monthBounds(month: string) {
  const [year, number] = month.split('-').map(Number)
  return { start: `${month}-01`, end: dateKey(new Date(year, number, 1, 12)) }
}

export function weekKey(date: string) {
  const day = new Date(`${date}T12:00:00`)
  day.setDate(day.getDate() - (day.getDay() + 6) % 7)
  return dateKey(day)
}

export function reportMonthLabel(month: string) {
  return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(new Date(`${month}-01T12:00:00`))
}

export function reportFileName(options: Pick<ReportOptions, 'mes' | 'modalidad' | 'categoria'>, format: 'xlsx' | 'pdf' = 'xlsx') {
  const month = new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(new Date(`${options.mes}-01T12:00:00`))
  const safe = (value: string) => value.toUpperCase().replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim()
  return `${safe(month)} – ${safe(options.modalidad)} – ${safe(options.categoria)} – ${options.mes.slice(0, 4)}.${format}`
}

export function buildReportModel(input: ReportInput) {
  const { start, end } = monthBounds(input.mes)
  const sessions = input.sessions.filter(s => s.fecha_calendario && s.fecha_calendario >= start && s.fecha_calendario < end)
    .sort((a, b) => a.fecha_calendario!.localeCompare(b.fecha_calendario!) || a.id.localeCompare(b.id))
  const weeks = Array.from({ length: buildPlanningModel(input.config).total }, (_, index) => {
    const date = getWeekStartDate(input.config, index + 1)
    if (!date || Number.isNaN(date.getTime())) throw new Error('Configura la fecha de inicio del macrociclo.')
    const last = new Date(date)
    last.setDate(last.getDate() + 6)
    return { ...getWeekPlan(input.config, index + 1), start: dateKey(date), end: dateKey(last), inMonth: dateKey(date) < end && dateKey(last) >= start }
  })
  // Include calendar weeks even when a saved session falls outside the configured cycle.
  const starts = new Set(weeks.filter(w => w.inMonth).map(w => w.start))
  sessions.forEach(session => starts.add(weekKey(session.fecha_calendario!)))
  const monthWeeks = [...starts].sort().map(start => ({
    start,
    plan: weeks.find(week => week.start === start),
    sessions: sessions.filter(session => weekKey(session.fecha_calendario!) === start),
  })).map(week => ({ ...week, days: Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(`${week.start}T12:00:00`)
    date.setDate(date.getDate() + offset)
    const key = dateKey(date)
    const scheduled = key >= (input.config.fecha_inicio || '') && (!input.config.fecha_fin || key <= input.config.fecha_fin) && !!week.plan
      ? assignedSchedule(input, key) : []
    return { date: key, scheduled, sessions: week.sessions.filter(session => session.fecha_calendario === key) }
  }).filter(day => day.date >= start && day.date < end && (day.scheduled.length > 0 || day.sessions.length > 0)) }))
    .filter(week => week.days.length > 0)
  return { sessions, weeks, monthWeeks }
}

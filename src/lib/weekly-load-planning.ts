import { getWeekPlan, getWeekStartDate, type PlanningConfig } from './sports-planning'

export type TrainingDay = { dia: string; enfoque?: string | null; aparatos?: string | null; hora?: string | null }
export type WeeklySession = {
  id: string
  fecha_calendario: string | null
  objetivo: string | null
  volumen_planificado: number | null
  intensidad_planificada: number | null
  duracion_prevista_min: number | null
  estado: string | null
  exerciseCount: number
}

const dayOffsets: Record<string, number> = {
  lunes: 0, martes: 1, miercoles: 2, jueves: 3, viernes: 4, sabado: 5, domingo: 6,
}

export function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getWeeklyLoadDays(config: PlanningConfig, weekNumber: number, schedule: TrainingDay[], sessions: WeeklySession[] = []) {
  const monday = getWeekStartDate(config, weekNumber)
  if (!monday) return []
  const weekly = getWeekPlan(config, weekNumber)
  const ordered = schedule
    .map(day => ({ ...day, offset: dayOffsets[day.dia.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')] }))
    .filter((day): day is typeof day & { offset: number } => day.offset !== undefined)
    .sort((a, b) => a.offset - b.offset)
  // The waves alternate effort and relief while retaining the macrociclo's weekly mean.
  const volumeFactors = ordered.map((_, index) => [0.9, 1.12, 0.82, 1.08, 0.88, 1.1, 0.8][index])
  const intensityFactors = ordered.map((_, index) => [0.92, 1.08, 0.86, 1.1, 0.9, 1.06, 0.84][index])
  const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / (values.length || 1)
  const volumeMean = average(volumeFactors)
  const intensityMean = average(intensityFactors)
  return ordered.map((day, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + day.offset)
    const dateKey = localDateKey(date)
    const saved = sessions.find(session => session.fecha_calendario === dateKey)
    return {
      ...day,
      fecha: dateKey,
      volumen: saved?.volumen_planificado ?? Math.min(100, Math.round(weekly.carga.volumen * volumeFactors[index] / volumeMean)),
      intensidad: saved?.intensidad_planificada ?? Math.min(100, Math.round(weekly.carga.intensidad * intensityFactors[index] / intensityMean)),
      session: saved ?? null,
    }
  })
}

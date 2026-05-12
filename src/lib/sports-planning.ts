export type PlanningConfig = {
  fecha_inicio?: string | null
  fecha_competencia?: string | null
  semanas_totales?: number | null
  semanas_preparatorio?: number | null
  semanas_competitivo?: number | null
  competencias_secundarias?: Array<{ nombre?: string; fecha?: string }> | null
}

export type WeekPlan = {
  semana: number
  objetivo: string
  etapa: string
  mesociclo: string
  microciclo: MicrocycleType
  carga: {
    volumen: number
    intensidad: number
    forma: number
  }
  competenciaCercana: boolean
  diasParaCompetencia: number | null
}

export type MicrocycleType = 'A' | 'C' | 'CH' | 'R' | 'AP' | 'COMP' | 'T'

export const MICRO_CYCLE_STYLE: Record<MicrocycleType, { label: string; color: string }> = {
  A: { label: 'Ajuste', color: 'bg-[#34d399]' },
  C: { label: 'Carga', color: 'bg-[#fbbf24]' },
  CH: { label: 'Choque', color: 'bg-[#f43f5e]' },
  R: { label: 'Recuperación', color: 'bg-[#60a5fa]' },
  AP: { label: 'Aproximación', color: 'bg-[#a78bfa]' },
  COMP: { label: 'Competencia', color: 'bg-[#f59e0b]' },
  T: { label: 'Transición', color: 'bg-[#94a3b8]' },
}

export function calculateCurrentWeek(config: PlanningConfig, today = new Date()) {
  const total = normalizeTotalWeeks(config)
  if (!config.fecha_inicio) return 1

  const currentMonday = mondayOf(toMidday(today))
  const startMonday = mondayOf(parseLocalDate(config.fecha_inicio))
  const diffDays = Math.round((currentMonday.getTime() - startMonday.getTime()) / dayMs)
  const calculated = Math.floor(diffDays / 7) + 1

  return clamp(calculated, 1, total)
}

export function buildPlanningModel(config: PlanningConfig) {
  const total = normalizeTotalWeeks(config)
  const preparatorio = clamp(Number(config.semanas_preparatorio || Math.round(total * 0.8)), 1, total)
  const competitivo = Math.max(0, Math.min(total - preparatorio, Number(config.semanas_competitivo || total - preparatorio)))
  const transicion = total >= 8 ? 1 : 0
  const competitivoReal = Math.max(0, competitivo - transicion)

  const general = Math.max(1, Math.round(preparatorio * 0.6))
  const especial = Math.max(0, preparatorio - general)
  const precompetitivo = Math.max(1, Math.round(competitivoReal * 0.5))
  const competitivoPico = Math.max(0, competitivoReal - precompetitivo)

  const entrante = Math.max(1, Math.round(general * 0.3))
  const basicoDesarrollador = Math.max(0, general - entrante)
  const basicoEstabilizador = Math.max(1, Math.round(especial * 0.6))
  const control = Math.max(0, especial - basicoEstabilizador)
  const pulimiento = precompetitivo
  const competitivoMeso = Math.max(0, competitivoPico)
  const restablecimiento = transicion

  return {
    total,
    preparatorio,
    competitivo,
    transicion,
    general,
    especial,
    precompetitivo,
    competitivoPico,
    entrante,
    basicoDesarrollador,
    basicoEstabilizador,
    control,
    pulimiento,
    competitivoMeso,
    restablecimiento,
  }
}

export function getWeekPlan(config: PlanningConfig, semana: number): WeekPlan {
  const model = buildPlanningModel(config)
  const week = clamp(semana, 1, model.total)
  const competition = competitionProximity(config, week)

  let etapa = 'Preparación General'
  let mesociclo = 'Entrante'

  if (week <= model.entrante) {
    etapa = 'Preparación General'
    mesociclo = 'Entrante'
  } else if (week <= model.general) {
    etapa = 'Preparación General'
    mesociclo = 'Básico Desarrollador'
  } else if (week <= model.general + model.basicoEstabilizador) {
    etapa = 'Preparación Especial'
    mesociclo = 'Básico Estabilizador'
  } else if (week <= model.general + model.especial) {
    etapa = 'Preparación Especial'
    mesociclo = 'Control y Prep.'
  } else if (week <= model.preparatorio + model.precompetitivo) {
    etapa = 'Pre-Competitiva'
    mesociclo = 'Pulimiento'
  } else if (week <= model.total - model.transicion) {
    etapa = 'Competitiva'
    mesociclo = 'Competitivo'
  } else {
    etapa = 'Transición'
    mesociclo = 'Restablecimiento'
  }

  const microciclo = getMicrocycleType(week, model, competition.isNear)
  const carga = getLoadForWeek(week, model, microciclo)

  return {
    semana: week,
    objetivo: `${etapa} (${mesociclo})`,
    etapa,
    mesociclo,
    microciclo,
    carga,
    competenciaCercana: competition.isNear,
    diasParaCompetencia: competition.days,
  }
}

export function getSessionTimeDistribution(objetivoFase: string, competenciaCercana = false) {
  const fase = normalizeText(objetivoFase)

  if (competenciaCercana || fase.includes('compet') || fase.includes('pulimiento')) {
    return { calentamiento: '15', prep_fisica: '10', tecnico: '30', rutinas: '45', flexibilidad: '10', cierre: '10' }
  }

  if (fase.includes('transicion') || fase.includes('restablecimiento')) {
    return { calentamiento: '15', prep_fisica: '10', tecnico: '25', rutinas: '10', flexibilidad: '30', cierre: '30' }
  }

  if (fase.includes('general') || fase.includes('base') || fase.includes('entrante')) {
    return { calentamiento: '15', prep_fisica: '35', tecnico: '40', rutinas: '0', flexibilidad: '20', cierre: '10' }
  }

  if (fase.includes('especial') || fase.includes('control')) {
    return { calentamiento: '15', prep_fisica: '25', tecnico: '45', rutinas: '15', flexibilidad: '10', cierre: '10' }
  }

  return { calentamiento: '15', prep_fisica: '20', tecnico: '40', rutinas: '20', flexibilidad: '15', cierre: '10' }
}

export function getCompetitionProximityForDate(
  dateValue: string | null | undefined,
  dates: Array<string | null | undefined>,
  windowDays = 10
) {
  if (!dateValue) return { isNear: false, days: null as number | null }
  const sessionDate = parseLocalDate(dateValue)
  let nearest: number | null = null

  dates.filter((date): date is string => Boolean(date)).forEach(date => {
    const diff = Math.ceil((parseLocalDate(date).getTime() - sessionDate.getTime()) / dayMs)
    if (diff >= 0 && (nearest === null || diff < nearest)) nearest = diff
  })

  return { isNear: nearest !== null && nearest <= windowDays, days: nearest }
}

export function getWeekStartDate(config: PlanningConfig, semana: number) {
  if (!config.fecha_inicio) return null
  const startMonday = mondayOf(parseLocalDate(config.fecha_inicio))
  const date = new Date(startMonday)
  date.setDate(startMonday.getDate() + (semana - 1) * 7)
  return date
}

function getMicrocycleType(week: number, model: ReturnType<typeof buildPlanningModel>, competitionNear: boolean): MicrocycleType {
  if (week > model.total - model.transicion) return 'T'
  if (competitionNear) return 'AP'
  if (week > model.preparatorio + model.precompetitivo && week <= model.total - model.transicion) return 'COMP'
  if (week > model.preparatorio) return 'AP'
  if (week % 4 === 0) return 'R'
  if (week > model.general && week % 3 === 0) return 'CH'
  if (week === 1) return 'A'
  return 'C'
}

function getLoadForWeek(week: number, model: ReturnType<typeof buildPlanningModel>, microcycle: MicrocycleType) {
  const progress = model.total <= 1 ? 0 : (week - 1) / (model.total - 1)
  let volumen = 85 - progress * 60
  let intensidad = 30 + progress * 55
  let forma = 20 + progress * 70

  if (microcycle === 'CH') {
    volumen += 8
    intensidad += 8
    forma -= 3
  }
  if (microcycle === 'R') {
    volumen -= 18
    intensidad -= 12
    forma += 4
  }
  if (microcycle === 'AP') {
    volumen -= 15
    intensidad += 8
    forma += 8
  }
  if (microcycle === 'COMP') {
    volumen = 25
    intensidad = 92
    forma = 95
  }
  if (microcycle === 'T') {
    volumen = 20
    intensidad = 40
    forma = 55
  }

  return {
    volumen: Math.round(clamp(volumen, 10, 100)),
    intensidad: Math.round(clamp(intensidad, 10, 100)),
    forma: Math.round(clamp(forma, 10, 100)),
  }
}

function competitionProximity(config: PlanningConfig, week: number) {
  const weekStart = getWeekStartDate(config, week)
  if (!weekStart) return { isNear: false, days: null }

  const dates = [
    config.fecha_competencia,
    ...(config.competencias_secundarias || []).map(comp => comp.fecha),
  ].filter((date): date is string => Boolean(date))

  let nearest: number | null = null
  dates.forEach(date => {
    const diff = Math.ceil((parseLocalDate(date).getTime() - weekStart.getTime()) / dayMs)
    if (diff >= 0 && (nearest === null || diff < nearest)) nearest = diff
  })

  return { isNear: nearest !== null && nearest <= 10, days: nearest }
}

function normalizeTotalWeeks(config: PlanningConfig) {
  return Math.max(1, Number(config.semanas_totales || 1))
}

function parseLocalDate(value: string) {
  return new Date(`${value}T12:00:00`)
}

function toMidday(date: Date) {
  const copy = new Date(date)
  copy.setHours(12, 0, 0, 0)
  return copy
}

function mondayOf(date: Date) {
  const copy = new Date(date)
  const day = copy.getDay()
  copy.setDate(copy.getDate() - (day === 0 ? 6 : day - 1))
  return copy
}

function normalizeText(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

const dayMs = 1000 * 60 * 60 * 24

import { z } from 'zod'
import { getWeekPlan, type PlanningConfig } from './sports-planning'
import { getSessionDayProfile } from './session-focus'
import type { TrainingDay } from './weekly-load-planning'

const doseSchema = z.object({
  avanzado: z.string().max(500),
  base: z.string().max(500),
  desarrollo: z.string().max(500),
})

const exerciseSchema = z.object({
  id: z.string().uuid(),
  dosificacion: doseSchema,
})

const proposalSchema = z.object({
  calentamiento: z.array(exerciseSchema).max(20),
  'prep-fisica': z.array(exerciseSchema).max(20),
  tecnico: z.array(exerciseSchema).max(20),
  rutinas: z.array(exerciseSchema).max(20),
  flexibilidad: z.array(exerciseSchema).max(20),
  cierre: z.array(exerciseSchema).max(20),
})

export type WeeklySessionProposal = z.infer<typeof proposalSchema>

export function parseWeeklySessionProposal(value: unknown): WeeklySessionProposal | null {
  const parsed = proposalSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export function proposalExerciseIds(proposal: WeeklySessionProposal): string[] {
  return [...new Set(Object.values(proposal).flat().map(item => item.id))]
}

export function buildWeeklySessionRequest({ config, weekNumber, day, level, trainingDays, priorExerciseIds }: {
  config: PlanningConfig
  weekNumber: number
  day: TrainingDay & { fecha: string; volumen: number; intensidad: number }
  level: string
  trainingDays: number
  priorExerciseIds: string[]
}) {
  const week = getWeekPlan(config, weekNumber)
  const profile = getSessionDayProfile(day.enfoque || '', day.aparatos || '')
  return {
    nivel: level,
    objetivo: `${week.objetivo} | ${week.etapa} | ${week.mesociclo} | Microciclo ${week.microciclo}`.slice(0, 160),
    semana: `Semana ${weekNumber}`,
    dia: day.dia,
    enfoqueDia: (day.enfoque || 'Entrenamiento general').slice(0, 160),
    aparatosDia: (day.aparatos || '').slice(0, 160),
    tipoSesion: profile.kind,
    horario: (day.hora || '').slice(0, 80),
    competenciasSecundarias: [
      ...(config.fecha_competencia ? [{ nombre: 'Competencia principal', fecha: config.fecha_competencia }] : []),
      ...(config.competencias_secundarias || []),
    ],
    diasEntrenamiento: Math.min(7, Math.max(1, trainingDays)),
    fechaSesionActual: day.fecha,
    cargaDia: { volumen: day.volumen, intensidad: day.intensidad },
    ejerciciosPropuestosPrevios: priorExerciseIds.slice(-100),
  }
}

export function parseStoredWeeklyProposals(value: string | null, signature: string): Record<string, WeeklySessionProposal> {
  if (!value) return {}
  try {
    const stored = JSON.parse(value) as { signature?: unknown; drafts?: unknown }
    if (stored.signature !== signature || !stored.drafts || typeof stored.drafts !== 'object' || Array.isArray(stored.drafts)) return {}
    return Object.fromEntries(Object.entries(stored.drafts).flatMap(([date, draft]) => {
      const parsed = parseWeeklySessionProposal(draft)
      return /^\d{4}-\d{2}-\d{2}$/.test(date) && parsed ? [[date, parsed]] : []
    }))
  } catch {
    return {}
  }
}

import { describe, expect, it } from 'vitest'
import { buildWeeklySessionRequest, parseStoredWeeklyProposals, parseWeeklySessionProposal, proposalExerciseIds } from './weekly-session-proposals'
import { getWeekPlan } from './sports-planning'

const id = '00000000-0000-4000-8000-000000000001'
const item = { id, dosificacion: { avanzado: '3 series', base: '2 series', desarrollo: '1 serie' } }
const proposal = { calentamiento: [item], 'prep-fisica': [], tecnico: [item], rutinas: [], flexibilidad: [], cierre: [] }

describe('weekly session proposals', () => {
  it('accepts a complete proposal and deduplicates exercise ids', () => {
    const parsed = parseWeeklySessionProposal(proposal)
    expect(parsed).not.toBeNull()
    expect(proposalExerciseIds(parsed!)).toEqual([id])
  })

  it('ignores stored proposals when the macrocycle configuration changes', () => {
    const stored = JSON.stringify({ signature: 'old', drafts: { '2026-10-16': proposal } })
    expect(parseStoredWeeklyProposals(stored, 'new')).toEqual({})
    expect(parseStoredWeeklyProposals(stored, 'old')['2026-10-16']).toBeTruthy()
  })

  it('rejects malformed or empty training payloads', () => {
    expect(parseWeeklySessionProposal({ ...proposal, tecnico: [{ id: 'unknown' }] })).toBeNull()
    expect(parseStoredWeeklyProposals('{', 'any')).toEqual({})
  })

  it('passes macrocycle phase, mesocycle, daily load, and competition dates to generation', () => {
    const config = {
      fecha_inicio: '2026-10-05', fecha_fin: '2026-12-13', semanas_totales: 10,
      fecha_competencia: '2026-10-16', competencias_secundarias: [{ nombre: 'Copa', fecha: '2026-12-04' }],
    }
    const week = getWeekPlan(config, 2)
    const request = buildWeeklySessionRequest({
      config, weekNumber: 2, level: 'Nivel 2', trainingDays: 5, priorExerciseIds: [id],
      day: { dia: 'Viernes', fecha: '2026-10-16', enfoque: 'Barras', aparatos: 'Barras Asimétricas', volumen: 30, intensidad: 75 },
    })
    expect(request.objetivo).toContain(week.etapa)
    expect(request.objetivo).toContain(week.mesociclo)
    expect(request.cargaDia).toEqual({ volumen: 30, intensidad: 75 })
    expect(request.competenciasSecundarias).toHaveLength(2)
    expect(request.ejerciciosPropuestosPrevios).toEqual([id])
  })
})

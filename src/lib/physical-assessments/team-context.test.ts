import { describe, expect, it } from 'vitest'
import { summarizeTeamAssessments, type AssessmentSession } from './team-context'

const session = (athlete: string, date: string, value: number, unit = 'segundos'): AssessmentSession => ({
  atleta_id: athlete,
  fecha: date,
  resultados_pruebas_fisicas: [{ prueba_id: 'balance', valor: value, unidad: unit, catalogo_pruebas_fisicas: [{ nombre: 'Balance', mayor_es_mejor: true }] }],
})

describe('team assessment context', () => {
  it('compares only repeated measurements of the same athlete and unit', () => {
    const summary = summarizeTeamAssessments([
      session('a', '2026-10-10', 20),
      session('a', '2026-09-10', 15),
      session('b', '2026-10-11', 8),
      session('b', '2026-09-11', 12),
      session('c', '2026-10-12', 10, 'repeticiones'),
    ], 5)
    expect(summary.athletesAssessed).toBe(3)
    expect(summary.tests[0]).toMatchObject({ athletes: 2, pairedAthletes: 2, improved: 1, declined: 1, meanLatest: 14 })
  })

  it('does not invent a trend from different athletes or a different unit', () => {
    const summary = summarizeTeamAssessments([session('a', '2026-10-10', 20), session('b', '2026-09-10', 10), session('a', '2026-09-10', 10, 'repeticiones')], 2)
    expect(summary.tests[0].pairedAthletes).toBe(0)
  })
})

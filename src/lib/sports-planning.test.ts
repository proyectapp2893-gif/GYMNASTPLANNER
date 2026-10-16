import { describe, expect, it } from 'vitest'
import { buildMacroChartData } from './macro-chart'
import { getSessionTimeDistribution, getTotalWeeks, getWeekPlan, getWeekStartDate, type PlanningConfig } from './sports-planning'
import { getWeeklyLoadDays } from './weekly-load-planning'

const octoberCompetition: PlanningConfig = {
  fecha_inicio: '2026-08-10',
  fecha_fin: '2026-12-11',
  fecha_competencia: '2026-10-16',
  competencias_secundarias: [{ nombre: 'Caribbean Cup', fecha: '2026-09-26' }],
  semanas_totales: 17,
  semanas_preparatorio: 14,
  semanas_competitivo: 3,
}

describe('date anchored periodization', () => {
  it('includes the final partial calendar week from the saved season dates', () => {
    expect(getTotalWeeks(octoberCompetition)).toBe(18)
    expect(getWeekStartDate(octoberCompetition, 18)?.toISOString().slice(0, 10)).toBe('2026-12-07')
  })

  it('places the main competition on its real week and removes the November phantom peak', () => {
    const chart = buildMacroChartData(octoberCompetition)
    expect(chart).toHaveLength(18)
    expect(getWeekPlan(octoberCompetition, 9).microciclo).toBe('AP')
    expect(getWeekPlan(octoberCompetition, 10)).toMatchObject({ etapa: 'Competitiva', mesociclo: 'Competencia principal', microciclo: 'COMP' })
    expect(getWeekPlan(octoberCompetition, 11)).toMatchObject({ etapa: 'Recuperación', microciclo: 'R' })
    expect(getWeekPlan(octoberCompetition, 16)).toMatchObject({ etapa: 'Continuidad', microciclo: 'R' })
    expect(chart[9].FormaDeportiva).toBeGreaterThan(chart[15].FormaDeportiva)
    expect(chart[15].tipoMicrociclo).not.toBe('Competencia')
  })

  it('identifies a secondary event as competition and recovers afterward', () => {
    expect(getWeekPlan(octoberCompetition, 6).microciclo).toBe('AP')
    expect(getWeekPlan(octoberCompetition, 7)).toMatchObject({ mesociclo: 'Competencia secundaria', microciclo: 'COMP' })
    expect(getWeekPlan(octoberCompetition, 8)).toMatchObject({ etapa: 'Recuperación', microciclo: 'R' })
  })

  it('does not need a main event to place a configured secondary competition', () => {
    const config = { ...octoberCompetition, fecha_competencia: null }
    expect(getWeekPlan(config, 7)).toMatchObject({ mesociclo: 'Competencia secundaria', microciclo: 'COMP' })
    expect(getWeekPlan(config, 8).microciclo).toBe('R')
  })

  it('rebuilds a specific load block when a December competition is added', () => {
    const withDecember = {
      ...octoberCompetition,
      competencias_secundarias: [
        ...octoberCompetition.competencias_secundarias!,
        { nombre: 'Copa de diciembre', fecha: '2026-12-04' },
      ],
    }
    expect(getWeekPlan(withDecember, 12)).toMatchObject({ etapa: 'Preparación Especial', mesociclo: 'Nuevo bloque específico', microciclo: 'C' })
    expect(getWeekPlan(withDecember, 13).microciclo).toBe('CH')
    expect(getWeekPlan(withDecember, 16).microciclo).toBe('AP')
    expect(getWeekPlan(withDecember, 17)).toMatchObject({ etapa: 'Competitiva', microciclo: 'COMP' })
    expect(getWeekPlan(withDecember, 18).microciclo).toBe('R')
    expect(getWeekPlan(withDecember, 15).carga.forma).toBeLessThan(getWeekPlan(withDecember, 17).carga.forma)
    expect(buildMacroChartData(withDecember)[16].tipoMicrociclo).toBe('Competencia')
    expect(getSessionTimeDistribution(getWeekPlan(withDecember, 12).objetivo).prep_fisica).toBe('25')
    expect(getSessionTimeDistribution(getWeekPlan(withDecember, 16).objetivo).rutinas).toBe('45')
    const schedule = [{ dia: 'Lunes' }, { dia: 'Miércoles' }, { dia: 'Viernes' }]
    expect(getWeeklyLoadDays(withDecember, 16, schedule)[0].volumen)
      .toBeLessThan(getWeeklyLoadDays(withDecember, 15, schedule)[0].volumen)
  })

  it('ignores competitions after the configured season end', () => {
    const outside = { ...octoberCompetition, competencias_secundarias: [{ fecha: '2026-12-19' }] }
    expect(getWeekPlan(outside, 18).microciclo).toBe('T')
  })

  it('uses the original duration based plan when no competition date is configured', () => {
    const config = { fecha_inicio: '2026-08-10', semanas_totales: 17, semanas_preparatorio: 14, semanas_competitivo: 3 }
    expect(getWeekPlan(config, 16)).toMatchObject({ etapa: 'Competitiva', microciclo: 'COMP' })
  })
})

import { describe, expect, it } from 'vitest'
import { buildReportModel, sessionDetails } from './model'
import { pdfSample } from './pdf.fixture'
import { buildMacroChartData } from '../macro-chart'

describe('report uses assigned days and saved information', () => {
  it('shows exactly three configured weekdays in a complete week, not seven', () => {
    const model = buildReportModel(pdfSample)
    const week = model.monthWeeks.find(week => week.start === '2026-09-07')!
    expect(week.days.map(day => day.date)).toEqual(['2026-09-08', '2026-09-10', '2026-09-12'])
    expect(week.days[2].sessions).toEqual([])
    expect(week.days[2].scheduled).toEqual([{ dia: 'Sábado' }])
    expect(model.monthWeeks.at(-1)!.days.map(day => day.date)).toEqual(['2026-09-29'])
  })
  it('does not invent a weekly schedule when none is recorded', () => {
    const model = buildReportModel({ ...pdfSample, config: { ...pdfSample.config, horario_semanal: null } })
    expect(model.monthWeeks.flatMap(week => week.days).map(day => day.date)).toEqual(pdfSample.sessions.map(session => session.fecha_calendario))
  })
  it('preserves an actual off-schedule session and identifies it as not assigned', () => {
    const model = buildReportModel({ ...pdfSample, sessions: [...pdfSample.sessions, { id: 'extra', fecha_calendario: '2026-09-09' }] })
    const day = model.monthWeeks.flatMap(week => week.days).find(day => day.date === '2026-09-09')!
    expect(day.scheduled).toEqual([])
    expect(day.sessions[0].id).toBe('extra')
  })
  it('does not add assigned days outside the configured dates', () => {
    const model = buildReportModel({ ...pdfSample, config: { ...pdfSample.config, fecha_inicio: '2026-09-09', fecha_fin: '2026-09-20', semanas_totales: 2 } })
    expect(model.monthWeeks.flatMap(week => week.days).filter(day => day.scheduled.length).map(day => day.date))
      .toEqual(['2026-09-10', '2026-09-12', '2026-09-15', '2026-09-17', '2026-09-19'])
  })
  it('keeps recorded details and does not substitute assumed durations', () => {
    const input = { ...pdfSample, config: { ...pdfSample.config, horario_semanal: [{ dia: 'Martes', hora: '16:00', lugar: 'Gimnasio' }] } }
    const session = { ...pdfSample.sessions[0], hora_inicio: '17:00', duracion_prevista_min: 90, observaciones: 'Trabajar recepciones' }
    expect(sessionDetails(input, session)).toEqual({ time: '17:00', place: 'Gimnasio', duration: '90 min', notes: 'Trabajar recepciones' })
    expect(sessionDetails(input, pdfSample.sessions[0]).duration).toBe('No registrada')
  })
  it('uses the exact dashboard loads and microcycles for the configured cycle', () => {
    const chart = buildMacroChartData(pdfSample.config)
    const report = buildReportModel(pdfSample)
    expect(chart).toHaveLength(report.weeks.length)
    chart.forEach((point, index) => {
      expect([point.Volumen, point.Intensidad, point.FormaDeportiva]).toEqual(Object.values(report.weeks[index].carga))
      expect(point.name).toBe(`S${index + 1}`)
    })
  })
})

import { describe, expect, it } from 'vitest'
import { getWeeklyLoadDays } from './weekly-load-planning'
import type { PlanningConfig } from './sports-planning'
import { buildFallbackSession } from './ai-helpers'

const config: PlanningConfig = {
  fecha_inicio: '2026-10-07', // Wednesday: week starts on Monday.
  semanas_totales: 16,
  semanas_preparatorio: 12,
  semanas_competitivo: 4,
}

describe('getWeeklyLoadDays', () => {
  it('orders configured training days and assigns dates in the selected week', () => {
    const days = getWeeklyLoadDays(config, 2, [{ dia: 'Viernes' }, { dia: 'Lunes' }, { dia: 'Miércoles' }])
    expect(days.map(day => [day.dia, day.fecha])).toEqual([
      ['Lunes', '2026-10-12'], ['Miércoles', '2026-10-14'], ['Viernes', '2026-10-16'],
    ])
  })

  it('varies load within the week and retains targets from saved sessions', () => {
    const schedule = ['Lunes', 'Martes', 'Miércoles', 'Jueves'].map(dia => ({ dia }))
    const days = getWeeklyLoadDays(config, 2, schedule, [{
      id: 'saved', fecha_calendario: '2026-10-13', objetivo: 'Técnica',
      volumen_planificado: 37, intensidad_planificada: 55, duracion_prevista_min: 120,
      estado: 'borrador', exerciseCount: 12,
    }])
    expect(days[1].session?.id).toBe('saved')
    expect([days[1].volumen, days[1].intensidad]).toEqual([37, 55])
    expect(days[0].volumen).not.toBe(days[2].volumen)
    expect(days.every(day => day.volumen >= 0 && day.volumen <= 100 && day.intensidad >= 0 && day.intensidad <= 100)).toBe(true)
  })
})

it('reduces the fallback session during a low volume day', () => {
  const exercises = Array.from({ length: 5 }, (_, index) => ({ id: `exercise-${index}`, categoria: 'Preparación física' }))
  const regular = buildFallbackSession(exercises, 'Preparación General')
  const recovery = buildFallbackSession(exercises, 'Preparación General', '', '', { volumen: 35, intensidad: 40 })
  expect(regular['prep-fisica']).toHaveLength(5)
  expect(recovery['prep-fisica']).toHaveLength(3)
  expect(recovery['prep-fisica'][0].dosificacion.avanzado).toContain('2-3 series')
})

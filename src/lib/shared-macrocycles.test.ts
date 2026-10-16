import { describe, expect, it } from 'vitest'
import { isConfiguredMacrocycle, monthBounds, sanitizeSharedSession } from './shared-macrocycles'

describe('shared macrocycle data', () => {
  it('only allows a configured calendar to be shared', () => {
    expect(isConfiguredMacrocycle({ fecha_inicio: '2026-10-01', semanas_totales: 20, horario_semanal: [{ dia: 'Lunes' }] })).toBe(true)
    expect(isConfiguredMacrocycle({ fecha_inicio: '2026-10-01', semanas_totales: 20, horario_semanal: [] })).toBe(false)
    expect(isConfiguredMacrocycle({ fecha_inicio: null, semanas_totales: 20, horario_semanal: [{ dia: 'Lunes' }] })).toBe(false)
  })

  it('uses exact month boundaries, including leap years', () => {
    expect(monthBounds('2028-02')).toEqual({ start: '2028-02-01', end: '2028-02-29' })
    expect(monthBounds('2026-13')).toBeNull()
  })

  it('publishes only exercise fields needed for reading the training', () => {
    const result = sanitizeSharedSession({
      id: 'session', grupo_id: 'group', fecha_calendario: '2026-10-16', objetivo: 'Técnica', duracion_prevista_min: 120,
      ejercicios: { tecnico_aparato1: [{ id: 'secret-id', contenido: 'Giro', descripcion_corta: 'Control de postura', dosificacion: { base: '2 series' }, video_url: 'private-video', observaciones: 'nota privada' }] },
    })
    expect(result?.bloques[0].ejercicios[0]).toEqual({ nombre: 'Giro', categoria: '', descripcion: 'Control de postura', dosificacion: { base: '2 series' } })
    expect(JSON.stringify(result)).not.toContain('secret-id')
    expect(JSON.stringify(result)).not.toContain('private-video')
    expect(JSON.stringify(result)).not.toContain('nota privada')
  })
})

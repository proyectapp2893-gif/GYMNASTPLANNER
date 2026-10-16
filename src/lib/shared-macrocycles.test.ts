import { describe, expect, it, vi } from 'vitest'

const service = vi.hoisted(() => vi.fn())
vi.mock('./supabase-server', () => ({ createSupabaseServiceClient: service }))
import { getConfiguredGroups, isConfiguredMacrocycle, monthBounds, sanitizeSharedSession } from './shared-macrocycles'

describe('shared macrocycle data', () => {
  it('loads configured groups without assuming an undeployed deleted_at column', async () => {
    const groupQuery = {
      select: vi.fn(), eq: vi.fn(), order: vi.fn(),
      then: (resolve: (value: unknown) => void) => resolve({ data: [{ id: 'group', nombre: 'Equipo', nivel: 'Nivel 1' }], error: null }),
    }
    groupQuery.select.mockReturnValue(groupQuery)
    groupQuery.eq.mockReturnValue(groupQuery)
    groupQuery.order.mockReturnValue(groupQuery)
    const configQuery = {
      select: vi.fn(), in: vi.fn(async () => ({ data: [{ grupo_id: 'group', fecha_inicio: '2026-10-01', semanas_totales: 20, horario_semanal: [{ dia: 'Lunes' }] }], error: null })),
    }
    configQuery.select.mockReturnValue(configQuery)
    service.mockReturnValue({ from: vi.fn((table: string) => table === 'grupos' ? groupQuery : configQuery) })
    const groups = await getConfiguredGroups('club')
    expect(groups).toHaveLength(1)
    expect(groupQuery.eq).toHaveBeenCalledWith('club_id', 'club')
    expect(configQuery.in).toHaveBeenCalledWith('grupo_id', ['group'])
  })

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

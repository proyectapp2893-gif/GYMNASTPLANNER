import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { service, configured } = vi.hoisted(() => ({ service: vi.fn(), configured: vi.fn() }))
vi.mock('../../../../lib/supabase-server', () => ({ createSupabaseServiceClient: service }))
vi.mock('../../../../lib/shared-macrocycles', async importOriginal => {
  const original = await importOriginal<typeof import('../../../../lib/shared-macrocycles')>()
  return { ...original, getConfiguredGroups: configured }
})
import { GET } from './route'

const token = '49d75a63-1c85-4cea-9b56-c571b9eeb133'
const groupA = { id: 'group-a', nombre: 'Equipo A', nivel: 'Nivel 1', config: { fecha_inicio: '2026-01-01', semanas_totales: 40, horario_semanal: [{ dia: 'Lunes' }] } }
const groupB = { id: 'group-b', nombre: 'Equipo B', nivel: 'Nivel 2', config: { fecha_inicio: '2026-01-01', semanas_totales: 40, horario_semanal: [{ dia: 'Martes' }] } }

function request(month = '2026-10') {
  return new NextRequest(`http://localhost/api/plan-publico/${token}?mes=${month}`)
}

function database(active: boolean, groupId: string | null = null) {
  const queries: Record<string, Record<string, ReturnType<typeof vi.fn>>> = {}
  const from = vi.fn((table: string) => {
    const query: Record<string, ReturnType<typeof vi.fn>> = {}
    for (const method of ['select', 'eq', 'is', 'in', 'gte', 'lte', 'order']) query[method] = vi.fn(() => query)
    query.maybeSingle = vi.fn(async () => table === 'enlaces_macrociclo'
      ? { data: { club_id: 'club-a', grupo_id: groupId, activo: active }, error: null }
      : { data: { nombre: 'Club A' }, error: null })
    query.limit = vi.fn(async () => ({ data: [{ id: 'session-a', grupo_id: 'group-a', fecha_calendario: '2026-10-05', objetivo: 'Técnica', duracion_prevista_min: 120, ejercicios: {} }], error: null }))
    queries[table] = query
    return query
  })
  service.mockReturnValue({ from })
  return { from, queries }
}

beforeEach(() => { vi.clearAllMocks(); configured.mockResolvedValue([groupA, groupB]) })

describe('public macrocycle calendar', () => {
  it('denies inactive links before loading group data', async () => {
    const db = database(false)
    const response = await GET(request(), { params: Promise.resolve({ token }) })
    expect(response.status).toBe(404)
    expect(configured).not.toHaveBeenCalled()
    expect(db.from).toHaveBeenCalledTimes(1)
  })

  it('limits a group link to its club, group and month', async () => {
    const db = database(true, 'group-a')
    const response = await GET(request(), { params: Promise.resolve({ token }) })
    expect(response.status).toBe(200)
    expect(configured).toHaveBeenCalledWith('club-a')
    expect(db.queries.sesiones.eq).toHaveBeenCalledWith('club_id', 'club-a')
    expect(db.queries.sesiones.in).toHaveBeenCalledWith('grupo_id', ['group-a'])
    expect(db.queries.sesiones.is).toHaveBeenCalledWith('atleta_id', null)
    expect(db.queries.sesiones.gte).toHaveBeenCalledWith('fecha_calendario', '2026-10-01')
    expect(db.queries.sesiones.lte).toHaveBeenCalledWith('fecha_calendario', '2026-10-31')
    expect((await response.json()).groups).toHaveLength(1)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })
})

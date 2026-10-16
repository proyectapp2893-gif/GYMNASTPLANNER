import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { auth, workbook, pdf } = vi.hoisted(() => ({ auth: vi.fn(), workbook: vi.fn(), pdf: vi.fn() }))
vi.mock('../../../../lib/supabase-server', () => ({ getAuthenticatedClub: auth }))
vi.mock('../../../../lib/monthly-report/workbook', () => ({ createMonthlyWorkbook: workbook }))
vi.mock('../../../../lib/monthly-report/pdf', () => ({ createMonthlyPdf: pdf }))
import { POST } from './route'

const options = { grupoId: '08d57d49-7f7c-4c12-aa97-ea47a185d8f4', mes: '2026-09', modalidad: 'Gimnasia artística', categoria: 'Femenino' }
function request(body: unknown = options) {
  return new NextRequest('http://localhost/api/reportes/mensual', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
}
function database({ authorized = true, sessions = [{ id: '1', fecha_calendario: '2026-09-01' }] }: { authorized?: boolean; sessions?: unknown[] } = {}) {
  const queries: Record<string, ReturnType<typeof vi.fn>>[] = []
  const from = vi.fn((table: string) => {
    const result = table === 'grupos' ? { data: authorized ? { id: options.grupoId, nombre: 'Selección' } : null, error: null }
      : table === 'configuracion_grupos_efectiva' ? { data: { fecha_inicio: '2026-01-01', semanas_totales: 52 }, error: null }
      : table === 'clubs' ? { data: { nombre: 'Club' }, error: null }
      : { data: sessions, error: null }
    const query: Record<string, ReturnType<typeof vi.fn>> = {}
    for (const method of ['select', 'eq', 'is', 'gte', 'lt', 'order']) query[method] = vi.fn(() => query)
    for (const method of ['maybeSingle', 'single', 'range']) query[method] = vi.fn(async () => result)
    queries.push(query)
    return query
  })
  auth.mockResolvedValue({ supabase: { from }, clubId: 'club-a', error: null })
  return { from, queries }
}

beforeEach(() => { vi.clearAllMocks(); workbook.mockResolvedValue(new Uint8Array([80, 75])); pdf.mockResolvedValue(new TextEncoder().encode('%PDF-1.7')) })
describe('monthly report authorization and export', () => {
  it('rejects unauthenticated requests', async () => {
    auth.mockResolvedValue({ clubId: null, error: 'No autenticado' })
    expect((await POST(request())).status).toBe(401)
    expect(workbook).not.toHaveBeenCalled()
  })
  it('rejects a group from another club before loading its data', async () => {
    const db = database({ authorized: false })
    expect((await POST(request())).status).toBe(403)
    expect(db.from).toHaveBeenCalledTimes(1)
    expect(db.queries[0].eq).toHaveBeenCalledWith('club_id', 'club-a')
    expect(workbook).not.toHaveBeenCalled()
  })
  it('validates the requested month', async () => {
    const db = database()
    expect((await POST(request({ ...options, mes: '2026-00' }))).status).toBe(400)
    expect(db.from).not.toHaveBeenCalled()
  })
  it('scopes sessions to club, group and month and sends a private Excel download', async () => {
    const db = database()
    const response = await POST(request())
    expect(response.status).toBe(200)
    const query = db.queries[3]
    expect(query.eq).toHaveBeenCalledWith('club_id', 'club-a')
    expect(query.eq).toHaveBeenCalledWith('grupo_id', options.grupoId)
    expect(query.is).toHaveBeenCalledWith('atleta_id', null)
    expect(query.is).toHaveBeenCalledWith('deleted_at', null)
    expect(query.gte).toHaveBeenCalledWith('fecha_calendario', '2026-09-01')
    expect(query.lt).toHaveBeenCalledWith('fecha_calendario', '2026-10-01')
    expect(query.range).toHaveBeenCalledWith(0, 499)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(response.headers.get('Content-Type')).toContain('spreadsheetml')
    expect(decodeURIComponent(response.headers.get('Content-Disposition')!)).toContain('SEPTIEMBRE – GIMNASIA ARTÍSTICA – FEMENINO – 2026.xlsx')
  })
  it('explains empty months without generating a workbook', async () => {
    database({ sessions: [] })
    const response = await POST(request())
    expect(response.status).toBe(422)
    expect((await response.json()).error).toContain('No hay sesiones guardadas')
    expect(workbook).not.toHaveBeenCalled()
  })
  it('downloads PDF through the same authorized group and month filters', async () => {
    const db = database()
    const response = await POST(request({ ...options, formato: 'pdf' }))
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(decodeURIComponent(response.headers.get('Content-Disposition')!)).toContain('SEPTIEMBRE – GIMNASIA ARTÍSTICA – FEMENINO – 2026.pdf')
    expect(await response.text()).toBe('%PDF-1.7')
    expect(pdf).toHaveBeenCalledWith(expect.objectContaining({ grupo: 'Selección', mes: options.mes }))
    expect(db.queries[3].eq).toHaveBeenCalledWith('club_id', 'club-a')
    expect(db.queries[3].eq).toHaveBeenCalledWith('grupo_id', options.grupoId)
    expect(workbook).not.toHaveBeenCalled()
  })
  it('rejects unsupported download formats', async () => {
    database()
    expect((await POST(request({ ...options, formato: 'html' }))).status).toBe(400)
    expect(pdf).not.toHaveBeenCalled()
    expect(workbook).not.toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { auth, service, configured } = vi.hoisted(() => ({ auth: vi.fn(), service: vi.fn(), configured: vi.fn() }))
vi.mock('../../../lib/supabase-server', () => ({ getAuthenticatedClub: auth, createSupabaseServiceClient: service }))
vi.mock('../../../lib/shared-macrocycles', () => ({ getConfiguredGroups: configured }))
import { POST } from './route'

const groupId = '49d75a63-1c85-4cea-9b56-c571b9eeb133'
function request(grupoId: string | null) {
  return new NextRequest('http://localhost/api/enlaces-macrociclo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grupoId }) })
}

beforeEach(() => {
  vi.clearAllMocks()
  service.mockReturnValue({ from: vi.fn() })
  configured.mockResolvedValue([{ id: groupId, nombre: 'Equipo', nivel: 'Nivel 1' }])
})

describe('macrocycle link creation', () => {
  it('requires a club session', async () => {
    auth.mockResolvedValue({ user: null, clubId: null, error: 'No autenticado' })
    expect((await POST(request(groupId))).status).toBe(401)
    expect(service).not.toHaveBeenCalled()
  })

  it('requires an administrator role', async () => {
    const profileQuery = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(async () => ({ data: { rol: 'entrenador' } })) }
    profileQuery.select.mockReturnValue(profileQuery)
    profileQuery.eq.mockReturnValue(profileQuery)
    auth.mockResolvedValue({ user: { id: 'user' }, clubId: 'club', supabase: { from: vi.fn(() => profileQuery) } })
    expect((await POST(request(groupId))).status).toBe(403)
    expect(service).not.toHaveBeenCalled()
  })

  it('refuses to create a link for a group without a configured macrociclo', async () => {
    const profileQuery = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(async () => ({ data: { rol: 'administrador' } })) }
    profileQuery.select.mockReturnValue(profileQuery)
    profileQuery.eq.mockReturnValue(profileQuery)
    auth.mockResolvedValue({ user: { id: 'user' }, clubId: 'club', supabase: { from: vi.fn(() => profileQuery) } })
    configured.mockResolvedValue([])
    const response = await POST(request(groupId))
    expect(response.status).toBe(422)
    expect(service).not.toHaveBeenCalled()
  })
})

import 'server-only'

import { cache } from 'react'
import { getAuthenticatedClub } from '../supabase-server'

export type GymnastListItem = {
  id: string
  nombre: string
  fecha_nacimiento: string | null
  categoria_competitiva: string | null
  avatar_path: string | null
  grupo: { id: string; nombre: string; nivel: string } | null
}

export type GymnastGroup = {
  id: string
  nombre: string
  nivel: string | null
}

export const getGymnastsPageData = cache(async (): Promise<{
  gymnasts: GymnastListItem[]
  groups: GymnastGroup[]
}> => {
  const { supabase, clubId, error } = await getAuthenticatedClub()
  if (error || !clubId) return { gymnasts: [], groups: [] }

  const [gymnastsResult, groupsResult] = await Promise.all([
    supabase
      .from('atletas')
      .select('id,nombre,fecha_nacimiento,categoria_competitiva,avatar_path,grupos(id,nombre,nivel)')
      .eq('club_id', clubId)
      .is('deleted_at', null)
      .order('nombre'),
    supabase
      .from('grupos')
      .select('id,nombre,nivel')
      .eq('club_id', clubId)
      .order('nivel')
      .order('nombre'),
  ])

  if (gymnastsResult.error) {
    throw new Error(`No se pudieron cargar las gimnastas: ${gymnastsResult.error.message}`)
  }
  if (groupsResult.error) {
    throw new Error(`No se pudieron cargar los grupos: ${groupsResult.error.message}`)
  }

  const gymnasts = (gymnastsResult.data || []).map((row) => ({
    id: String(row.id),
    nombre: String(row.nombre),
    fecha_nacimiento: typeof row.fecha_nacimiento === 'string' ? row.fecha_nacimiento : null,
    categoria_competitiva: typeof row.categoria_competitiva === 'string' ? row.categoria_competitiva : null,
    avatar_path: typeof row.avatar_path === 'string' ? row.avatar_path : null,
    grupo: normalizeGroup(row.grupos),
  }))

  return { gymnasts, groups: groupsResult.data || [] }
})

function normalizeGroup(value: unknown): GymnastListItem['grupo'] {
  const group = Array.isArray(value) ? value[0] : value
  if (!group || typeof group !== 'object') return null
  const row = group as Record<string, unknown>
  return { id: String(row.id), nombre: String(row.nombre), nivel: String(row.nivel) }
}

export interface PhysicalResultRow {
  valor: number | string | null
  unidad?: string | null
  prueba_id: string
  catalogo_pruebas_fisicas?: { nombre?: string | null } | { nombre?: string | null }[] | null
}

export interface PhysicalSessionRow {
  atleta_id: string
  fecha: string
  resultados_pruebas_fisicas?: PhysicalResultRow[] | null
}

export interface TeamPhysicalMetric {
  id: string
  nombre: string
  promedio: number
  unidad: string
  atletas: number
}

const getTestName = (catalog: PhysicalResultRow['catalogo_pruebas_fisicas']) => {
  const value = Array.isArray(catalog) ? catalog[0] : catalog
  return value?.nombre?.trim() || 'Prueba física'
}

export function buildTeamPhysicalSummary(sessions: PhysicalSessionRow[], limit = 3): TeamPhysicalMetric[] {
  const latestByAthleteAndTest = new Map<string, PhysicalResultRow>()

  const orderedSessions = [...sessions].sort((a, b) => b.fecha.localeCompare(a.fecha))
  orderedSessions.forEach((session) => {
    session.resultados_pruebas_fisicas?.forEach((result) => {
      if (result.valor === null || result.valor === '') return
      const value = Number(result.valor)
      if (!Number.isFinite(value)) return
      const key = `${session.atleta_id}:${result.prueba_id}`
      if (!latestByAthleteAndTest.has(key)) latestByAthleteAndTest.set(key, result)
    })
  })

  const grouped = new Map<string, { nombre: string; unidad: string; values: number[] }>()
  latestByAthleteAndTest.forEach((result) => {
    const current = grouped.get(result.prueba_id) || {
      nombre: getTestName(result.catalogo_pruebas_fisicas),
      unidad: result.unidad?.trim() || '',
      values: [],
    }
    current.values.push(Number(result.valor))
    grouped.set(result.prueba_id, current)
  })

  return Array.from(grouped.entries())
    .map(([id, metric]) => ({
      id,
      nombre: metric.nombre,
      promedio: Math.round((metric.values.reduce((sum, value) => sum + value, 0) / metric.values.length) * 10) / 10,
      unidad: metric.unidad,
      atletas: metric.values.length,
    }))
    .sort((a, b) => b.atletas - a.atletas || a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, limit)
}

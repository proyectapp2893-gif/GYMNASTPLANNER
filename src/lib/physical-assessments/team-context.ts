export type AssessmentSession = {
  atleta_id: string
  fecha: string
  resultados_pruebas_fisicas: Array<{
    prueba_id: string
    valor: number
    unidad: string
    catalogo_pruebas_fisicas: { nombre: string; mayor_es_mejor: boolean | null } | { nombre: string; mayor_es_mejor: boolean | null }[] | null
  }> | null
}

export function summarizeTeamAssessments(sessions: AssessmentSession[], rosterSize: number) {
  const histories = new Map<string, Array<{ date: string; value: number; unit: string; name: string; higherIsBetter: boolean | null }>>()
  for (const session of sessions) {
    for (const result of session.resultados_pruebas_fisicas || []) {
      const catalog = Array.isArray(result.catalogo_pruebas_fisicas) ? result.catalogo_pruebas_fisicas[0] : result.catalogo_pruebas_fisicas
      if (!Number.isFinite(result.valor) || !catalog) continue
      const key = `${session.atleta_id}:${result.prueba_id}`
      const history = histories.get(key) || []
      history.push({ date: session.fecha, value: result.valor, unit: result.unidad, name: catalog.nombre, higherIsBetter: catalog.mayor_es_mejor })
      histories.set(key, history)
    }
  }
  const metrics = new Map<string, { name: string; unit: string; latestDate: string; values: number[]; improved: number; declined: number; stable: number; paired: number }>()
  for (const [key, history] of histories) {
    history.sort((a, b) => b.date.localeCompare(a.date))
    const current = history[0]
    const testId = key.slice(key.indexOf(':') + 1)
    const metric = metrics.get(testId) || { name: current.name, unit: current.unit, latestDate: current.date, values: [], improved: 0, declined: 0, stable: 0, paired: 0 }
    // Measurements with different units cannot be averaged or compared.
    if (metric.unit !== current.unit) continue
    metric.values.push(current.value)
    if (current.date > metric.latestDate) metric.latestDate = current.date
    const previous = history.find(item => item.date < current.date && item.unit === current.unit)
    if (previous && current.higherIsBetter !== null) {
      const change = (current.value - previous.value) * (current.higherIsBetter ? 1 : -1)
      metric.paired += 1
      if (change > 0) metric.improved += 1
      else if (change < 0) metric.declined += 1
      else metric.stable += 1
    }
    metrics.set(testId, metric)
  }
  return {
    rosterSize,
    athletesAssessed: new Set([...histories.keys()].map(key => key.slice(0, key.indexOf(':')))).size,
    tests: [...metrics.values()].sort((a, b) => b.values.length - a.values.length).slice(0, 8).map(item => ({
      name: item.name,
      unit: item.unit,
      latestDate: item.latestDate,
      athletes: item.values.length,
      meanLatest: Math.round(item.values.reduce((sum, value) => sum + value, 0) / item.values.length * 10) / 10,
      pairedAthletes: item.paired,
      improved: item.improved,
      declined: item.declined,
      stable: item.stable,
    })),
  }
}

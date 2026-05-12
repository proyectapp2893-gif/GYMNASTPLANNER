export type RawPhysicalTestResults = Record<string, string | number | null | undefined>

export type NormalizedPhysicalMetrics = {
  dominadas_reps: number | null
  lagartijas_reps: number | null
  soga_m: number | null
  piernas_flexionadas_s: number | null
  piernas_extendidas_reps: number | null
  postura_ahuecada_s: number | null
  carrera_18m_s: number | null
  vela_salto_reps: number | null
  split_cm_faltantes: number | null
  hombros_cm: number | null
  arco_valor: number | null
}

export type PhysicalTestAnalysis = {
  metricas_normalizadas: NormalizedPhysicalMetrics
  resumen: {
    fuerza_brazos: number | null
    fuerza_core: number | null
    potencia_piernas: number | null
    flexibilidad: number | null
    indice_general: number | null
  }
  alertas: string[]
}

export function analyzePhysicalTest(raw: RawPhysicalTestResults): PhysicalTestAnalysis {
  const metricas: NormalizedPhysicalMetrics = {
    dominadas_reps: parsePositiveNumber(raw.dominadas),
    lagartijas_reps: parsePositiveNumber(raw.lagartijas),
    soga_m: parsePositiveNumber(raw.soga),
    piernas_flexionadas_s: parseDurationSeconds(raw.piernas_flexionadas),
    piernas_extendidas_reps: parsePositiveNumber(raw.piernas_extendidas),
    postura_ahuecada_s: parseDurationSeconds(raw.postura_ahuecada),
    carrera_18m_s: parsePositiveNumber(raw.carrera_18m),
    vela_salto_reps: parsePositiveNumber(raw.vela_salto),
    split_cm_faltantes: parsePositiveNumber(raw.split),
    hombros_cm: parsePositiveNumber(raw.hombros),
    arco_valor: parsePositiveNumber(raw.arco),
  }

  const fuerzaBrazos = averageScores([
    scoreHigherBetter(metricas.dominadas_reps, 1, 12),
    scoreHigherBetter(metricas.lagartijas_reps, 5, 25),
    scoreHigherBetter(metricas.soga_m, 1, 5),
  ])

  const fuerzaCore = averageScores([
    scoreHigherBetter(metricas.piernas_flexionadas_s, 15, 75),
    scoreHigherBetter(metricas.piernas_extendidas_reps, 5, 25),
    scoreHigherBetter(metricas.postura_ahuecada_s, 20, 90),
  ])

  const potenciaPiernas = averageScores([
    scoreLowerBetter(metricas.carrera_18m_s, 6, 3.5),
    scoreHigherBetter(metricas.vela_salto_reps, 5, 25),
  ])

  const flexibilidad = averageScores([
    scoreLowerBetter(metricas.split_cm_faltantes, 25, 0),
    scoreLowerBetter(metricas.hombros_cm, 30, 5),
    scoreHigherBetter(metricas.arco_valor, 5, 30),
  ])

  const resumen = {
    fuerza_brazos: fuerzaBrazos,
    fuerza_core: fuerzaCore,
    potencia_piernas: potenciaPiernas,
    flexibilidad,
    indice_general: averageScores([fuerzaBrazos, fuerzaCore, potenciaPiernas, flexibilidad]),
  }

  return {
    metricas_normalizadas: metricas,
    resumen,
    alertas: buildAlerts(metricas, resumen),
  }
}

export function summarizePhysicalTestsForAI(evaluaciones: Array<{ resultados?: unknown }>) {
  const analyses = evaluaciones
    .map(ev => extractAnalysis(ev.resultados))
    .filter((analysis): analysis is PhysicalTestAnalysis => Boolean(analysis))

  if (analyses.length === 0) return null

  const latest = analyses[0]
  const previous = analyses[1]

  return {
    ultimas_evaluaciones: analyses.length,
    promedio_grupo: {
      fuerza_brazos: averageScores(analyses.map(a => a.resumen.fuerza_brazos)),
      fuerza_core: averageScores(analyses.map(a => a.resumen.fuerza_core)),
      potencia_piernas: averageScores(analyses.map(a => a.resumen.potencia_piernas)),
      flexibilidad: averageScores(analyses.map(a => a.resumen.flexibilidad)),
      indice_general: averageScores(analyses.map(a => a.resumen.indice_general)),
    },
    ultima_evaluacion: latest.resumen,
    tendencia_individual: previous ? compareSummaries(latest, previous) : null,
    alertas: Array.from(new Set(analyses.flatMap(a => a.alertas))).slice(0, 8),
  }
}

function extractAnalysis(resultados: unknown): PhysicalTestAnalysis | null {
  if (!isRecord(resultados)) return null
  if (isRecord(resultados.analisis)) return resultados.analisis as PhysicalTestAnalysis
  return analyzePhysicalTest(resultados as RawPhysicalTestResults)
}

function compareSummaries(latest: PhysicalTestAnalysis, previous: PhysicalTestAnalysis) {
  const diff = (key: keyof PhysicalTestAnalysis['resumen']) => {
    const current = latest.resumen[key]
    const before = previous.resumen[key]
    if (current == null || before == null) return null
    return Math.round((current - before) * 10) / 10
  }

  return {
    fuerza_brazos: diff('fuerza_brazos'),
    fuerza_core: diff('fuerza_core'),
    potencia_piernas: diff('potencia_piernas'),
    flexibilidad: diff('flexibilidad'),
    indice_general: diff('indice_general'),
  }
}

function buildAlerts(metrics: NormalizedPhysicalMetrics, summary: PhysicalTestAnalysis['resumen']) {
  const alerts: string[] = []

  if (summary.fuerza_brazos != null && summary.fuerza_brazos < 45) alerts.push('Fuerza de brazos baja: reducir volumen en barras y progresar empujes/tracciones.')
  if (summary.fuerza_core != null && summary.fuerza_core < 45) alerts.push('Core bajo: priorizar posturas, canoa, estabilidad lumbopelvica y evitar fatiga tecnica.')
  if (summary.potencia_piernas != null && summary.potencia_piernas < 45) alerts.push('Potencia de piernas baja: dosificar saltos y pliometria con recuperacion amplia.')
  if (summary.flexibilidad != null && summary.flexibilidad < 45) alerts.push('Flexibilidad limitada: aumentar movilidad especifica y evitar exigir amplitudes maximas sin preparacion.')
  if (metrics.carrera_18m_s != null && metrics.carrera_18m_s > 6) alerts.push('Velocidad baja en 18m: usar progresiones de aceleracion, no HIIT intenso.')

  return alerts
}

function parsePositiveNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const text = String(value).replace(',', '.').replace(/[^\d.]/g, '')
  const parsed = Number(text)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return parsed
}

function parseDurationSeconds(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const text = String(value).trim().toLowerCase().replace(',', '.')
  const minuteMatch = text.match(/(\d+(?:\.\d+)?)\s*m/)
  const secondMatch = text.match(/(\d+(?:\.\d+)?)\s*s/)

  if (minuteMatch || secondMatch) {
    return Math.round((Number(minuteMatch?.[1] || 0) * 60 + Number(secondMatch?.[1] || 0)) * 10) / 10
  }

  const parsed = parsePositiveNumber(text)
  return parsed
}

function scoreHigherBetter(value: number | null, low: number, high: number) {
  if (value === null) return null
  return clamp(((value - low) / (high - low)) * 100, 0, 100)
}

function scoreLowerBetter(value: number | null, low: number, high: number) {
  if (value === null) return null
  return clamp(((low - value) / (low - high)) * 100, 0, 100)
}

function averageScores(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value))
  if (valid.length === 0) return null
  return Math.round((valid.reduce((sum, value) => sum + value, 0) / valid.length) * 10) / 10
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

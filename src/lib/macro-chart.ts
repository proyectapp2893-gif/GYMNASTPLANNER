import { getWeekPlan, type PlanningConfig, type MicrocycleType } from './sports-planning'

export const microcycleChartStyle: Record<MicrocycleType, { tipo: string; color: string }> = {
  A: { tipo: 'Ajuste', color: '#34d399' },
  C: { tipo: 'Carga', color: '#fbbf24' },
  CH: { tipo: 'Choque', color: '#f43f5e' },
  R: { tipo: 'Recuperación', color: '#60a5fa' },
  AP: { tipo: 'Aproximación', color: '#a78bfa' },
  COMP: { tipo: 'Competencia', color: '#f59e0b' },
  T: { tipo: 'Tránsito', color: '#94a3b8' },
}

export const macroSeriesColors = { volumen: '#60a5fa', intensidad: '#fb7185', forma: '#10b981' }

export function buildMacroChartData(config: PlanningConfig) {
  return Array.from({ length: Math.max(1, Number(config.semanas_totales || 1)) }, (_, index) => {
    const plan = getWeekPlan(config, index + 1)
    const micro = microcycleChartStyle[plan.microciclo]
    return { name: `S${index + 1}`, semanaOriginal: index + 1, tipoMicrociclo: micro.tipo,
      colorMicrociclo: micro.color, Volumen: plan.carga.volumen, Intensidad: plan.carga.intensidad, FormaDeportiva: plan.carga.forma }
  })
}

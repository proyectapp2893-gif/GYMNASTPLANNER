import React from 'react'
import { View, Text, Svg, Rect, Line, Circle, Path } from '@react-pdf/renderer'
import { line, curveMonotoneX } from 'd3-shape'
import { buildMacroChartData, macroSeriesColors, microcycleChartStyle } from '../macro-chart'
import type { ReportInput } from './model'
import { buildReportModel, dateKey, weekKey } from './model'

export function PdfMacroChart({ input }: { input: ReportInput }) {
  const data = buildMacroChartData(input.config)
  const weeks = buildReportModel(input).weeks
  const left = 31, top = 35, width = 451, height = 155
  const step = width / data.length
  const x = (index: number) => left + step * (index + 0.5)
  const y = (value: number) => top + height * (1 - value / 100)
  const bar = Math.min(7, step * 0.28)
  const curve = line<(typeof data)[number]>().x((_, index) => x(index)).y(point => y(point.FormaDeportiva)).curve(curveMonotoneX)(data) || ''
  const todayInColombia = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) + 'T12:00:00')
  const currentWeek = weeks.findIndex(week => week.start === weekKey(dateKey(todayInColombia)))
  const series = [{ label: 'Forma Deportiva', color: macroSeriesColors.forma }, { label: 'Intensidad de Carga', color: macroSeriesColors.intensidad }, { label: 'Volumen Total', color: macroSeriesColors.volumen }]
  return <View wrap={false} style={{ marginTop: 14, marginBottom: 5 }}>
    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 15, color: '#1e293b', marginBottom: 9 }}>Dinámica de Cargas</Text>
    <View style={{ flexDirection: 'row', marginBottom: 8, flexWrap: 'wrap' }}>{Object.entries(microcycleChartStyle).map(([key, style]) => <View key={key} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10, marginBottom: 4 }}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: style.color, marginRight: 3 }}/><Text style={{ fontSize: 7, color: '#64748b' }}>{style.tipo}</Text></View>)}</View>
    <Svg width={511} height={232} viewBox="0 0 511 232">
      {series.map((item, i) => <React.Fragment key={item.label}><Circle cx={95 + i * 136} cy={8} r={3} fill={item.color}/><Text x={102 + i * 136} y={11} style={{ fontSize: 7, fill: item.color }}>{item.label}</Text></React.Fragment>)}
      {weeks.map((week, index) => week.inMonth && <Rect key={index} x={left + step * index} y={top} width={step} height={height} fill="#f1f5f9"/>)}
      {[0, 25, 50, 75, 100].map(value => <React.Fragment key={value}><Line x1={left} y1={y(value)} x2={left + width} y2={y(value)} stroke="#e2e8f0" strokeWidth={0.6} strokeDasharray="3 3"/><Text x={3} y={y(value) + 3} style={{ fontSize: 7, fill: '#94a3b8' }}>{value}%</Text></React.Fragment>)}
      {data.map((point, index) => <React.Fragment key={point.name}>
        <Rect x={x(index) - bar - 1} y={y(point.Volumen)} width={bar} height={height * point.Volumen / 100} fill={macroSeriesColors.volumen} rx={Math.min(2, bar / 2)}/>
        <Rect x={x(index) + 1} y={y(point.Intensidad)} width={bar / 2} height={height * point.Intensidad / 100} fill={macroSeriesColors.intensidad} rx={Math.min(1.5, bar / 4)}/>
        <Circle cx={x(index)} cy={216} r={Math.min(2.7, step * 0.22)} fill={point.colorMicrociclo}/>
        {(data.length <= 26 || (index < data.length - 2 && index % Math.ceil(data.length / 23) === 0) || index === data.length - 1) && <Text x={x(index)} y={206} textAnchor="middle" style={{ fontSize: data.length <= 26 ? 7 : 6, fill: '#94a3b8' }}>{point.name}</Text>}
      </React.Fragment>)}
      {curve && <Path d={curve} fill="none" stroke={macroSeriesColors.forma} strokeWidth={2.4}/>}
      {data.map((point, index) => <Circle key={index} cx={x(index)} cy={y(point.FormaDeportiva)} r={data.length <= 60 ? 2 : 1} fill={macroSeriesColors.forma} stroke="white" strokeWidth={0.8}/>)}
      {currentWeek >= 0 && <><Line x1={x(currentWeek)} y1={top} x2={x(currentWeek)} y2={top + height} stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={1}/><Text x={x(currentWeek)} y={top - 6} textAnchor="middle" style={{ fontSize: 7, fill: '#f43f5e' }}>HOY</Text></>}
    </Svg>
    <Text style={{ fontSize: 8, color: '#657887' }}>Mismos valores y representación del dashboard. El fondo sombreado identifica el mes; los puntos inferiores indican el microciclo.</Text>
  </View>
}

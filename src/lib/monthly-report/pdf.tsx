import React from 'react'
import { PdfMacroChart } from './pdf-chart'
import { Document, Page, View, Text, Link, Svg, Circle, Path, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { buildReportModel, sessionDetails, reportMonthLabel, weekKey, type ReportInput } from './model'
import { phaseNames, record, text, dosage } from './exercises'
import { getSessionExerciseCount } from '../session-exercise-summary'

const colors = { navy: '#13283D', teal: '#087F8C', mint: '#E8F5F2', ink: '#253B4C', muted: '#657887', line: '#DCE5EB', pale: '#F3F6F8', coral: '#D36952', white: '#FFFFFF' }
const styles = StyleSheet.create({
  page: { paddingTop: 68, paddingBottom: 62, paddingHorizontal: 42, fontFamily: 'Helvetica', fontSize: 10, color: colors.ink },
  header: { position: 'absolute', top: 25, left: 42, right: 42, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 10 },
  headerText: { fontSize: 8, color: colors.muted, maxWidth: '68%' },
  footer: { position: 'absolute', top: 803, left: 42, right: 42, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 9 },
  label: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: colors.teal, letterSpacing: 1.3, marginBottom: 7 },
  h1: { fontSize: 29, lineHeight: 1.15, fontFamily: 'Helvetica-Bold', color: colors.navy, marginBottom: 12 },
  h2: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: colors.navy, marginBottom: 8 },
  body: { fontSize: 10, lineHeight: 1.55 },
  muted: { fontSize: 9, color: colors.muted, lineHeight: 1.5 },
  small: { fontSize: 8, color: colors.muted },
  row: { flexDirection: 'row' },
  hero: { backgroundColor: colors.navy, padding: 28, borderRadius: 9, marginBottom: 25, overflow: 'hidden' },
  heroTitle: { color: colors.white, fontSize: 36, lineHeight: 1.12, fontFamily: 'Helvetica-Bold', marginTop: 16, marginBottom: 18 },
  meta: { width: '50%', paddingRight: 18, paddingBottom: 16 },
  metaLabel: { fontSize: 8, color: colors.muted, marginBottom: 4, letterSpacing: 0.7 },
  metaValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: colors.navy },
  metric: { flex: 1, padding: 15, backgroundColor: colors.pale, borderRadius: 6, marginRight: 8 },
  metricValue: { fontSize: 26, lineHeight: 1.2, fontFamily: 'Helvetica-Bold', color: colors.teal, marginBottom: 7 },
  notice: { padding: 13, backgroundColor: colors.mint, borderRadius: 5, marginTop: 16, marginBottom: 16 },
  nav: { color: colors.teal, fontSize: 9, textDecoration: 'none' },
  tableHeader: { flexDirection: 'row', backgroundColor: colors.navy, padding: 10, color: colors.white, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  tableRow: { flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderBottomColor: colors.line, fontSize: 9 },
  phase: { backgroundColor: colors.navy, color: colors.white, padding: 9, marginTop: 16, marginBottom: 8, fontSize: 10, fontFamily: 'Helvetica-Bold' },
  exercise: { padding: 12, backgroundColor: colors.pale, borderLeftWidth: 3, borderLeftColor: colors.teal, marginBottom: 8 },
  exerciseTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: colors.navy, marginBottom: 6 },
  dose: { fontSize: 9, color: colors.teal, marginTop: 7, lineHeight: 1.5 },
})

function dateLabel(value: string, weekday = false) {
  return new Intl.DateTimeFormat('es-CO', { ...(weekday ? { weekday: 'long' as const } : {}), day: 'numeric', month: 'long' }).format(new Date(`${value}T12:00:00`))
}
function Frame({ input }: { input: ReportInput }) {
  return <>
    <View style={styles.header} fixed><Text style={styles.headerText}>{input.club} · {input.grupo}</Text><Text style={styles.small}>{reportMonthLabel(input.mes).toUpperCase()}</Text></View>
    <View style={styles.footer} fixed><Text style={styles.small}>SELECCIÓN DEPORTIVA / PLANEACIÓN MENSUAL</Text><Text style={styles.small} render={({ pageNumber, totalPages }) => `${String(pageNumber).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}`}/></View>
  </>
}
function Meta({ label, value }: { label: string; value: string }) {
  return <View style={styles.meta}><Text style={styles.metaLabel}>{label.toUpperCase()}</Text><Text style={styles.metaValue}>{value || 'No registrado'}</Text></View>
}
function Metric({ value, label }: { value: number; label: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{String(value).padStart(2, '0')}</Text><Text style={styles.small}>{label}</Text></View>
}

export function MonthlyPdfDocument({ input }: { input: ReportInput }) {
  const model = buildReportModel(input)
  if (!model.sessions.length) throw new Error('No hay sesiones guardadas para este grupo en el mes seleccionado.')
  const exerciseCount = model.sessions.reduce((sum, session) => sum + getSessionExerciseCount(session.ejercicios as Record<string, unknown[]>), 0)
  return <Document title={`Planeación mensual · ${reportMonthLabel(input.mes)} · ${input.grupo}`} author={input.entrenador || input.club} subject={`${input.modalidad} · ${input.categoria}`} creator="GymnastPlanner" language="es-CO">
    <Page size="A4" style={styles.page}>
      <Frame input={input}/>
      <View style={styles.hero}>
        <Svg width={190} height={200} viewBox="0 0 190 200" style={{ position: 'absolute', right: -12, top: 20 }}>
          <Circle cx={145} cy={80} r={65} stroke="#255268" strokeWidth={20} fill="none"/>
          <Path d="M 15 195 C 15 65, 140 195, 185 30" stroke="#23858B" strokeWidth={6} fill="none"/>
          <Circle cx={102} cy={148} r={8} fill="#54BCB0"/>
        </Svg>
        <Text style={{ ...styles.label, color: '#82D5CA' }}>SELECCIÓN DEPORTIVA</Text>
        <Text style={styles.heroTitle}>Planificación{'\n'}de entrenamiento</Text>
        <Text style={{ color: '#C8DFE9', fontSize: 16 }}>{reportMonthLabel(input.mes)}</Text>
        <View style={{ width: 40, height: 3, backgroundColor: '#82D5CA', marginTop: 23 }}/>
      </View>
      <View style={{ ...styles.row, flexWrap: 'wrap' }}>
        <Meta label="Modalidad" value={input.modalidad}/><Meta label="Categoría" value={input.categoria}/>
        <Meta label="Grupo" value={input.grupo}/><Meta label="Entrenador" value={input.entrenador}/>
      </View>
      <Text style={{ ...styles.small, marginBottom: 12 }}>Horario actual del grupo: {[...new Set((input.config.horario_semanal || []).map(day => day.dia))].join(' · ') || 'Sin horario registrado; se muestran únicamente sesiones guardadas.'}</Text>
      <View style={styles.row} wrap={false}><Metric value={model.sessions.length} label="CLASES GUARDADAS"/><Metric value={model.monthWeeks.length} label="SEMANAS DEL MES"/><Metric value={exerciseCount} label="EJERCICIOS PROGRAMADOS"/></View>
      <View style={styles.notice} wrap={false}><Text style={{ ...styles.body, color: colors.teal }}>Del macrociclo a cada clase.</Text><Text style={styles.muted}>Este documento reúne la planificación guardada del grupo. Consulta el ciclo completo, abre una semana y accede a sus fichas de entrenamiento.</Text></View>
      <View style={{ ...styles.row, justifyContent: 'space-between' }}><Link src="#macrociclo" style={styles.nav}>01 / Macrociclo y semanas</Link><Link src={`#semana-${model.monthWeeks[0].start}`} style={styles.nav}>02 / Planeación de clases</Link></View>
      {input.observaciones && <View style={{ marginTop: 20 }}><Text style={styles.h2} minPresenceAhead={50}>Observaciones del mes</Text><Text style={styles.body}>{input.observaciones}</Text></View>}
    </Page>

    <Page size="A4" style={styles.page} bookmark="Macrociclo y semanas">
      <Frame input={input}/>
      <Text id="macrociclo" style={styles.label}>01 / CONTEXTO DE LA PLANIFICACIÓN</Text>
      <Text style={styles.h1}>El mes dentro del ciclo</Text>
      <Text style={styles.muted}>{dateLabel(model.weeks[0].start)} {model.weeks[0].start.slice(0, 4)} — {dateLabel(model.weeks.at(-1)!.end)} {model.weeks.at(-1)!.end.slice(0, 4)} · {model.weeks.length} semanas</Text>
      <PdfMacroChart input={input}/>
      <Text style={{ ...styles.small, marginTop: 8, marginBottom: 18 }}>Cargas planificadas según el modelo de la app. La forma deportiva es una estimación; estas curvas no representan mediciones del entrenamiento realizado.</Text>
      <Text style={styles.h2} minPresenceAhead={70}>Semanas de {reportMonthLabel(input.mes)}</Text>
      <View style={styles.tableHeader} wrap={false}><Text style={{ width: '24%' }}>SEMANA / INICIO</Text><Text style={{ width: '43%' }}>ENFOQUE DEL CICLO</Text><Text style={{ width: '17%' }}>VOL. / INT.</Text><Text style={{ width: '16%' }}>CLASES</Text></View>
      {model.monthWeeks.map(week => <View key={week.start} style={styles.tableRow} wrap={false}>
        <View style={{ width: '24%', paddingRight: 8 }}><Link src={`#semana-${week.start}`} style={styles.nav}>{week.plan ? `Semana ${week.plan.semana}` : 'Fuera del ciclo'}</Link><Text style={styles.small}>{dateLabel(week.start)}</Text></View>
        <Text style={{ width: '43%', paddingRight: 8 }}>{week.plan?.objetivo || 'Sesiones fuera del macrociclo configurado'}</Text>
        <Text style={{ width: '17%' }}>{week.plan ? `${week.plan.carga.volumen}% / ${week.plan.carga.intensidad}%` : 'No aplica'}</Text>
        <Text style={{ width: '16%' }}>{week.sessions.length}</Text>
      </View>)}
    </Page>

    {model.monthWeeks.map(week => <Page key={week.start} size="A4" style={styles.page} bookmark={`Semana del ${dateLabel(week.start)}`}>
      <Frame input={input}/>
      <Text id={`semana-${week.start}`} style={styles.label}>02 / PLANEACIÓN SEMANAL</Text>
      <Text style={styles.h1}>{week.plan ? `Semana ${String(week.plan.semana).padStart(2, '0')}` : 'Semana fuera del ciclo'}</Text>
      <Text style={styles.muted}>Desde el {dateLabel(week.start)} · {week.sessions.length} clases guardadas en el mes</Text>
      <View style={styles.notice} wrap={false}><Text style={styles.h2}>{week.plan?.etapa || 'Sin etapa asignada'}</Text><Text style={styles.body}>{week.plan ? `${week.plan.mesociclo} · Microciclo ${week.plan.microciclo}` : 'Las fechas de estas clases están fuera del ciclo configurado.'}</Text></View>
      <View style={styles.tableHeader} wrap={false}><Text style={{ width: '27%' }}>DÍA</Text><Text style={{ width: '73%' }}>ENTRENAMIENTO</Text></View>
      {week.days.map(dayEntry => {
        const key = dayEntry.date
        const sessions = dayEntry.sessions
        return <View key={key} style={styles.tableRow} wrap={false}>
          <Text style={{ width: '27%', paddingRight: 10, fontFamily: 'Helvetica-Bold' }}>{dateLabel(key, true)}</Text>
          <View style={{ width: '73%' }}>{sessions.length ? sessions.map(session => <View key={session.id} style={{ marginBottom: 6 }}>{!dayEntry.scheduled.length && <Text style={styles.small}>Sesión guardada fuera del horario actual</Text>}<Text style={{ marginBottom: 4 }}>{session.objetivo || 'Objetivo no registrado'}</Text><Link src={`#sesion-${session.id}`} style={styles.nav}>Abrir ficha de entrenamiento</Link></View>) : <Text style={styles.muted}>Día asignado · sin planeación guardada</Text>}</View>
        </View>
      })}
      <Link src="#macrociclo" style={{ ...styles.nav, marginTop: 18 }}>Volver al macrociclo</Link>
    </Page>)}

    {model.sessions.map((session, index) => <Page key={session.id} size="A4" style={styles.page} bookmark={`Clase ${index + 1} · ${dateLabel(session.fecha_calendario!)}`}>
      <Frame input={input}/>
      <Text id={`sesion-${session.id}`} style={styles.label}>03 / FICHA DE ENTRENAMIENTO · {String(index + 1).padStart(2, '0')}</Text>
      <Text style={styles.h1}>{dateLabel(session.fecha_calendario!, true)}</Text>
      <Text style={styles.muted}>{input.modalidad} · {input.categoria} · Nivel: {session.nivel || 'No registrado'}</Text>
      <View style={styles.notice}><Text style={styles.label} minPresenceAhead={30}>OBJETIVO DE LA CLASE</Text><Text style={styles.body}>{session.objetivo || 'No registrado'}</Text></View>
      <View style={{ ...styles.row, justifyContent: 'space-between', marginBottom: 6 }}><Link src={`#semana-${weekKey(session.fecha_calendario!)}`} style={styles.nav}>Volver a la semana</Link><Link src="#macrociclo" style={styles.nav}>Volver al macrociclo</Link></View>
      {Object.entries(session.ejercicios || {}).filter(([, items]) => Array.isArray(items) && items.length).map(([phase, items]) => <View key={phase} wrap={(items as unknown[]).length > 4 || JSON.stringify(items).length > 1600}>
        <View wrap={false} minPresenceAhead={90}><Text style={styles.phase}>{phaseNames[phase] || phase}</Text></View>
        {(items as unknown[]).map((item, exerciseIndex) => {
          const exercise = record(item)
          const description = text(exercise.descripcion) || text(exercise.descripcion_corta)
          return <View key={exerciseIndex} style={styles.exercise}>
            <Text style={styles.exerciseTitle} minPresenceAhead={35}>{String(exerciseIndex + 1).padStart(2, '0')} / {text(item) || text(exercise.contenido) || text(exercise.nombre) || 'Ejercicio sin nombre'}</Text>
            {text(exercise.aparato) && <Text style={{ ...styles.small, marginBottom: 5 }}>APARATO / {text(exercise.aparato)}</Text>}
            {description && <Text style={styles.body} orphans={3} widows={3}>{description}</Text>}
            <Text style={styles.dose}>Dosificación: {dosage(exercise.dosificacion)}</Text>
          </View>
        })}
      </View>)}
      {getSessionExerciseCount(session.ejercicios as Record<string, unknown[]>) === 0 && <Text style={{ ...styles.muted, marginTop: 20 }}>Esta sesión no tiene ejercicios guardados.</Text>}
      <View style={{ marginTop: 14 }}><Text style={styles.small}>Hora: {sessionDetails(input, session).time} · Lugar (horario actual): {sessionDetails(input, session).place}</Text><Text style={styles.small}>Duración planificada: {sessionDetails(input, session).duration}</Text><Text style={styles.small}>Observaciones de la clase: {sessionDetails(input, session).notes}</Text></View>
    </Page>)}
  </Document>
}

export async function createMonthlyPdf(input: ReportInput) {
  return new Uint8Array(await renderToBuffer(MonthlyPdfDocument({ input })))
}

import ExcelJS from 'exceljs'
import { addMacroChart } from './chart'
import { buildReportModel, sessionDetails, reportMonthLabel, type ReportInput } from './model'

import { phaseNames, record, text, dosage } from './exercises'

const missing = 'No registrado'
function title(sheet: ExcelJS.Worksheet, row: number, value: string, columns = 9) {
  sheet.mergeCells(row, 1, row, columns)
  const cell = sheet.getCell(row, 1)
  cell.value = value
  cell.font = { bold: true, size: row === 1 ? 17 : 11, color: { argb: 'FFFFFFFF' } }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF312E81' } }
  sheet.getRow(row).height = row === 1 ? 34 : 26
}
function note(sheet: ExcelJS.Worksheet, row: number, value: string, height = 30) {
  sheet.mergeCells(row, 1, row, 9)
  sheet.getCell(row, 1).value = value
  sheet.getRow(row).height = height
}
function link(sheet: ExcelJS.Worksheet, row: number, column: number, label: string, target: string) {
  const cell = sheet.getCell(row, column)
  cell.value = { text: label, hyperlink: `#'${target}'!A1` }
  cell.font = { color: { argb: 'FF4338CA' }, underline: true, bold: true }
}
function format(sheet: ExcelJS.Worksheet) {
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  sheet.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  sheet.columns = [20, 20, 25, 26, 26, 19, 19, 19, 26].map(width => ({ width }))
  sheet.eachRow(row => row.eachCell(cell => {
    cell.alignment = { vertical: 'top', wrapText: true }
    if (!cell.font) cell.font = { size: 11, name: 'Calibri' }
  }))
  sheet.pageSetup.printArea = `A1:I${sheet.rowCount}`
}

export async function createMonthlyWorkbook(input: ReportInput) {
  const model = buildReportModel(input)
  if (!model.sessions.length) throw new Error('No hay sesiones guardadas para este grupo en el mes seleccionado.')
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'GymnastPlanner'
  workbook.title = `Planeación mensual · ${reportMonthLabel(input.mes)}`
  const macro = workbook.addWorksheet('Macrociclo')
  title(macro, 1, `${input.club} · Planeación mensual`)
  note(macro, 2, `${reportMonthLabel(input.mes).toUpperCase()} · ${input.modalidad} · ${input.categoria}`)
  note(macro, 3, `Grupo: ${input.grupo} | Entrenador: ${input.entrenador || missing} | ${model.sessions.length} clases guardadas`)
  note(macro, 4, 'Cargas planificadas según el modelo de la app; forma deportiva estimada. No representan mediciones del entrenamiento realizado.')
  note(macro, 5, 'El mes se identifica con puntos en la gráfica y filas resaltadas en la tabla. Pulsa «Abrir semana» para consultar sus clases.')
  note(macro, 6, `Observaciones del mes: ${input.observaciones || 'Sin observaciones'}`, Math.max(30, Math.ceil(input.observaciones.length / 160) * 15))
  note(macro, 7, `Horario actual del grupo: ${[...new Set((input.config.horario_semanal || []).map(day => day.dia))].join(' · ') || 'Sin horario registrado; solo sesiones guardadas'}`)
  // Reserve a fixed area for the native Excel chart.
  for (let row = 8; row <= 26; row++) macro.getRow(row).height = 22
  macro.getRow(28).values = ['Semana', 'Inicio', 'Fin', 'Etapa', 'Mesociclo', 'Volumen (%)', 'Intensidad (%)', 'Forma estimada (%)', 'Detalle mensual']
  macro.getRow(28).font = { bold: true }
  const weekSheets = new Map(model.monthWeeks.map(week => [week.start, `Semana ${week.start.slice(5)}`]))
  model.weeks.forEach((week, index) => {
    const row = 29 + index
    macro.getRow(row).values = [`Semana ${week.semana}`, week.start, week.end, week.etapa, `${week.mesociclo} · ${week.microciclo}`, week.carga.volumen, week.carga.intensidad, week.carga.forma, 'Fuera del mes']
    macro.getRow(row).height = 32
    if (week.inMonth) {
      macro.getRow(row).eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } } })
      if (weekSheets.has(week.start)) link(macro, row, 9, 'Abrir semana', weekSheets.get(week.start)!)
      else macro.getCell(row, 9).value = 'Sin días asignados ni sesiones'
    }
  })
  for (const week of model.monthWeeks.filter(week => !week.plan)) {
    const row = macro.addRow(['Fuera del macrociclo', week.start]).number
    if (weekSheets.has(week.start)) link(macro, row, 9, 'Abrir semana', weekSheets.get(week.start)!)
      else macro.getCell(row, 9).value = 'Sin días asignados ni sesiones'
  }
  for (const week of model.monthWeeks) {
    const weekName = weekSheets.get(week.start)!
    const sheet = workbook.addWorksheet(weekName)
    title(sheet, 1, `${week.plan ? `Semana ${week.plan.semana} · ${week.plan.microciclo}` : 'Semana fuera del macrociclo'} · ${week.start}`)
    link(sheet, 2, 1, 'Volver al macrociclo', 'Macrociclo')
    note(sheet, 3, week.plan?.objetivo || 'Las sesiones de esta semana están fuera de las fechas del ciclo configurado.')
    sheet.getRow(5).values = ['Fecha', 'Día', 'Objetivo', 'Ficha', 'Horario / nota']
    sheet.getRow(5).font = { bold: true }
    let row = 6
    for (const dayEntry of week.days) {
      const key = dayEntry.date
      const day = new Intl.DateTimeFormat('es-CO', { weekday: 'long' }).format(new Date(`${key}T12:00:00`))
      const sessions = dayEntry.sessions
      if (!sessions.length) {
        sheet.getRow(row++).values = [key, day, 'Día asignado · sin planeación guardada', '', dayEntry.scheduled.map(day => day.hora).filter(Boolean).join(' / ')]
      }
      for (const session of sessions) {
        const index = model.sessions.indexOf(session) + 1
        const name = `Día ${key.slice(5)}-${index}`
        sheet.getRow(row).values = [key, day, session.objetivo || missing, '', dayEntry.scheduled.length ? '' : 'Sesión guardada fuera del horario actual']
        sheet.getRow(row).height = 50
        link(sheet, row++, 4, 'Ver entrenamiento', name)
        const daily = workbook.addWorksheet(name)
        title(daily, 1, `Ficha de entrenamiento · ${key} · ${day}`)
        link(daily, 2, 1, 'Volver a la semana', weekName)
        link(daily, 2, 4, 'Volver al macrociclo', 'Macrociclo')
        note(daily, 3, `${input.club} · ${input.grupo} · ${input.modalidad} · ${input.categoria}`)
        note(daily, 4, `Entrenador: ${input.entrenador || missing} | Nivel: ${session.nivel || missing}`)
        note(daily, 5, `Objetivo: ${session.objetivo || missing}`, 45)
        const details = sessionDetails(input, session)
        note(daily, 6, `Hora: ${details.time} | Lugar (horario actual): ${details.place} | Duración planificada: ${details.duration}`)
        daily.getRow(8).values = ['Bloque', 'Ejercicio', 'Descripción', 'Aparato', 'Dosificación', 'Duración']
        daily.getRow(8).font = { bold: true }
        let exerciseRow = 9
        for (const [phase, items] of Object.entries(session.ejercicios || {})) {
          if (!Array.isArray(items)) continue
          for (const item of items) {
            const exercise = record(item)
            const values = [phaseNames[phase] || phase, text(item) || text(exercise.contenido) || text(exercise.nombre) || 'Ejercicio sin nombre', text(exercise.descripcion) || text(exercise.descripcion_corta) || missing, text(exercise.aparato) || missing, dosage(exercise.dosificacion), missing]
            const exerciseLine = daily.getRow(exerciseRow++)
            exerciseLine.values = values
            exerciseLine.height = Math.min(409, Math.max(65, ...values.map(value => value.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / 24)), 0) * 15)))
          }
        }
        if (exerciseRow === 9) note(daily, exerciseRow++, 'Esta sesión no tiene ejercicios guardados.')
        note(daily, exerciseRow + 1, `Observaciones de la clase: ${details.notes}`, Math.max(30, Math.ceil(details.notes.length / 160) * 15))
      }
    }
  }
  workbook.eachSheet(format)
  return addMacroChart(new Uint8Array(await workbook.xlsx.writeBuffer()), model.weeks, 29)
}

import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import { buildReportModel, monthBounds, monthlyReportSchema, reportFileName, type ReportInput } from './model'
import { createMonthlyWorkbook } from './workbook'

const input: ReportInput = {
  grupoId: '08d57d49-7f7c-4c12-aa97-ea47a185d8f4', mes: '2026-09', modalidad: 'Gimnasia artística', categoria: 'Femenino',
  entrenador: 'Entrenador', observaciones: 'Trabajo mensual', club: 'Club', grupo: 'Selección',
  config: { horario_semanal: [{ dia: 'Martes' }, { dia: 'Jueves' }, { dia: 'Sábado' }], fecha_inicio: '2026-08-03', semanas_totales: 12 },
  sessions: [
    { id: '1', fecha_calendario: '2026-09-01', objetivo: 'Técnica', ejercicios: { tecnico_aparato1: [{ contenido: '=SUM(A1)', descripcion: 'Control de postura', aparato: 'Viga', dosificacion: { base: '3 × 5', avanzado: '4 × 8' } }] } },
    { id: '2', fecha_calendario: '2026-09-01', objetivo: 'Segunda clase', ejercicios: {} },
    { id: '3', fecha_calendario: '2026-08-31', ejercicios: {} },
    { id: '4', fecha_calendario: '2026-10-01', ejercicios: {} },
    { id: '5', fecha_calendario: null, ejercicios: {} },
  ],
}

describe('monthly report', () => {
  it('validates month and handles December and leap years without UTC shifts', () => {
    expect(monthBounds('2026-12')).toEqual({ start: '2026-12-01', end: '2027-01-01' })
    expect(monthBounds('2024-02').end).toBe('2024-03-01')
    expect(monthlyReportSchema.safeParse({ ...input, mes: '2026-13' }).success).toBe(false)
    expect(monthlyReportSchema.safeParse({ ...input, categoria: ' ' }).success).toBe(false)
    expect(reportFileName(input)).toBe('SEPTIEMBRE – GIMNASIA ARTÍSTICA – FEMENINO – 2026.xlsx')
    expect(reportFileName({ ...input, categoria: 'A/B\\C' })).not.toMatch(/[/\\]/)
  })

  it('includes overlapping weeks but only sessions from the selected month', () => {
    const model = buildReportModel(input)
    expect(model.sessions.map(s => s.id)).toEqual(['1', '2'])
    expect(model.monthWeeks[0].start).toBe('2026-08-31')
    expect(model.monthWeeks.at(-1)?.start).toBe('2026-09-28')
    expect(model.monthWeeks[0].sessions).toHaveLength(2)
  })

  it('keeps sessions outside the configured cycle reachable', () => {
    const model = buildReportModel({ ...input, config: { fecha_inicio: '2026-01-01', semanas_totales: 2 } })
    expect(model.monthWeeks).toHaveLength(1)
    expect(model.monthWeeks[0].plan).toBeUndefined()
    expect(model.monthWeeks[0].sessions).toHaveLength(2)
  })

  it('writes a real workbook with navigable sheets, safe text, doses and a native chart', async () => {
    const bytes = await createMonthlyWorkbook(input)
    const zip = await JSZip.loadAsync(bytes)
    const chart = await zip.file('xl/charts/chart1.xml')!.async('string')
    expect(chart).toContain('<c:lineChart>')
    expect(chart).toContain("'Macrociclo'!$F$29:$F$40")
    expect(chart).toContain('<c:dPt>')
    expect(chart.match(/<c:ser>/g)).toHaveLength(3)
    const sheetXml = await zip.file('xl/worksheets/sheet1.xml')!.async('string')
    expect(sheetXml).toContain('r:id="rIdMacroChart"')
    expect(await zip.file('xl/worksheets/_rels/sheet1.xml.rels')!.async('string')).toContain('../drawings/drawing1.xml')
    expect(await zip.file('[Content_Types].xml')!.async('string')).toContain('/xl/charts/chart1.xml')
    const book = new ExcelJS.Workbook()
    await book.xlsx.load(bytes as unknown as ExcelJS.Buffer)
    const first = book.getWorksheet('Día 09-01-1')!
    expect(first.getCell('B9').value).toBe('=SUM(A1)')
    expect(first.getCell('E9').value).toContain('base: 3 × 5')
    expect(first.getCell('F9').value).toBe('No registrado')
    expect(book.getWorksheet('Día 09-01-2')).toBeDefined()
    const links: string[] = []
    book.eachSheet(sheet => sheet.eachRow(row => row.eachCell(cell => {
      if (cell.type === ExcelJS.ValueType.Hyperlink) links.push((cell.value as ExcelJS.CellHyperlinkValue).hyperlink)
    })))
    expect(links.length).toBeGreaterThan(10)
    links.forEach(link => {
      const name = link.match(/^#'(.+)'!A1$/)?.[1]
      expect(name).toBeTruthy()
      expect(book.getWorksheet(name!)).toBeDefined()
    })
    expect(book.getWorksheet('Semana 08-31')!.getCell('A6').value).toBe('2026-09-01')
    const dates: string[] = []
    book.getWorksheet('Semana 08-31')!.eachRow((row, number) => { if (number >= 6) dates.push(String(row.getCell(1).value)) })
    expect(dates).toEqual(['2026-09-01', '2026-09-01', '2026-09-03', '2026-09-05'])
    expect(book.getWorksheet('Macrociclo')!.getCell('A33').fill).toMatchObject({ fgColor: { argb: 'FFE0E7FF' } })
  })

  it('does not create an empty report', async () => {
    await expect(createMonthlyWorkbook({ ...input, sessions: [] })).rejects.toThrow('No hay sesiones')
  })
})

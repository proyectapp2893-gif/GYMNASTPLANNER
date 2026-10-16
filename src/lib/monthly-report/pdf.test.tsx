import { describe, expect, it } from 'vitest'
import { inflateSync } from 'node:zlib'
import { createMonthlyPdf } from './pdf'
import { reportFileName } from './model'
import { pdfSample } from './pdf.fixture'

// Read text operators from compressed PDF content streams; no external PDF service is involved.
function contentStreams(bytes: Uint8Array) {
  const source = Buffer.from(bytes).toString('latin1')
  return [...source.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => {
    try { return inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1') } catch { return match[1] }
  }).join('\n')
}

describe('designed monthly PDF', () => {
  it('generates an A4 PDF with internal destinations, links and vector chart', async () => {
    const bytes = await createMonthlyPdf(pdfSample)
    const raw = Buffer.from(bytes).toString('latin1')
    expect(raw.startsWith('%PDF-1.')).toBe(true)
    expect(raw).toContain('/MediaBox [0 0 595.280029 841.890015]')
    expect(raw).toContain('(macrociclo)')
    expect(raw).toContain('(semana-2026-08-31)')
    expect(raw).toContain('(sesion-demo-0)')
    expect(raw).toContain('/Subtype /Link')
    expect(raw).toContain('/Outlines')
    expect(raw.match(/\/Type \/Page\b/g)?.length).toBeGreaterThanOrEqual(11)
    const streams = contentStreams(bytes)
    expect(streams).toContain(' m')
    expect(streams).toContain(' l')
    const renderedText = [...streams.matchAll(/<([0-9a-f]+)>/gi)].map(match => Buffer.from(match[1], 'hex').toString('latin1')).join('')
    expect(renderedText).toContain('sin planeaci')
    expect(renderedText).not.toContain('lunes,')
    expect(renderedText).not.toContain('domingo,')
    expect(renderedText).toContain('Dinámica de Cargas')
    expect(reportFileName(pdfSample, 'pdf')).toBe('SEPTIEMBRE – GIMNASIA ARTÍSTICA – FEMENINO – 2026.pdf')
  }, 20000)

  it('paginates a long training description without losing its final text', async () => {
    const bytes = await createMonthlyPdf({ ...pdfSample, sessions: [{ id: 'long', fecha_calendario: '2026-09-01', ejercicios: { tecnico: [{ contenido: 'Secuencia extensa', descripcion: `${'Mantener la alineacion y controlar cada recepcion. '.repeat(220)} FINDELENTRENAMIENTO`, dosificacion: '3 series' }] } }] })
    const raw = Buffer.from(bytes).toString('latin1')
    expect(raw.match(/\/Type \/Page\b/g)?.length).toBeGreaterThan(8)
    const streams = contentStreams(bytes)
    const text = [...streams.matchAll(/<([0-9a-f]+)>/gi)].map(match => Buffer.from(match[1], 'hex').toString('latin1')).join('')
    expect(text).toContain('FINDELENTRENAMIENTO')
  }, 20000)

  it('rejects a month with no saved sessions', async () => {
    await expect(createMonthlyPdf({ ...pdfSample, sessions: [] })).rejects.toThrow('No hay sesiones')
  })
})

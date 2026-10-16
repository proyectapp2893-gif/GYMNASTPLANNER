'use client'

import { useState, type FormEvent } from 'react'
import { Download, Loader2 } from 'lucide-react'

function currentMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
  return `${parts.find(part => part.type === 'year')!.value}-${parts.find(part => part.type === 'month')!.value}`
}

export default function MonthlyReportExport({ grupoId }: { grupoId: string }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [format, setFormat] = useState<'pdf' | 'xlsx'>('pdf')
  const [form, setForm] = useState({ mes: currentMonth(), modalidad: '', categoria: '', entrenador: '', observaciones: '' })
  async function download(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/reportes/mensual', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grupoId, ...form, formato: format }) })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'No se pudo descargar el reporte.')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      const encodedName = response.headers.get('Content-Disposition')?.match(/filename\*=UTF-8''([^;]+)/)?.[1]
      anchor.href = url
      anchor.download = encodedName ? decodeURIComponent(encodedName) : `reporte-${form.mes}.${format}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage(`${format === 'pdf' ? 'PDF' : 'Excel'} generado. Revisa el archivo y súbelo a la carpeta de tu modalidad y categoría.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo descargar el reporte.')
    } finally {
      setBusy(false)
    }
  }
  const inputClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm font-normal text-slate-800'
  return <section className="mb-6 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm print:hidden">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-black text-slate-800">Reporte mensual de entrenamiento</h2><p className="mt-1 text-sm text-slate-500">PDF para entregar o Excel navegable, con macrociclo y fichas de entrenamiento.</p></div>
      <button type="button" aria-expanded={open} aria-controls="monthly-report-form" onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"><Download className="h-4 w-4"/>{open ? 'Cerrar opciones' : 'Preparar reporte mensual'}</button>
    </div>
    {open && <form id="monthly-report-form" onSubmit={download} className="mt-5 space-y-4">
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 disabled:opacity-60">
        <label className="text-sm font-bold text-slate-700 sm:col-span-2 lg:col-span-4">Formato de entrega<select value={format} onChange={e => setFormat(e.target.value as 'pdf' | 'xlsx')} className={inputClass}><option value="pdf">PDF · Portada, gráfica y fichas diseñadas</option><option value="xlsx">Excel · Hojas de cálculo enlazadas</option></select></label>
        <label className="text-sm font-bold text-slate-700">Mes y año<input required type="month" min="2000-01" max="2100-12" value={form.mes} onChange={e => setForm({ ...form, mes: e.target.value })} className={inputClass}/></label>
        <label className="text-sm font-bold text-slate-700">Modalidad<input required maxLength={80} value={form.modalidad} onChange={e => setForm({ ...form, modalidad: e.target.value })} className={inputClass}/></label>
        <label className="text-sm font-bold text-slate-700">Categoría<input required maxLength={80} placeholder="Ej. Femenino" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} className={inputClass}/></label>
        <label className="text-sm font-bold text-slate-700">Entrenador<input maxLength={120} value={form.entrenador} onChange={e => setForm({ ...form, entrenador: e.target.value })} className={inputClass}/></label>
        <label className="text-sm font-bold text-slate-700 sm:col-span-2 lg:col-span-4">Observaciones del mes<textarea rows={2} maxLength={2000} value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} className={inputClass}/></label>
      </fieldset>
      <p className="text-xs text-slate-500">Incluye las sesiones guardadas con fecha y asignadas a este grupo. Guarda los cambios de tus clases antes de descargar. El reporte usa el horario actual del grupo: solo días asignados y sesiones guardadas. Los días asignados sin planeación se indican como pendientes.</p>
      <button disabled={busy} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4"/>}{busy ? `Generando ${format === 'pdf' ? 'PDF' : 'Excel'}…` : `Descargar reporte mensual ${format === 'pdf' ? 'PDF' : 'Excel'}`}</button>
    </form>}
    {message && <p role="status" className="mt-3 text-sm font-medium text-slate-700">{message}</p>}
  </section>
}

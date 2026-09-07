'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FlaskConical, Loader2, Plus, Settings2, Trash2 } from 'lucide-react'
import { useAppConfirm } from '../ui/useAppConfirm'

type Test = { id: string; name: string; unit: string; owned?: boolean }
type Battery = { id: string; name: string; description: string; active: boolean; testIds: string[] }
type Category = 'brazos' | 'abdomen' | 'piernas' | 'flexibilidad' | 'otras'

export default function BatteryManager({ tests, batteries }: { tests: Test[]; batteries: Battery[] }) {
  const router = useRouter()
  const { confirm, dialog } = useAppConfirm()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState('')
  const [deletedBatteryIds, setDeletedBatteryIds] = useState<Set<string>>(new Set())
  const [showTestForm, setShowTestForm] = useState(false)
  const [test, setTest] = useState({ name: '', code: '', unit: 'repeticiones', category: 'otras' as Category, higherIsBetter: true, instructions: '' })

  const submitBattery = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy('create-battery')
    const response = await fetch('/api/baterias-pruebas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description: description || null, testIds: selected }) })
    const result = await response.json() as { error?: string }
    setMessage(response.ok ? 'Batería creada correctamente.' : result.error || 'No se pudo crear')
    if (response.ok) { setName(''); setDescription(''); setSelected([]); router.refresh() }
    setBusy('')
  }

  const submitTest = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy('create-test')
    const response = await fetch('/api/catalogos-individuales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'physical_test', ...test, code: test.code || slug(test.name), instructions: test.instructions || null }) })
    const result = await response.json() as { error?: string }
    setMessage(response.ok ? 'Prueba creada. Ya puedes incluirla en una batería.' : result.error || 'No se pudo crear la prueba')
    if (response.ok) { setTest({ name: '', code: '', unit: 'repeticiones', category: 'otras', higherIsBetter: true, instructions: '' }); setShowTestForm(false); router.refresh() }
    setBusy('')
  }

  const toggle = async (battery: Battery) => {
    setBusy(battery.id)
    const response = await fetch('/api/baterias-pruebas', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: battery.id, active: !battery.active }) })
    const result = await response.json() as { error?: string }
    setMessage(response.ok ? `Batería ${battery.active ? 'desactivada' : 'activada'}.` : result.error || 'No se pudo actualizar')
    if (response.ok) router.refresh()
    setBusy('')
  }

  const remove = async (battery: Battery) => {
    if (!(await confirm({ title: `Eliminar “${battery.name}”`, description: 'La batería desaparecerá de la configuración. Las evaluaciones realizadas conservarán todos sus resultados, pero dejarán de estar vinculadas a esta batería.', confirmLabel: 'Eliminar batería', tone: 'danger' }))) return
    setBusy(battery.id)
    const response = await fetch(`/api/baterias-pruebas?id=${encodeURIComponent(battery.id)}`, { method: 'DELETE' })
    const result = await response.json() as { error?: string; preservedSessions?: number }
    setMessage(response.ok ? `Batería eliminada. ${result.preservedSessions || 0} evaluaciones anteriores conservaron sus resultados.` : result.error || 'No se pudo eliminar')
    if (response.ok) setDeletedBatteryIds(current => new Set([...current, battery.id]))
    setBusy('')
  }

  const removeTest = async (item: Test) => {
    if (!(await confirm({ title: `Eliminar prueba “${item.name}”`, description: 'Se retirará también de las baterías donde esté incluida. Si tiene resultados históricos, el sistema impedirá eliminarla para proteger la información.', confirmLabel: 'Eliminar prueba', tone: 'danger' }))) return
    setBusy(`test-${item.id}`)
    const response = await fetch(`/api/catalogos-individuales?kind=physical_test&id=${encodeURIComponent(item.id)}`, { method: 'DELETE' })
    const result = await response.json() as { error?: string }
    setMessage(response.ok ? 'Prueba eliminada correctamente.' : result.error || 'No se pudo eliminar la prueba')
    if (response.ok) { setSelected(current => current.filter(id => id !== item.id)); router.refresh() }
    setBusy('')
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2"><FlaskConical className="text-indigo-600" /><div><h2 className="font-black">Baterías de pruebas físicas</h2><p className="text-sm text-slate-500">Agrupa pruebas configurables y define sus parámetros.</p></div></div>
      <button type="button" onClick={() => setShowTestForm(value => !value)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-black text-indigo-700"><Settings2 className="h-4 w-4" />{showTestForm ? 'Cerrar parámetros' : 'Agregar nueva prueba'}</button>
    </div>

    {showTestForm && <form onSubmit={submitTest} className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4">
      <div><h3 className="font-black text-indigo-950">Nueva prueba con parámetros</h3><p className="text-xs text-indigo-700">La prueba quedará disponible para el registro colectivo, individual y cualquier batería.</p></div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input label="Nombre de la prueba" required value={test.name} onChange={value => setTest(current => ({ ...current, name: value }))} />
        <Input label="Código estable (opcional)" pattern="[a-z0-9_-]+" placeholder={slug(test.name) || 'salto_vertical'} value={test.code} onChange={value => setTest(current => ({ ...current, code: value }))} />
        <label className="grid gap-1 text-sm font-bold">Grupo<select value={test.category} onChange={event => setTest(current => ({ ...current, category: event.target.value as Category }))} className="rounded-xl border bg-white p-3"><option value="brazos">Fuerza de brazos</option><option value="abdomen">Fuerza de abdomen</option><option value="piernas">Fuerza y potencia de piernas</option><option value="flexibilidad">Flexibilidad y movilidad</option><option value="otras">Otras capacidades</option></select></label>
        <label className="grid gap-1 text-sm font-bold">Unidad<select value={test.unit} onChange={event => setTest(current => ({ ...current, unit: event.target.value }))} className="rounded-xl border bg-white p-3"><option value="repeticiones">Repeticiones</option><option value="segundos">Segundos</option><option value="centimetros">Centímetros</option><option value="metros">Metros</option><option value="kilogramos">Kilogramos</option><option value="grados">Grados</option><option value="puntos">Puntos</option></select></label>
        <label className="grid gap-1 text-sm font-bold">Criterio de evolución<select value={test.higherIsBetter ? 'higher' : 'lower'} onChange={event => setTest(current => ({ ...current, higherIsBetter: event.target.value === 'higher' }))} className="rounded-xl border bg-white p-3"><option value="higher">Mayor resultado es mejor</option><option value="lower">Menor resultado es mejor</option></select></label>
        <label className="grid gap-1 text-sm font-bold sm:col-span-2 lg:col-span-1">Instrucciones<input value={test.instructions} onChange={event => setTest(current => ({ ...current, instructions: event.target.value }))} placeholder="Protocolo, posición, intentos…" className="rounded-xl border bg-white p-3" /></label>
      </div>
      <button disabled={busy === 'create-test' || test.name.trim().length < 2} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-black text-white disabled:opacity-40">{busy === 'create-test' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Crear prueba</button>
    </form>}

    <form onSubmit={submitBattery} className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Input label="Nombre" required minLength={3} value={name} onChange={setName} />
      <Input label="Descripción" value={description} onChange={setDescription} />
      <fieldset className="grid min-w-0 gap-2 overflow-hidden rounded-xl border p-4 sm:grid-cols-2 lg:col-span-2"><legend className="px-2 text-sm font-black">Pruebas incluidas</legend>{tests.map(item => <div key={item.id} className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-1 hover:bg-slate-50"><label className="flex min-w-0 flex-1 items-center gap-2 text-sm"><input className="shrink-0" type="checkbox" checked={selected.includes(item.id)} onChange={event => setSelected(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))} /><span className="min-w-0 break-words">{item.name} <span className="text-slate-400">({item.unit})</span></span></label>{item.owned && <button type="button" disabled={busy === `test-${item.id}`} onClick={() => removeTest(item)} title={`Eliminar ${item.name}`} aria-label={`Eliminar prueba ${item.name}`} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 disabled:opacity-40">{busy === `test-${item.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button>}</div>)}</fieldset>
      <button disabled={!name.trim() || selected.length === 0 || busy === 'create-battery'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 p-3 font-bold text-white disabled:opacity-40">{busy === 'create-battery' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Crear batería</button>
      {message && <p role="status" className="self-center rounded-xl bg-slate-100 p-3 text-sm font-bold">{message}</p>}
    </form>

    <div className="mt-6 grid gap-3 md:grid-cols-2">{batteries.filter(battery => !deletedBatteryIds.has(battery.id)).map(battery => <article key={battery.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-black">{battery.name}</h3><p className="text-xs text-slate-500">{battery.description || 'Sin descripción'} · {battery.testIds.length} pruebas</p></div><span className={`shrink-0 rounded-lg px-3 py-1 text-xs font-black ${battery.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{battery.active ? 'Activa' : 'Inactiva'}</span></div><p className="mt-3 text-sm text-slate-600">{battery.testIds.map(id => tests.find(item => item.id === id)?.name).filter(Boolean).join(' · ')}</p><div className="mt-4 flex flex-wrap gap-2 border-t pt-3"><button type="button" disabled={busy === battery.id} onClick={() => toggle(battery)} className="rounded-lg border px-3 py-2 text-xs font-bold">{battery.active ? 'Desactivar' : 'Activar'}</button><button type="button" disabled={busy === battery.id} onClick={() => remove(battery)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"><Trash2 className="h-3.5 w-3.5" />Eliminar</button>{busy === battery.id && <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />}</div></article>)}</div>
    {dialog}
  </section>
}

function Input({ label, onChange, ...props }: { label: string; onChange: (value: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) { return <label className="grid gap-1 text-sm font-bold">{label}<input {...props} onChange={event => onChange(event.target.value)} className="rounded-xl border bg-white p-3" /></label> }
function slug(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) }

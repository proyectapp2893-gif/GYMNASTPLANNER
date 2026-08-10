'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Filter, Loader2, Plus, Save, Search, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useClubStore } from '../../../store/useClubStore'

type Group = { id: string; nombre: string; nivel: string }
type Athlete = { id: string; nombre: string; grupo_id: string; grupos: { nombre: string; nivel: string } | { nombre: string; nivel: string }[] | null }
type Test = { id: string; nombre: string; unidad: string }
type Battery = { id: string; nombre: string; bateria_pruebas_items: { orden: number; prueba_id: string; catalogo_pruebas_fisicas: Test | Test[] | null }[] }

export default function BulkPhysicalTestRecorder() {
  const { clubId } = useClubStore()
  const [groups, setGroups] = useState<Group[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [batteries, setBatteries] = useState<Battery[]>([])
  const [batteryId, setBatteryId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [level, setLevel] = useState('')
  const [search, setSearch] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!clubId) return
    const load = async () => {
      setLoading(true)
      const [groupResult, athleteResult, batteryResult] = await Promise.all([
        supabase.from('grupos').select('id,nombre,nivel').eq('club_id', clubId).order('nivel').order('nombre'),
        supabase.from('atletas').select('id,nombre,grupo_id,grupos(nombre,nivel)').eq('club_id', clubId).is('deleted_at', null).order('nombre'),
        supabase.from('baterias_pruebas_fisicas').select('id,nombre,bateria_pruebas_items(orden,prueba_id,catalogo_pruebas_fisicas(id,nombre,unidad))').eq('club_id', clubId).eq('activa', true).order('nombre'),
      ])
      setGroups((groupResult.data || []) as Group[])
      setAthletes((athleteResult.data || []) as Athlete[])
      const loadedBatteries = (batteryResult.data || []) as Battery[]
      setBatteries(loadedBatteries)
      setBatteryId(current => current || loadedBatteries[0]?.id || '')
      setLoading(false)
    }
    void load()
  }, [clubId])

  const tests = useMemo(() => {
    const battery = batteries.find(item => item.id === batteryId)
    return (battery?.bateria_pruebas_items || []).sort((a, b) => a.orden - b.orden).flatMap(item => {
      const test = Array.isArray(item.catalogo_pruebas_fisicas) ? item.catalogo_pruebas_fisicas[0] : item.catalogo_pruebas_fisicas
      return test ? [test] : []
    })
  }, [batteries, batteryId])

  const visibleAthletes = useMemo(() => athletes.filter(athlete => {
    const group = Array.isArray(athlete.grupos) ? athlete.grupos[0] : athlete.grupos
    return (!groupId || athlete.grupo_id === groupId) && (!level || group?.nivel === level) && (!search || athlete.nombre.toLowerCase().includes(search.toLowerCase()))
  }), [athletes, groupId, level, search])

  const save = async () => {
    if (!batteryId || tests.length === 0) return setMessage('Selecciona una batería con pruebas configuradas.')
    const rows = visibleAthletes.map(athlete => ({ athlete, results: tests.flatMap(test => {
      const raw = values[`${athlete.id}:${test.id}`]
      return raw === undefined || raw === '' ? [] : [{ testId: test.id, value: Number(raw), notes: null }]
    }) })).filter(row => row.results.length > 0)
    if (rows.length === 0) return setMessage('Ingresa al menos un resultado antes de guardar.')
    setSaving(true)
    setMessage('')
    const responses = await Promise.all(rows.map(row => fetch(`/api/gimnastas/${row.athlete.id}/evaluaciones`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ batteryId, date, notes: null, results: row.results }) })))
    const failed = responses.filter(response => !response.ok).length
    if (failed) setMessage(`${rows.length - failed} registros guardados; ${failed} presentaron error.`)
    else { setMessage(`${rows.length} gimnastas registradas correctamente.`); setValues({}) }
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center rounded-2xl border bg-white p-16"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>

  return <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
      <div><h2 className="flex items-center gap-2 text-xl font-black text-slate-900"><Users className="text-emerald-600" /> Registro colectivo</h2><p className="text-sm text-slate-500">Registra a todas las gimnastas en una sola planilla; usa los filtros solo cuando los necesites.</p></div>
      <Link href="/configuracion/catalogos-individuales" className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-black text-indigo-700"><Plus className="h-4 w-4" /> Crear prueba o batería</Link>
    </div>
    <div className="grid gap-3 border-b border-slate-100 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-5">
      <label className="grid gap-1 text-xs font-black text-slate-600">Batería<select value={batteryId} onChange={event => setBatteryId(event.target.value)} className="rounded-xl border bg-white p-2.5 text-sm"><option value="">Seleccionar</option>{batteries.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
      <label className="grid gap-1 text-xs font-black text-slate-600"><Filter className="inline h-3 w-3" /> Grupo<select value={groupId} onChange={event => setGroupId(event.target.value)} className="rounded-xl border bg-white p-2.5 text-sm"><option value="">Todos los grupos</option>{groups.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
      <label className="grid gap-1 text-xs font-black text-slate-600">Nivel<select value={level} onChange={event => setLevel(event.target.value)} className="rounded-xl border bg-white p-2.5 text-sm"><option value="">Todos los niveles</option>{[...new Set(groups.map(item => item.nivel))].map(item => <option key={item}>{item}</option>)}</select></label>
      <label className="grid gap-1 text-xs font-black text-slate-600"><Search className="inline h-3 w-3" /> Buscar<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Nombre" className="rounded-xl border bg-white p-2.5 text-sm" /></label>
      <label className="grid gap-1 text-xs font-black text-slate-600">Fecha<input type="date" value={date} onChange={event => setDate(event.target.value)} className="rounded-xl border bg-white p-2.5 text-sm" /></label>
    </div>
    {batteries.length === 0 ? <div className="p-10 text-center"><p className="font-bold text-amber-700">Primero crea una batería de pruebas.</p><Link href="/configuracion/catalogos-individuales" className="mt-3 inline-block font-black text-indigo-700 underline">Ir a configuración</Link></div> : <div className="overflow-x-auto"><table className="min-w-full border-collapse text-sm"><thead><tr className="bg-slate-100 text-left text-xs uppercase text-slate-500"><th className="sticky left-0 z-10 min-w-56 bg-slate-100 p-3">Gimnasta</th>{tests.map(test => <th key={test.id} className="min-w-36 p-3">{test.nombre}<span className="block text-[10px] font-medium normal-case">{test.unidad}</span></th>)}</tr></thead><tbody>{visibleAthletes.map(athlete => { const group = Array.isArray(athlete.grupos) ? athlete.grupos[0] : athlete.grupos; return <tr key={athlete.id} className="border-t hover:bg-emerald-50/30"><td className="sticky left-0 bg-white p-3"><b>{athlete.nombre}</b><span className="block text-xs text-slate-500">{group?.nombre} · {group?.nivel}</span></td>{tests.map(test => <td key={test.id} className="p-2"><input type="number" min="0" step="any" aria-label={`${test.nombre} de ${athlete.nombre}`} value={values[`${athlete.id}:${test.id}`] || ''} onChange={event => setValues(current => ({ ...current, [`${athlete.id}:${test.id}`]: event.target.value }))} className="w-full rounded-lg border border-slate-200 p-2 outline-none focus:ring-2 focus:ring-emerald-500" /></td>)}</tr>})}</tbody></table></div>}
    <div className="flex flex-col items-start justify-between gap-3 border-t p-4 sm:flex-row sm:items-center"><p className="text-sm font-bold text-slate-600">{visibleAthletes.length} gimnastas visibles</p><div className="flex items-center gap-3">{message && <span className="flex items-center gap-1 text-sm font-bold text-slate-700"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{message}</span>}<button onClick={save} disabled={saving || !batteryId} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-black text-white disabled:opacity-40">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}Guardar planilla</button></div></div>
  </section>
}

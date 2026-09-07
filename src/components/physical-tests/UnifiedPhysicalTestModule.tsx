'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ClipboardList, Filter, History, Loader2, Plus, RotateCcw, Save, Search, Users, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useClubStore } from '../../../store/useClubStore'
import { useAppConfirm } from '../ui/useAppConfirm'

type Group = { id: string; nombre: string; nivel: string }
type Athlete = { id: string; nombre: string; grupo_id: string; grupos: { nombre: string; nivel: string } | { nombre: string; nivel: string }[] | null }
type Test = { id: string; codigo: string; nombre: string; unidad: string; mayor_es_mejor: boolean; metadatos: { grupo?: string } | null; catalogo_items: { codigo: string; nombre: string } | { codigo: string; nombre: string }[] | null }
type BatteryItem = { orden: number; prueba_id: string }
type Battery = { id: string; nombre: string; bateria_pruebas_items: BatteryItem[] }
type HistoryResult = { id: string; valor: number; unidad: string; catalogo_pruebas_fisicas: { id: string; nombre: string; mayor_es_mejor: boolean } | { id: string; nombre: string; mayor_es_mejor: boolean }[] | null }
type HistorySession = { id: string; fecha: string; observaciones: string | null; baterias_pruebas_fisicas: { nombre: string } | { nombre: string }[] | null; resultados_pruebas_fisicas: HistoryResult[] }
type CollectiveHistorySession = HistorySession & { atleta_id: string; atletas: Athlete | Athlete[] | null }
type LegacySession = { id: string; fecha: string; resultados: Record<string, unknown> | null }
type Mode = 'collective' | 'individual'
type Draft = { values: Record<string, string>; date: string; testSetId: string; groupId: string; level: string; athleteId: string }

const today = () => new Date().toISOString().slice(0, 10)
const relation = <T,>(value: T | T[] | null) => Array.isArray(value) ? value[0] : value

export default function UnifiedPhysicalTestModule() {
  const { clubId, setClubData } = useClubStore()
  const { confirm, dialog } = useAppConfirm()
  const [activeClubId, setActiveClubId] = useState<string | null>(clubId)
  const [mode, setMode] = useState<Mode>('collective')
  const [groups, setGroups] = useState<Group[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [catalog, setCatalog] = useState<Test[]>([])
  const [batteries, setBatteries] = useState<Battery[]>([])
  const [testSetId, setTestSetId] = useState('all')
  const [groupId, setGroupId] = useState('')
  const [level, setLevel] = useState('')
  const [athleteId, setAthleteId] = useState('')
  const [search, setSearch] = useState('')
  const [date, setDate] = useState(today)
  const [values, setValues] = useState<Record<string, string>>({})
  const [history, setHistory] = useState<HistorySession[]>([])
  const [legacyHistory, setLegacyHistory] = useState<LegacySession[]>([])
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [collectiveHistory, setCollectiveHistory] = useState<CollectiveHistorySession[]>([])
  const [collectiveHistoryLoading, setCollectiveHistoryLoading] = useState(false)
  const [showCollectiveHistory, setShowCollectiveHistory] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set())
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set())
  const [errorKeys, setErrorKeys] = useState<Set<string>>(new Set())

  const draftKey = activeClubId ? `gymnastplanner:physical-tests:${activeClubId}:${mode}` : ''

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      let targetClubId = clubId
      if (!targetClubId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase.from('perfiles').select('club_id').eq('id', user.id).maybeSingle()
          targetClubId = profile?.club_id || null
          if (targetClubId) {
            const { data: club } = await supabase.from('clubs').select('nombre,logo_url').eq('id', targetClubId).maybeSingle()
            setClubData({ clubId: targetClubId, nombreClub: club?.nombre || 'Club', logoUrl: club?.logo_url || '/default-club-logo.png' })
          }
        }
      }
      setActiveClubId(targetClubId)
      if (!targetClubId) { setMessage('No se pudo identificar el club activo.'); setLoading(false); return }
      const [groupResult, athleteResult, testResult, batteryResult] = await Promise.all([
        supabase.from('grupos').select('id,nombre,nivel').eq('club_id', targetClubId).order('nivel').order('nombre'),
        supabase.from('atletas').select('id,nombre,grupo_id,grupos(nombre,nivel)').eq('club_id', targetClubId).is('deleted_at', null).order('nombre'),
        supabase.from('catalogo_pruebas_fisicas').select('id,codigo,nombre,unidad,mayor_es_mejor,metadatos,catalogo_items(nombre,codigo)').eq('activo', true).or(`club_id.is.null,club_id.eq.${targetClubId}`).order('nombre'),
        supabase.from('baterias_pruebas_fisicas').select('id,nombre,bateria_pruebas_items(orden,prueba_id)').eq('club_id', targetClubId).eq('activa', true).order('nombre'),
      ])
      setGroups((groupResult.data || []) as Group[])
      setAthletes((athleteResult.data || []) as Athlete[])
      setCatalog((testResult.data || []) as Test[])
      setBatteries((batteryResult.data || []) as Battery[])
      setLoading(false)
    }
    void load()
  }, [clubId, setClubData])

  useEffect(() => {
    if (!draftKey || loading) return
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const stored = localStorage.getItem(draftKey)
      if (!stored) return
      const draft = JSON.parse(stored) as Partial<Draft>
      timer = setTimeout(() => {
        setValues(draft.values || {})
        setDate(draft.date || today())
        setTestSetId(draft.testSetId || 'all')
        setGroupId(draft.groupId || '')
        setLevel(draft.level || '')
        setAthleteId(draft.athleteId || '')
        if (Object.keys(draft.values || {}).length) setMessage('Borrador recuperado automáticamente.')
      }, 0)
    } catch { localStorage.removeItem(draftKey) }
    return () => { if (timer) clearTimeout(timer) }
  }, [draftKey, loading])

  useEffect(() => {
    if (!draftKey || loading) return
    const draft: Draft = { values, date, testSetId, groupId, level, athleteId }
    localStorage.setItem(draftKey, JSON.stringify(draft))
  }, [athleteId, date, draftKey, groupId, level, loading, testSetId, values])

  const tests = useMemo(() => {
    if (testSetId === 'all') return catalog
    const battery = batteries.find(item => item.id === testSetId)
    const order = new Map((battery?.bateria_pruebas_items || []).map(item => [item.prueba_id, item.orden]))
    return catalog.filter(test => order.has(test.id)).sort((a, b) => (order.get(a.id) || 0) - (order.get(b.id) || 0))
  }, [batteries, catalog, testSetId])

  const visibleAthletes = useMemo(() => athletes.filter(athlete => {
    const group = relation(athlete.grupos)
    return (!groupId || athlete.grupo_id === groupId) && (!level || group?.nivel === level) && (!search || athlete.nombre.toLowerCase().includes(search.toLowerCase()))
  }), [athletes, groupId, level, search])

  const selectedAthlete = athletes.find(item => item.id === athleteId)
  const activeAthletes = mode === 'individual' ? (selectedAthlete ? [selectedAthlete] : []) : visibleAthletes

  useEffect(() => {
    if (!activeClubId || !athleteId) return
    const loadHistory = async () => {
      setHistoryLoading(true)
      const [current, legacy] = await Promise.all([
        supabase.from('sesiones_pruebas_fisicas').select('id,fecha,observaciones,baterias_pruebas_fisicas(nombre),resultados_pruebas_fisicas(id,valor,unidad,catalogo_pruebas_fisicas(id,nombre,mayor_es_mejor))').eq('club_id', activeClubId).eq('atleta_id', athleteId).is('deleted_at', null).order('fecha', { ascending: false }).order('created_at', { ascending: false }).limit(30),
        supabase.from('evaluaciones_fisicas').select('id,fecha,resultados').eq('club_id', activeClubId).eq('atleta_id', athleteId).order('fecha', { ascending: false }).limit(30),
      ])
      setHistory((current.data || []) as HistorySession[])
      setLegacyHistory((legacy.data || []) as LegacySession[])
      if (current.error || legacy.error) setMessage(`No se pudo cargar todo el historial: ${current.error?.message || legacy.error?.message}`)
      setHistoryLoading(false)
    }
    void loadHistory()
  }, [activeClubId, athleteId])

  const setValue = (athlete: string, test: string, value: string) => {
    const key = `${athlete}:${test}`
    setValues(current => ({ ...current, [key]: value }))
    setSavedKeys(current => { const next = new Set(current); next.delete(key); return next })
    setErrorKeys(current => { const next = new Set(current); next.delete(key); return next })
  }

  const autoSaveResult = async (athlete: string, test: string) => {
    const key = `${athlete}:${test}`
    const raw = values[key]
    if (savedKeys.has(key) || savingKeys.has(key) || raw === undefined || raw.trim() === '') return
    const value = Number(raw)
    if (!Number.isFinite(value) || value < 0) {
      setErrorKeys(current => new Set(current).add(key))
      setMessage('Revisa el resultado marcado: debe ser un número igual o mayor que cero.')
      return
    }
    setSavingKeys(current => new Set(current).add(key))
    setErrorKeys(current => { const next = new Set(current); next.delete(key); return next })
    try {
      const response = await fetch(`/api/gimnastas/${athlete}/evaluaciones`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batteryId: testSetId === 'all' ? null : testSetId, date, notes: null, results: [{ testId: test, value, notes: null }] }),
      })
      const body = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(body.error || 'No se pudo guardar')
      setSavedKeys(current => new Set(current).add(key))
      setMessage('Resultado guardado automáticamente en la nube.')
    } catch (error) {
      setErrorKeys(current => new Set(current).add(key))
      setMessage(`No se pudo guardar automáticamente: ${error instanceof Error ? error.message : 'revisa la conexión'}. El valor permanece en el borrador.`)
    } finally {
      setSavingKeys(current => { const next = new Set(current); next.delete(key); return next })
    }
  }

  const save = async () => {
    if (activeAthletes.length === 0) return setMessage(mode === 'individual' ? 'Selecciona una gimnasta.' : 'No hay gimnastas visibles.')
    const rows = activeAthletes.map(athlete => ({ athlete, results: tests.flatMap(test => {
      const key = `${athlete.id}:${test.id}`
      const raw = values[key]
      return raw === undefined || raw.trim() === '' ? [] : [{ key, testId: test.id, value: Number(raw), notes: null }]
    }) })).filter(row => row.results.length)
    if (!rows.length) return setMessage('Ingresa al menos un resultado antes de guardar.')
    if (rows.some(row => row.results.some(result => !Number.isFinite(result.value)))) return setMessage('Revisa los resultados: todos deben ser valores numéricos.')
    setSaving(true)
    setMessage('')
    const outcomes = await Promise.all(rows.map(async row => {
      const response = await fetch(`/api/gimnastas/${row.athlete.id}/evaluaciones`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batteryId: testSetId === 'all' ? null : testSetId, date, notes: null, results: row.results.map(({ testId, value, notes }) => ({ testId, value, notes })) }),
      })
      const body = await response.json().catch(() => ({})) as { error?: string }
      return { ok: response.ok, keys: row.results.map(result => result.key), error: body.error }
    }))
    const successful = outcomes.filter(item => item.ok)
    const failed = outcomes.filter(item => !item.ok)
    setSavedKeys(current => new Set([...current, ...successful.flatMap(item => item.keys)]))
    setMessage(failed.length ? `${successful.length} gimnastas guardadas; ${failed.length} con error: ${failed[0].error || 'revisa la conexión'}. Los datos permanecen en pantalla.` : `${successful.length} gimnastas guardadas correctamente. Los valores permanecen visibles hasta iniciar una planilla nueva.`)
    if (mode === 'individual' && athleteId && successful.length) {
      const { data } = await supabase.from('sesiones_pruebas_fisicas').select('id,fecha,observaciones,baterias_pruebas_fisicas(nombre),resultados_pruebas_fisicas(id,valor,unidad,catalogo_pruebas_fisicas(id,nombre,mayor_es_mejor))').eq('club_id', activeClubId).eq('atleta_id', athleteId).is('deleted_at', null).order('fecha', { ascending: false }).order('created_at', { ascending: false }).limit(30)
      setHistory((data || []) as HistorySession[])
    }
    setSaving(false)
  }

  const clearDraft = async () => {
    if (Object.keys(values).length && !(await confirm({ title: 'Iniciar una planilla nueva', description: 'Se limpiarán los valores visibles y el borrador guardado en este dispositivo. Los resultados que ya fueron guardados en el historial no se eliminarán.', confirmLabel: 'Limpiar planilla', tone: 'warning' }))) return
    setValues({})
    setSavedKeys(new Set())
    setSavingKeys(new Set())
    setErrorKeys(new Set())
    setMessage('Planilla nueva lista para registrar.')
    if (draftKey) localStorage.removeItem(draftKey)
  }

  const openCollectiveHistory = async () => {
    if (!activeClubId) return
    setShowCollectiveHistory(true)
    setCollectiveHistoryLoading(true)
    const { data, error } = await supabase
      .from('sesiones_pruebas_fisicas')
      .select('id,fecha,observaciones,atleta_id,atletas(id,nombre,grupo_id,grupos(nombre,nivel)),baterias_pruebas_fisicas(nombre),resultados_pruebas_fisicas(id,valor,unidad,catalogo_pruebas_fisicas(id,nombre,mayor_es_mejor))')
      .eq('club_id', activeClubId)
      .is('deleted_at', null)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(150)
    if (error) setMessage(`No se pudo cargar el historial colectivo: ${error.message}`)
    setCollectiveHistory((data || []) as CollectiveHistorySession[])
    setCollectiveHistoryLoading(false)
  }

  const showCollectiveHistoryDate = (selectedDate: string) => {
    const athleteIds = new Set(visibleAthletes.map(athlete => athlete.id))
    const testIds = new Set(tests.map(test => test.id))
    const historicalValues: Record<string, string> = {}
    for (const session of collectiveHistory) {
      if (session.fecha !== selectedDate || !athleteIds.has(session.atleta_id)) continue
      for (const result of session.resultados_pruebas_fisicas) {
        const test = relation(result.catalogo_pruebas_fisicas)
        if (test && testIds.has(test.id)) historicalValues[`${session.atleta_id}:${test.id}`] = String(result.valor)
      }
    }
    setDate(selectedDate)
    setValues(historicalValues)
    setSavedKeys(new Set(Object.keys(historicalValues)))
    setMessage(`${Object.keys(historicalValues).length} resultados del ${formatDate(selectedDate)} cargados desde el historial.`)
    setShowCollectiveHistory(false)
  }

  if (loading) return <div className="flex justify-center rounded-2xl border bg-white p-16"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>

  return <section className="space-y-5">
    <div className="grid grid-cols-1 gap-1 rounded-xl bg-slate-100 p-1.5 sm:grid-cols-2">
      <ModeButton active={mode === 'collective'} onClick={() => setMode('collective')} icon={<Users />}>Todas las gimnastas</ModeButton>
      <ModeButton active={mode === 'individual'} onClick={() => setMode('individual')} icon={<ClipboardList />}>Registro individual e historial</ModeButton>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
        <div><h2 className="text-xl font-black text-slate-900">{mode === 'collective' ? 'Planilla colectiva' : 'Evaluación individual'}</h2><p className="text-sm text-slate-500">Elige “Todas las pruebas” o una batería. La selección es idéntica en ambos modos.</p></div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {mode === 'collective' && <button type="button" onClick={openCollectiveHistory} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"><History className="h-4 w-4" />Historial colectivo</button>}
          <Link href="/configuracion/catalogos-individuales" className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-black text-indigo-700"><Plus className="h-4 w-4" />Crear prueba o batería</Link>
        </div>
      </div>

      <div className="grid gap-3 border-b bg-slate-50 p-4 sm:grid-cols-2 xl:grid-cols-6">
        <Field label="Pruebas / batería"><select value={testSetId} onChange={event => setTestSetId(event.target.value)}><option value="all">Todas las pruebas activas ({catalog.length})</option>{batteries.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></Field>
        <Field label="Grupo" icon={<Filter />}><select value={groupId} onChange={event => { setGroupId(event.target.value); if (mode === 'individual') { setAthleteId(''); setHistory([]); setLegacyHistory([]) } }}><option value="">Todos los grupos</option>{groups.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></Field>
        <Field label="Nivel"><select value={level} onChange={event => setLevel(event.target.value)}><option value="">Todos los niveles</option>{[...new Set(groups.map(item => item.nivel))].map(item => <option key={item}>{item}</option>)}</select></Field>
        {mode === 'collective' ? <Field label="Buscar" icon={<Search />}><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Nombre" /></Field> : <Field label="Gimnasta"><select value={athleteId} onChange={event => { setAthleteId(event.target.value); setHistory([]); setLegacyHistory([]) }}><option value="">Seleccionar</option>{visibleAthletes.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></Field>}
        <Field label="Fecha"><input type="date" value={date} onChange={event => setDate(event.target.value)} /></Field>
        <div className="flex items-end"><button type="button" onClick={clearDraft} className="flex w-full items-center justify-center gap-2 rounded-xl border bg-white p-2.5 text-sm font-black text-slate-700"><RotateCcw className="h-4 w-4" />Nueva planilla</button></div>
      </div>

      {catalog.length === 0 ? <EmptyCatalog /> : mode === 'collective'
        ? <CollectiveGrid athletes={visibleAthletes} tests={tests} values={values} savedKeys={savedKeys} savingKeys={savingKeys} errorKeys={errorKeys} onChange={setValue} onBlur={autoSaveResult} />
        : <IndividualGrid athlete={selectedAthlete} tests={tests} values={values} savedKeys={savedKeys} savingKeys={savingKeys} errorKeys={errorKeys} onChange={setValue} onBlur={autoSaveResult} />}

      <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-bold text-slate-600">Respaldo local activo. Cada celda se guarda en la nube al salir de ella.</p>{message && <p role="status" className="mt-1 flex items-start gap-1 text-sm font-bold text-indigo-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{message}</p>}</div>
        <button type="button" onClick={save} disabled={saving || tests.length === 0} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-black text-white disabled:opacity-40">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}Guardar resultados</button>
      </div>
    </div>

    {mode === 'individual' && <HistoryPanel athlete={selectedAthlete} sessions={history} legacySessions={legacyHistory} loading={historyLoading} />}
    {showCollectiveHistory && <CollectiveHistoryDialog sessions={collectiveHistory} athletes={visibleAthletes} tests={tests} loading={collectiveHistoryLoading} groupId={groupId} level={level} search={search} onSelectDate={showCollectiveHistoryDate} onClose={() => setShowCollectiveHistory(false)} />}
    {dialog}
  </section>
}

function ModeButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`flex min-h-12 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-black ${active ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}><span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>{children}</button>
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return <label className="grid gap-1 text-xs font-black text-slate-600"><span className="flex items-center gap-1 [&>svg]:h-3 [&>svg]:w-3">{icon}{label}</span><span className="contents [&>input]:rounded-xl [&>input]:border [&>input]:bg-white [&>input]:p-2.5 [&>select]:rounded-xl [&>select]:border [&>select]:bg-white [&>select]:p-2.5">{children}</span></label>
}

function CollectiveGrid({ athletes, tests, values, savedKeys, savingKeys, errorKeys, onChange, onBlur }: { athletes: Athlete[]; tests: Test[]; values: Record<string, string>; savedKeys: Set<string>; savingKeys: Set<string>; errorKeys: Set<string>; onChange: (athlete: string, test: string, value: string) => void; onBlur: (athlete: string, test: string) => void }) {
  const groups = groupTests(tests)
  const orderedTests = groups.flatMap(group => group.tests)
  return <div className="overflow-x-auto"><table className="w-full table-fixed border-collapse text-xs"><colgroup><col className="w-44 sm:w-52" />{orderedTests.map(test => <col key={test.id} />)}</colgroup><thead><tr className="bg-slate-800 text-left text-[10px] uppercase tracking-wide text-white"><th rowSpan={2} className="sticky left-0 z-20 border-r border-slate-600 bg-slate-800 p-2">Gimnasta</th>{groups.map(group => <th key={group.name} colSpan={group.tests.length} className={`border-r border-white/20 p-2 text-center ${group.header}`}>{group.name}</th>)}</tr><tr className="bg-slate-100 text-left text-[10px] uppercase text-slate-500">{orderedTests.map(test => <TestHeading key={test.id} test={test} />)}</tr></thead><tbody>{athletes.map(athlete => { const group = relation(athlete.grupos); return <tr key={athlete.id} className="border-t hover:bg-emerald-50/30"><td className="sticky left-0 z-[1] bg-white p-2"><b className="leading-tight">{athlete.nombre}</b><span className="block text-[10px] text-slate-500">{group?.nombre} · {group?.nivel}</span></td>{orderedTests.map(test => { const key = `${athlete.id}:${test.id}`; return <ResultCell key={test.id} label={`${test.nombre} de ${athlete.nombre}`} value={values[key] || ''} saved={savedKeys.has(key)} saving={savingKeys.has(key)} error={errorKeys.has(key)} onChange={value => onChange(athlete.id, test.id, value)} onBlur={() => onBlur(athlete.id, test.id)} /> })}</tr>})}</tbody></table>{athletes.length === 0 && <p className="p-10 text-center text-sm text-slate-500">No hay gimnastas para los filtros seleccionados.</p>}</div>
}

function IndividualGrid({ athlete, tests, values, savedKeys, savingKeys, errorKeys, onChange, onBlur }: { athlete?: Athlete; tests: Test[]; values: Record<string, string>; savedKeys: Set<string>; savingKeys: Set<string>; errorKeys: Set<string>; onChange: (athlete: string, test: string, value: string) => void; onBlur: (athlete: string, test: string) => void }) {
  if (!athlete) return <p className="p-12 text-center text-sm text-slate-500">Selecciona una gimnasta para registrar y consultar su historial.</p>
  return <div className="grid gap-5 p-4 lg:grid-cols-2">{groupTests(tests).map(group => <section key={group.name} className="overflow-hidden rounded-2xl border bg-white"><h3 className={`px-4 py-3 text-sm font-black uppercase tracking-wider ${group.header}`}>{group.name}</h3><div className="grid gap-3 p-4 sm:grid-cols-2">{group.tests.map(test => { const key = `${athlete.id}:${test.id}`; const saving = savingKeys.has(key); const error = errorKeys.has(key); return <label key={test.id} className={`rounded-xl border p-4 ${error ? 'border-rose-300 bg-rose-50' : savedKeys.has(key) ? 'border-emerald-300 bg-emerald-50' : 'bg-slate-50'}`}><span className="font-black text-slate-800">{test.nombre}</span><span className="mt-1 block text-xs text-slate-500">Unidad: {test.unidad} · {test.mayor_es_mejor ? 'mayor resultado es mejor' : 'menor resultado es mejor'}</span><input type="number" step="any" value={values[key] || ''} onChange={event => onChange(athlete.id, test.id, event.target.value)} onBlur={() => onBlur(athlete.id, test.id)} className="mt-3 w-full rounded-xl border bg-white p-3 outline-none focus:ring-2 focus:ring-emerald-500" />{saving ? <span className="mt-2 flex items-center gap-1 text-xs font-black text-indigo-700"><Loader2 className="h-3.5 w-3.5 animate-spin" />Guardando</span> : error ? <span className="mt-2 text-xs font-black text-rose-700">Error al guardar</span> : savedKeys.has(key) && <span className="mt-2 flex items-center gap-1 text-xs font-black text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Guardado</span>}</label>})}</div></section>)}</div>
}

function groupTests(tests: Test[]) {
  const definitions = [
    { name: 'Fuerza de brazos', header: 'bg-indigo-600 text-white', words: ['brazo', 'dominada', 'flexion', 'remo', 'soga'] },
    { name: 'Fuerza de abdomen', header: 'bg-rose-600 text-white', words: ['abdomen', 'abdominal', 'hollow', 'arch', 'canoa', 'core', 'tronco'] },
    { name: 'Fuerza y potencia de piernas', header: 'bg-amber-500 text-slate-950', words: ['pierna', 'sentadilla', 'pantorrilla', 'salto', 'carrera'] },
    { name: 'Flexibilidad y movilidad', header: 'bg-sky-600 text-white', words: ['flexibilidad', 'movilidad', 'split', 'hombro', 'arco', 'stick'] },
    { name: 'Otras capacidades', header: 'bg-slate-600 text-white', words: [] },
  ]
  const buckets = new Map(definitions.map(item => [item.name, [] as Test[]]))
  for (const test of tests) {
    const capacity = relation(test.catalogo_items)
    const configuredGroups: Record<string, string> = { brazos: 'Fuerza de brazos', abdomen: 'Fuerza de abdomen', piernas: 'Fuerza y potencia de piernas', flexibilidad: 'Flexibilidad y movilidad', otras: 'Otras capacidades' }
    const configured = test.metadatos?.grupo ? definitions.find(item => item.name === configuredGroups[test.metadatos!.grupo!]) : undefined
    const source = `${capacity?.codigo || ''} ${capacity?.nombre || ''} ${test.codigo} ${test.nombre}`.toLowerCase()
    const target = configured || definitions.find(item => item.words.some(word => source.includes(word))) || definitions.at(-1)!
    buckets.get(target.name)!.push(test)
  }
  return definitions.map(item => ({ ...item, tests: buckets.get(item.name)! })).filter(item => item.tests.length)
}

function TestHeading({ test }: { test: Test }) { return <th className="overflow-hidden p-2 align-top"><span className="block break-words normal-case leading-tight text-slate-700">{test.nombre}</span><span className="mt-0.5 block break-words text-[9px] font-medium normal-case leading-tight">{test.unidad} · {test.mayor_es_mejor ? 'mayor es mejor' : 'menor es mejor'}</span></th> }
function ResultCell({ label, value, saved, saving, error, onChange, onBlur }: { label: string; value: string; saved: boolean; saving: boolean; error: boolean; onChange: (value: string) => void; onBlur: () => void }) { return <td className={`p-1.5 ${error ? 'bg-rose-50' : saved ? 'bg-emerald-50' : ''}`}><div className="relative"><input type="number" step="any" aria-label={label} value={value} onChange={event => onChange(event.target.value)} onBlur={onBlur} aria-invalid={error} className={`min-w-0 w-full rounded-lg border p-2 pr-6 outline-none focus:ring-2 ${error ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-200 focus:ring-emerald-500'}`} />{saving ? <Loader2 className="absolute right-1.5 top-2.5 h-3.5 w-3.5 animate-spin text-indigo-600" /> : saved ? <CheckCircle2 className="absolute right-1.5 top-2.5 h-3.5 w-3.5 text-emerald-600" /> : error ? <span className="absolute right-2 top-1.5 font-black text-rose-600">!</span> : null}</div></td> }

function CollectiveHistoryDialog({ sessions, athletes, tests, loading, groupId, level, search, onSelectDate, onClose }: { sessions: CollectiveHistorySession[]; athletes: Athlete[]; tests: Test[]; loading: boolean; groupId: string; level: string; search: string; onSelectDate: (date: string) => void; onClose: () => void }) {
  const athleteIds = new Set(athletes.map(athlete => athlete.id))
  const testIds = new Set(tests.map(test => test.id))
  const visibleSessions = sessions.flatMap(session => {
    if (!athleteIds.has(session.atleta_id)) return []
    const results = session.resultados_pruebas_fisicas.filter(result => {
      const test = relation(result.catalogo_pruebas_fisicas)
      return test ? testIds.has(test.id) : false
    })
    return results.length ? [{ ...session, resultados_pruebas_fisicas: results }] : []
  })
  const dates = [...new Set(visibleSessions.map(session => session.fecha))]
  const filters = [groupId ? 'grupo seleccionado' : '', level ? `nivel ${level}` : '', search ? `nombre “${search}”` : ''].filter(Boolean)

  return <div className="fixed inset-0 z-[250] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={event => { if (event.currentTarget === event.target) onClose() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="collective-history-title" className="flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
      <header className="flex items-start justify-between gap-4 border-b p-5 sm:p-6">
        <div><h2 id="collective-history-title" className="flex items-center gap-2 text-xl font-black text-slate-900 sm:text-2xl"><History className="h-6 w-6 text-indigo-600" />Fechas de pruebas realizadas</h2><p className="mt-1 text-sm text-slate-500">Selecciona una fecha para cargar en la planilla principal todos sus resultados{filters.length ? `, filtrados por ${filters.join(', ')}` : ''}.</p></div>
        <button type="button" onClick={onClose} aria-label="Cerrar historial" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"><X className="h-5 w-5" /></button>
      </header>
      <div className="overflow-y-auto p-4 sm:p-6">
        {loading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div> : dates.length === 0 ? <div className="rounded-2xl bg-slate-50 p-10 text-center"><History className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 font-black text-slate-700">No hay registros para los filtros actuales.</p><p className="mt-1 text-sm text-slate-500">Puedes cerrar el historial y cambiar el grupo, nivel, batería o búsqueda.</p></div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{dates.map(historyDate => { const daySessions = visibleSessions.filter(session => session.fecha === historyDate); const athleteCount = new Set(daySessions.map(session => session.atleta_id)).size; const resultCount = daySessions.reduce((total, session) => total + session.resultados_pruebas_fisicas.length, 0); return <button type="button" key={historyDate} onClick={() => onSelectDate(historyDate)} className="group rounded-2xl border border-slate-200 p-5 text-left shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md"><span className="block text-lg font-black text-slate-900 group-hover:text-indigo-700">{formatDate(historyDate)}</span><span className="mt-2 block text-sm font-bold text-slate-500">{athleteCount} {athleteCount === 1 ? 'gimnasta' : 'gimnastas'} · {resultCount} resultados</span><span className="mt-4 block text-sm font-black text-indigo-600">Ver resultados en la planilla →</span></button> })}</div>}
      </div>
      <footer className="border-t bg-slate-50 p-4 sm:flex sm:justify-end"><button type="button" onClick={onClose} className="w-full rounded-xl bg-slate-900 px-5 py-3 font-black text-white sm:w-auto">Volver a la planilla</button></footer>
    </section>
  </div>
}

function HistoryPanel({ athlete, sessions, legacySessions, loading }: { athlete?: Athlete; sessions: HistorySession[]; legacySessions: LegacySession[]; loading: boolean }) {
  const hasHistory = sessions.length > 0 || legacySessions.length > 0
  return <section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-xl font-black"><History className="text-indigo-600" />Historial {athlete ? `de ${athlete.nombre}` : ''}</h2>{!athlete ? <p className="mt-4 text-sm text-slate-500">Selecciona una gimnasta para consultar sus registros.</p> : loading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" /></div> : !hasHistory ? <p className="mt-4 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">Todavía no hay evaluaciones guardadas.</p> : <><div className="mt-4 space-y-4">{sessions.map((session, index) => <CurrentHistoryCard key={session.id} session={session} olderSessions={sessions.slice(index + 1)} />)}</div>{legacySessions.length > 0 && <div className="mt-6 border-t pt-5"><h3 className="text-sm font-black uppercase tracking-wider text-amber-700">Registros anteriores conservados</h3><p className="mt-1 text-xs text-slate-500">Fueron tomados antes del catálogo unificado y se muestran sin alterar sus valores originales.</p><div className="mt-3 grid gap-4 lg:grid-cols-2">{legacySessions.map(session => <article key={session.id} className="rounded-xl border border-amber-200 bg-amber-50/40 p-4"><h4 className="font-black">{formatDate(session.fecha)}</h4><dl className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries(session.resultados || {}).filter(([key, value]) => key !== 'analisis' && value !== '' && value !== null && value !== undefined).map(([key, value]) => <div key={key} className="rounded-lg bg-white p-3"><dt className="text-xs font-bold capitalize text-slate-500">{key.replaceAll('_', ' ')}</dt><dd className="font-black text-slate-800">{String(value)}</dd></div>)}</dl></article>)}</div></div>}</>}</section>
}

function CurrentHistoryCard({ session, olderSessions }: { session: HistorySession; olderSessions: HistorySession[] }) {
  return <article className="rounded-xl border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-black">{formatDate(session.fecha)}</h3><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">{relation(session.baterias_pruebas_fisicas)?.nombre || 'Evaluación libre'}</span></div><div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{session.resultados_pruebas_fisicas.map(result => { const test = relation(result.catalogo_pruebas_fisicas); const previous = olderSessions.flatMap(item => item.resultados_pruebas_fisicas).find(item => relation(item.catalogo_pruebas_fisicas)?.id === test?.id); const comparison = compareResult(Number(result.valor), previous ? Number(previous.valor) : null, test?.mayor_es_mejor ?? true); return <div key={result.id} className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-500">{test?.nombre || 'Prueba'}</p><div className="mt-1 flex items-end justify-between gap-3"><p className="text-lg font-black text-slate-900">{result.valor} <span className="text-xs text-slate-500">{result.unidad}</span></p>{previous && <p className="text-xs text-slate-500">Anterior: <b>{previous.valor}</b></p>}</div><div className={`mt-2 rounded-lg px-2.5 py-2 text-xs font-bold ${comparison.style}`}><p>{comparison.label}</p><p className="mt-0.5 font-medium">{comparison.detail}</p></div></div> })}</div></article>
}

function compareResult(current: number, previous: number | null, higherIsBetter: boolean) {
  if (previous === null || !Number.isFinite(previous)) return { label: 'Línea base', detail: 'Aún no existe una medición anterior de esta prueba.', style: 'bg-slate-200 text-slate-700' }
  const rawDifference = current - previous
  const percent = previous === 0 ? null : (rawDifference / Math.abs(previous)) * 100
  const performanceChange = higherIsBetter ? rawDifference : -rawDifference
  const performancePercent = percent === null ? null : (higherIsBetter ? percent : -percent)
  const differenceText = `${rawDifference > 0 ? '+' : ''}${formatNumber(rawDifference)}${percent === null ? '' : ` (${percent > 0 ? '+' : ''}${formatNumber(percent)}%)`}`
  if (performancePercent !== null && Math.abs(performancePercent) <= 2) return { label: 'Estable', detail: `${differenceText} frente a la anterior. Variación dentro de ±2%.`, style: 'bg-sky-100 text-sky-800' }
  if (performanceChange > 0) return { label: performancePercent !== null && performancePercent >= 10 ? 'Mejora destacada' : 'Evolución favorable', detail: `${differenceText} frente a la anterior. El cambio va en la dirección esperada.`, style: 'bg-emerald-100 text-emerald-800' }
  if (performanceChange < 0) return { label: performancePercent !== null && performancePercent <= -10 ? 'Requiere revisión' : 'Variación desfavorable', detail: `${differenceText} frente a la anterior. Revisar fatiga, técnica y condiciones de aplicación.`, style: 'bg-amber-100 text-amber-900' }
  return { label: 'Sin cambio', detail: 'El resultado coincide con la medición anterior.', style: 'bg-slate-200 text-slate-700' }
}

function formatNumber(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1) }

function formatDate(value: string) { return new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: 'America/Bogota' }).format(new Date(`${value}T12:00:00`)) }

function EmptyCatalog() { return <div className="p-10 text-center"><p className="font-bold text-amber-700">No hay pruebas físicas activas.</p><Link href="/configuracion/catalogos-individuales" className="mt-3 inline-block font-black text-indigo-700 underline">Crear la primera prueba</Link></div> }

'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronDown, Copy, Eye, EyeOff, Link2, Loader2 } from 'lucide-react'

type Group = { id: string; nombre: string; nivel: string }
type Link = { id: string; grupo_id: string | null; token: string; activo: boolean }

export default function MacrocycleShareLinks() {
  const [groups, setGroups] = useState<Group[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const [loading, setLoading] = useState(true)
  const [available, setAvailable] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/enlaces-macrociclo', { signal: controller.signal })
      .then(async response => {
        if (response.status === 403) { setAvailable(false); return }
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'No se pudieron cargar los enlaces')
        setGroups(data.groups || [])
        setLinks(data.links || [])
      })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los enlaces') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  const create = async (grupoId: string | null) => {
    const key = grupoId || 'all'
    setBusy(key); setError('')
    try {
      const response = await fetch('/api/enlaces-macrociclo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grupoId }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo crear el enlace')
      setLinks(current => [...current.filter(link => link.grupo_id !== grupoId), data.link])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo crear el enlace') }
    finally { setBusy(null) }
  }

  const toggle = async (link: Link) => {
    setBusy(link.id); setError('')
    try {
      const response = await fetch('/api/enlaces-macrociclo', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: link.id, activo: !link.activo }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo cambiar la visibilidad')
      setLinks(current => current.map(item => item.id === link.id ? data.link : item))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cambiar la visibilidad') }
    finally { setBusy(null) }
  }

  const copy = async (link: Link) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/plan-compartido/${link.token}`)
      setCopied(link.id)
      window.setTimeout(() => setCopied(null), 2000)
    } catch { setError('No se pudo copiar el enlace. Abre la vista y copia la dirección del navegador.') }
  }

  if (!available) return null
  return <section className="mb-7 rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm sm:p-6 print:hidden">
    <button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-controls="macrocycle-share-links" className="flex w-full items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
      <span className="rounded-xl bg-indigo-100 p-2 text-indigo-700"><Link2 className="h-5 w-5"/></span>
      <span className="min-w-0 flex-1"><span className="block text-lg font-black text-slate-900">Enlaces de macrociclos</span><span className="mt-0.5 block text-sm text-slate-600">{loading ? 'Cargando enlaces...' : `${groups.length} equipos configurados · ${links.filter(link => link.activo).length} enlaces activos`}</span></span>
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-indigo-600"/> : <ChevronDown className={`h-5 w-5 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}/>}
    </button>
    {error ? <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p> : null}
    <div id="macrocycle-share-links" hidden={!expanded}>
    <p className="mt-4 text-sm text-slate-600">Comparte un calendario de solo lectura para todos los equipos o para un equipo específico. Desactiva el enlace para cerrar el acceso.</p>
    {!loading && groups.length === 0 && !error ? <p className="mt-4 text-sm text-slate-500">Configura al menos un macrociclo con fechas y días de entrenamiento para crear un enlace.</p> : null}
    {groups.length ? <div className="mt-4 space-y-3">
      {([{ id: null, nombre: 'Todos los equipos configurados', nivel: 'Enlace general' }, ...groups] as Array<{ id: string | null; nombre: string; nivel: string }>).map(group => {
        const link = links.find(item => item.grupo_id === group.id)
        return <div key={group.id || 'all'} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="min-w-0"><p className="font-bold text-slate-800">{group.nombre}</p><p className="text-xs text-slate-500">{group.nivel} · {link ? link.activo ? 'Visible con el enlace' : 'Oculto' : 'Sin enlace'}</p></div>
          <div className="flex flex-wrap gap-2">
            {!link ? <button type="button" disabled={busy !== null} onClick={() => create(group.id)} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{busy === (group.id || 'all') ? 'Creando...' : 'Crear enlace'}</button> : <>
              <button type="button" disabled={busy !== null} onClick={() => toggle(link)} className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 ${link.activo ? 'border border-amber-300 bg-amber-50 text-amber-900' : 'bg-emerald-600 text-white'}`}>
                {link.activo ? <EyeOff className="h-3.5 w-3.5"/> : <Eye className="h-3.5 w-3.5"/>}{link.activo ? 'Ocultar' : 'Activar'}
              </button>
              <button type="button" disabled={!link.activo} onClick={() => copy(link)} className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-40">{copied === link.id ? <Check className="h-3.5 w-3.5"/> : <Copy className="h-3.5 w-3.5"/>}{copied === link.id ? 'Copiado' : 'Copiar'}</button>
              {link.activo ? <a href={`/plan-compartido/${link.token}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-bold text-indigo-700">Vista previa</a> : null}
            </>}
          </div>
        </div>
      })}
    </div> : null}
    </div>
  </section>
}

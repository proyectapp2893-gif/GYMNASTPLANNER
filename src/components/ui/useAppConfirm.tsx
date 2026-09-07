'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Info, X } from 'lucide-react'

type Tone = 'danger' | 'warning' | 'info'
type Options = { title: string; description: string; confirmLabel?: string; cancelLabel?: string; tone?: Tone }
type Pending = Options & { resolve: (accepted: boolean) => void }

export function useAppConfirm() {
  const [pending, setPending] = useState<Pending | null>(null)

  const confirm = useCallback((options: Options) => new Promise<boolean>(resolve => {
    setPending({ ...options, resolve })
  }), [])

  const close = useCallback((accepted: boolean) => {
    setPending(current => {
      current?.resolve(accepted)
      return null
    })
  }, [])

  useEffect(() => {
    if (!pending) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') close(false) }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKeyDown) }
  }, [close, pending])

  const dialog = pending ? <AppConfirmDialog options={pending} onClose={close} /> : null
  return { confirm, dialog }
}

function AppConfirmDialog({ options, onClose }: { options: Options; onClose: (accepted: boolean) => void }) {
  const tone = options.tone || 'warning'
  const colors = tone === 'danger'
    ? { icon: 'bg-rose-100 text-rose-700', button: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-200' }
    : tone === 'info'
      ? { icon: 'bg-indigo-100 text-indigo-700', button: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-200' }
      : { icon: 'bg-amber-100 text-amber-700', button: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-200' }
  const Icon = tone === 'info' ? Info : AlertTriangle

  return <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" role="presentation">
    <button type="button" aria-label="Cerrar confirmación" onClick={() => onClose(false)} className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" />
    <section role="alertdialog" aria-modal="true" aria-labelledby="app-confirm-title" aria-describedby="app-confirm-description" className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${colors.icon}`}><Icon className="h-6 w-6" /></div>
          <button type="button" onClick={() => onClose(false)} aria-label="Cerrar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"><X className="h-5 w-5" /></button>
        </div>
        <h2 id="app-confirm-title" className="mt-5 text-xl font-black text-slate-900">{options.title}</h2>
        <p id="app-confirm-description" className="mt-2 text-sm leading-6 text-slate-600">{options.description}</p>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t bg-slate-50 p-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => onClose(false)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-100">{options.cancelLabel || 'Cancelar'}</button>
        <button type="button" autoFocus onClick={() => onClose(true)} className={`min-h-11 rounded-xl px-5 py-2.5 text-sm font-black text-white shadow-sm outline-none focus:ring-4 ${colors.button}`}>{options.confirmLabel || 'Confirmar'}</button>
      </div>
    </section>
  </div>
}

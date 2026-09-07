'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Error de aplicación', error)
  }, [error])

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 p-6">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/50">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-indigo-600">GymnastPlanner</p>
        <h1 className="mt-2 text-2xl font-black text-slate-900">No pudimos cargar este módulo</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Tus datos permanecen seguros. Intenta cargar la información nuevamente.
        </p>
        <button type="button" onClick={reset} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200">
          <RefreshCw className="h-4 w-4" /> Reintentar
        </button>
        {error.digest && <p className="mt-4 text-xs text-slate-400">Referencia: {error.digest}</p>}
      </section>
    </div>
  )
}

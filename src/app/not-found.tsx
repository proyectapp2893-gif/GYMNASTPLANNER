import Link from 'next/link'
import { ArrowLeft, SearchX } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 p-6">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/50">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><SearchX className="h-7 w-7" /></div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Error 404</p>
        <h1 className="mt-2 text-2xl font-black text-slate-900">Esta sección no está disponible</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">La dirección puede haber cambiado o el registro ya no pertenece a tu club.</p>
        <Link href="/inicio" className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"><ArrowLeft className="h-4 w-4" /> Volver al inicio</Link>
      </section>
    </div>
  )
}

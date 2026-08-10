import { Loader2, Users } from 'lucide-react'

export default function GymnastsLoading() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Seguimiento individual</p>
        <h1 className="mt-1 flex items-center gap-3 text-3xl font-black text-slate-900">
          <Users className="text-indigo-600" /> Gimnastas
        </h1>
        <div className="mt-12 flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-10 font-bold text-slate-600 shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          Cargando gimnastas…
        </div>
      </div>
    </div>
  )
}

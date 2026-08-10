import Link from 'next/link'
import { Search, UserRound, Users } from 'lucide-react'
import { getGymnastsPageData } from '../../lib/gymnasts/list-server'
import GymnastRegistrationForm from '../../components/gymnasts/GymnastRegistrationForm'
import GymnastExcelImport from '../../components/gymnasts/GymnastExcelImport'

export default async function GymnastsPage() {
  const { gymnasts, groups } = await getGymnastsPageData()
  return <div className="min-h-screen bg-slate-50 p-4 md:p-8">
    <header className="mx-auto mb-6 max-w-7xl">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Seguimiento individual</p>
      <h1 className="mt-1 flex items-center gap-3 text-3xl font-black text-slate-900"><Users className="text-indigo-600" /> Gimnastas</h1>
      <p className="mt-2 text-slate-500">Selecciona una gimnasta para revisar su planificación, progreso y restricciones.</p>
    </header>
    <main className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[340px_1fr]">
      <div><GymnastRegistrationForm groups={groups}/><GymnastExcelImport/></div>
      <div><div className="mb-5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"><Search className="h-4 w-4" /> {gymnasts.length} gimnastas activas</div>
      {gymnasts.length===0?<div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-14 text-center text-slate-700">Los grupos están listos. Registra la primera gimnasta desde el formulario.</div>:
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{gymnasts.map(gymnast=><Link key={gymnast.id} href={`/gimnastas/${gymnast.id}/resumen`} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md">
        <div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><UserRound /></div><div className="min-w-0"><h2 className="truncate font-black text-slate-800 group-hover:text-indigo-700">{gymnast.nombre}</h2><p className="text-sm text-slate-500">{gymnast.grupo?.nombre||'Sin grupo'} · {gymnast.grupo?.nivel||'Sin nivel'}</p><p className="mt-1 text-xs font-bold text-slate-400">{formatAge(gymnast.fecha_nacimiento)}</p></div></div>
      </Link>)}</div>}</div>
    </main>
  </div>
}

function formatAge(dateValue:string|null){if(!dateValue)return 'Edad no registrada';const birth=new Date(`${dateValue}T12:00:00`);const now=new Date();let age=now.getFullYear()-birth.getFullYear();if(now.getMonth()<birth.getMonth()||(now.getMonth()===birth.getMonth()&&now.getDate()<birth.getDate()))age-=1;return `${age} años`}

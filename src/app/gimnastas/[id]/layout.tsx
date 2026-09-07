import Link from 'next/link'
import { ArrowLeft, CalendarDays, LayoutDashboard, UserRound } from 'lucide-react'
import GymnastTabs from '../../../components/gymnasts/GymnastTabs'
import { getGymnastProfile } from '../../../lib/gymnasts/server'

export default async function GymnastLayout({children,params}:{children:React.ReactNode;params:Promise<{id:string}>}){
  const {id}=await params
  const gymnast=await getGymnastProfile(id)
  return <div className="min-h-screen bg-slate-50">
    <header className="bg-slate-950 px-4 py-5 text-white md:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><Link href="/gimnastas" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Gimnastas</Link><Link href="/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:border-indigo-400 hover:text-white"><LayoutDashboard className="h-4 w-4"/> Consultar plan general anual</Link></div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300"><UserRound className="h-8 w-8" /></div>
        <div><p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-300">Módulo individual</p><h1 className="text-2xl font-black">{gymnast.nombre}</h1><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-300"><span>{gymnast.grupo?.nivel||'Nivel pendiente'}</span><span>{gymnast.grupo?.nombre||'Sin grupo'}</span>{gymnast.fecha_ingreso&&<span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Ingreso {formatDate(gymnast.fecha_ingreso)}</span>}</div></div>
      </div>
    </header>
    <GymnastTabs gymnastId={id}/>
    <div className="p-4 md:p-8">{children}</div>
  </div>
}

function formatDate(value:string){return new Intl.DateTimeFormat('es-CO',{dateStyle:'medium',timeZone:'America/Bogota'}).format(new Date(`${value}T12:00:00`))}

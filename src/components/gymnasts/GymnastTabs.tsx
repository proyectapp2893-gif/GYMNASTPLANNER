'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  ['resumen','Resumen'], ['planificacion','Planificación'], ['sesiones','Sesiones'],
  ['tecnica','Técnica'], ['preparacion-fisica','Preparación física'], ['evaluaciones','Evaluaciones'],
  ['objetivos','Objetivos'], ['cargas','Cargas'], ['evidencias','Evidencias'],
  ['restricciones','Restricciones'], ['competencias','Competencias'], ['informes','Informes'], ['asistente-ia','Asistente IA'],
] as const

export default function GymnastTabs({ gymnastId }: { gymnastId: string }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Secciones de la gimnasta" className="overflow-x-auto border-b border-slate-200 bg-white">
      <div className="flex min-w-max px-4 md:px-8">
        {tabs.map(([slug,label]) => {
          const href=`/gimnastas/${gymnastId}/${slug}`
          const active=pathname===href
          return <Link key={slug} href={href} className={`border-b-2 px-3 py-3 text-sm font-bold ${active?'border-indigo-600 text-indigo-700':'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}</Link>
        })}
      </div>
    </nav>
  )
}

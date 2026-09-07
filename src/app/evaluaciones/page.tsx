import { ClipboardList } from 'lucide-react'
import UnifiedPhysicalTestModule from '../../components/physical-tests/UnifiedPhysicalTestModule'

export default function PhysicalTestsPage() {
  return <div className="mx-auto min-h-screen max-w-[1600px] p-4 font-sans md:p-8">
    <header className="mb-7">
      <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-800 sm:text-3xl">
        <ClipboardList className="h-8 w-8 shrink-0 text-emerald-500" />
        Control de Preparación Física
      </h1>
      <p className="mt-2 text-slate-500">Un solo catálogo y los mismos criterios para el registro colectivo, individual y el historial.</p>
    </header>
    <UnifiedPhysicalTestModule />
  </div>
}

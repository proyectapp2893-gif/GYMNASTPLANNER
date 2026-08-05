import { ClipboardList } from 'lucide-react'

export default function ModuleEmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-14 text-center">
    <ClipboardList className="mx-auto mb-3 h-10 w-10 text-slate-300" />
    <h2 className="font-black text-slate-700">{title}</h2>
    <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">{description}</p>
  </div>
}

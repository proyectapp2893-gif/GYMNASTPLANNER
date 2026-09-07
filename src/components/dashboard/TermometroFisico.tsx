import { TrendingUp, Activity, CheckCircle2 } from 'lucide-react';
import type { TeamPhysicalMetric } from '../../lib/team-physical-summary';

// 1. Le decimos a TypeScript qué datos esperar desde page.tsx
interface TermometroProps {
  metricas: TeamPhysicalMetric[];
}

export default function TermometroFisicoCard({ metricas }: TermometroProps) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col h-full">
      
      {/* Cabecera de la Tarjeta */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
          Termómetro Físico
        </h3>
        <div className="bg-rose-50 p-1.5 rounded-lg">
          <TrendingUp className="w-4 h-4 text-rose-500" />
        </div>
      </div>
      
      <p className="text-[11px] text-slate-500 mb-6 font-medium leading-relaxed">
        Promedios del equipo basados en la evaluación más reciente de cada gimnasta.
      </p>

      {/* Lista de Métricas con Datos Reales */}
      <div className="space-y-3 mb-6 flex-1">
        {metricas.map((metrica) => (
          <div key={metrica.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100/50">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-400" />
              <div>
                <span className="block text-sm font-bold text-slate-700">{metrica.nombre}</span>
                <span className="block text-[9px] font-bold text-slate-400">{metrica.atletas} gimnastas</span>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-black text-rose-600">{metrica.promedio}</span>
              <span className="text-[10px] font-bold text-slate-400">{metrica.unidad === 'repeticiones' ? 'reps' : metrica.unidad}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ALERTA INTELIGENTE: Foco de la Semana */}
      {metricas.length > 0 ? (
        <div className="bg-emerald-50 border border-emerald-200/60 rounded-xl p-4 mt-auto">
          <div className="flex items-start gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-1">
                Base física disponible
              </h4>
              <p className="text-[11px] font-medium text-emerald-700/80 leading-snug">
                Cada promedio usa el último registro disponible y evita duplicar evaluaciones de una misma gimnasta.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 mt-auto text-center">
             <p className="text-xs font-medium text-slate-500">Registra test físicos para ver recomendaciones.</p>
        </div>
      )}

    </div>
  );
}

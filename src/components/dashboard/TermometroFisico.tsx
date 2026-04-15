import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

// 1. Le decimos a TypeScript qué datos esperar desde page.tsx
interface TermometroProps {
  dominadasActual: number;
  lagartijasActual: number;
}

// 2. NUEVO: Le enseñamos a TypeScript la estructura exacta de nuestros ejercicios
// Agregamos porcentajeActual como opcional (?) para que no marque error
interface MetricaFisica {
  id: string;
  nombre: string;
  actual: number;
  meta: number;
  unidad: string;
  porcentajeActual?: number; 
}

export default function TermometroFisicoCard({ dominadasActual, lagartijasActual }: TermometroProps) {
  
  // Usamos la interfaz MetricaFisica[] aquí
  const metricasFisicas: MetricaFisica[] = [
    { id: '1', nombre: 'Dominadas', actual: dominadasActual || 0, meta: 15, unidad: 'reps' },
    { id: '2', nombre: 'Lagartijas', actual: lagartijasActual || 0, meta: 25, unidad: 'reps' },
  ];

  const analizarDebilidad = () => {
    if (dominadasActual === 0 && lagartijasActual === 0) {
      return null; 
    }

    let areaMasDebil: MetricaFisica = metricasFisicas[0];
    let porcentajeMinimo = 100;

    metricasFisicas.forEach(metrica => {
      if(metrica.meta === 0) return; 

      const porcentaje = (metrica.actual / metrica.meta) * 100;
      if (porcentaje < porcentajeMinimo) {
        porcentajeMinimo = Math.round(porcentaje);
        areaMasDebil = { ...metrica, porcentajeActual: porcentajeMinimo };
      }
    });

    return { ...areaMasDebil, porcentajeActual: Math.round((areaMasDebil.actual / areaMasDebil.meta) * 100) };
  };

  const focoSemana = analizarDebilidad();

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
        Promedio de fuerza del equipo basado en las últimas evaluaciones.
      </p>

      {/* Lista de Métricas con Datos Reales */}
      <div className="space-y-3 mb-6 flex-1">
        {metricasFisicas.map((metrica) => (
          <div key={metrica.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100/50">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-700">{metrica.nombre}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-black text-rose-600">{metrica.actual || '--'}</span>
              <span className="text-[10px] font-bold text-slate-400">{metrica.unidad}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ALERTA INTELIGENTE: Foco de la Semana */}
      {focoSemana ? (
        <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4 mt-auto">
          <div className="flex items-start gap-3">
            <div className="bg-amber-100 p-2 rounded-lg shrink-0">
              <TrendingDown className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider mb-1">
                Foco de la Semana
              </h4>
              <p className="text-sm font-bold text-amber-900 mb-0.5">
                {focoSemana.nombre} ({focoSemana.porcentajeActual}% de la meta)
              </p>
              <p className="text-[11px] font-medium text-amber-700/80 leading-snug">
                Es el área con menor rendimiento. Se sugiere incluir acondicionamiento extra de {focoSemana.nombre.toLowerCase()}.
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
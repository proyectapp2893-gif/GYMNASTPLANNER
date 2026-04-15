"use client"

import { useState } from 'react';
import { Sparkles, Loader2, X, BrainCircuit, Target, Hash } from 'lucide-react';

export default function BotonGenerarIA() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tema, setTema] = useState('');
  const [cantidad, setCantidad] = useState(5);
  const [cargando, setCargando] = useState(false);

  const fabricarConIA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tema.trim()) return;
    
    setCargando(true);

    try {
      // 🔥 AQUÍ ESTÁ LA MAGIA: La ruta exacta de tu servidor
      const response = await fetch('/api/ia/generar-ejercicios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tema, cantidad })
      });

      // 🔥 LECTURA DEL ERROR REAL 🔥
      // Leemos la respuesta del servidor PRIMERO, antes de lanzar el error
      const data = await response.json().catch(() => ({ error: 'Error de red o ruta no encontrada (404)' }));
      
      if (!response.ok) {
        console.error("🔥 Error desde el backend:", data);
        throw new Error(data.error || 'Error desconocido en el servidor');
      }

      if (data.success) {
        setModalAbierto(false);
        setTema('');
        window.location.reload(); 
      } else {
        throw new Error("La API no devolvió el estado de éxito.");
      }

    } catch (error: any) {
      console.error("Error completo:", error);
      // Ahora la alerta nos dirá EXACTAMENTE qué falló
      alert(`Ocurrió un error: ${error.message}\n\nRevisa la consola (F12) para más detalles.`);
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setModalAbierto(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl font-black transition-colors shadow-lg shadow-emerald-500/20"
      >
        <Sparkles className="w-5 h-5" /> Fabricar con IA
      </button>

      {modalAbierto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-700 flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-5 border-b border-slate-700 bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-black text-white">Generador IA</h2>
              </div>
              <button onClick={() => setModalAbierto(false)} className="text-slate-400 hover:text-rose-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={fabricarConIA} className="p-6 flex flex-col gap-5">
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Dile a la Inteligencia Artificial qué tipo de ejercicios necesitas para tu colección premium.
              </p>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Target className="w-3 h-3" /> Tema o Enfoque
                </label>
                <input 
                  autoFocus
                  required 
                  type="text" 
                  value={tema} 
                  onChange={e => setTema(e.target.value)} 
                  placeholder="Ej: Calentamiento general, Roll Adelante, Viga..." 
                  className="w-full p-3 bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold placeholder:text-slate-600" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Hash className="w-3 h-3" /> Cantidad a generar
                </label>
                <div className="flex gap-3">
                  {[5, 10, 15].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCantidad(num)}
                      className={`flex-1 py-2 rounded-lg font-black text-sm transition-colors border ${
                        cantidad === num 
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={cargando} 
                className={`mt-2 w-full py-3 rounded-xl font-black transition-colors flex justify-center items-center gap-2 ${
                  cargando ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-500/20'
                }`}
              >
                {cargando ? <><Loader2 className="w-5 h-5 animate-spin" /> Creando magia...</> : <><Sparkles className="w-5 h-5" /> Generar {cantidad} Tarjetas</>}
              </button>
            </form>

          </div>
        </div>
      )}
    </>
  );
}
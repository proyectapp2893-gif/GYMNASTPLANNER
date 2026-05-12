"use client"

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useClubStore } from '../../../store/useClubStore'
import { CheckCircle2, Loader2, UploadCloud } from 'lucide-react'
import { normalizeExerciseInput } from '../../lib/exercise-normalization'

// 🔥 PEGA AQUÍ TODO EL JSON QUE TE PASÉ (Los 70+ ejercicios)
const CARTAS_JSON = [
  {
    "nombre": "Elevaciones de Piernas en Arco",
    "categoria": "Prep. Física - Tarjeta Naranja",
    "dificultad": "Niveles 1-3",
    "rangos_repeticiones": "10-20-30 reps",
    "descripcion_corta": "Acuéstate boca abajo en el suelo, levanta las piernas y los pies manteniendo el tronco plano en el suelo.",
    "aparato": "Suelo"
  }
  // ... Pega el resto de los ejercicios aquí ...
]

export default function ImportadorCartas() {
  const { clubId } = useClubStore()
  const [cargando, setCargando] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [terminado, setTerminado] = useState(false)

  const iniciarImportacion = async () => {
    if (!clubId) return
    setCargando(true)
    
    // Subimos los ejercicios uno por uno para ver el progreso
    for (let i = 0; i < CARTAS_JSON.length; i++) {
      const ejercicio = CARTAS_JSON[i]
      
      const { error } = await supabase.from('ejercicios').insert([normalizeExerciseInput(ejercicio, clubId)])

      if (error) {
        console.error("Error al subir:", ejercicio.nombre, error)
      } else {
        setProgreso(i + 1)
      }
    }
    
    setCargando(false)
    setTerminado(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-200">
        <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <UploadCloud className="w-10 h-10 text-indigo-500" />
        </div>
        
        <h1 className="text-2xl font-black text-slate-800 mb-2">Importador de Cartas</h1>
        <p className="text-slate-500 mb-8 font-medium">Hay {CARTAS_JSON.length} ejercicios listos para subir a Supabase.</p>

        {terminado ? (
          <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl font-bold flex items-center justify-center gap-2 animate-in zoom-in">
            <CheckCircle2 className="w-6 h-6" /> ¡Importación Completada!
          </div>
        ) : (
          <button 
            onClick={iniciarImportacion} 
            disabled={cargando}
            className={`w-full py-4 rounded-xl font-black text-white flex items-center justify-center gap-2 transition-all ${cargando ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-1'}`}
          >
            {cargando ? (
              <><Loader2 className="w-6 h-6 animate-spin" /> Subiendo... {progreso} / {CARTAS_JSON.length}</>
            ) : (
              "Iniciar Inyección a Base de Datos"
            )}
          </button>
        )}
      </div>
    </div>
  )
}

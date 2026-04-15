"use client" 

import { useState, useEffect } from 'react' 
import { supabase } from '../../lib/supabase'
import { useClubStore } from '../../../store/useClubStore' 
import { Plus, Search, Filter, Dumbbell, Loader2, X, Save } from 'lucide-react' 
import BotonGenerarIA from '../../components/ejercicios/BotonGenerarIA'
import TarjetaEjercicio from '../../components/ejercicios/TarjetaEjercicio'

export default function Ejercicios() {
  const { clubId } = useClubStore() 
  
  const [ejercicios, setEjercicios] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)

  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  
  // 🔥 Ajustamos los valores por defecto para que coincidan con las listas
  const [nuevoEj, setNuevoEj] = useState({
    nombre: '', categoria: 'Técnico', dificultad: 'Básico', aparato: 'Suelo', descripcion_corta: '', rangos_repeticiones: '10-20 reps'
  })

  const cargarEjercicios = async () => {
    if (!clubId) return;
    setCargando(true)

    const { data: clubData } = await supabase
      .from('clubs')
      .select('acceso_biblioteca_elite')
      .eq('id', clubId)
      .single()

    const tieneAccesoElite = clubData?.acceso_biblioteca_elite || false;

    let query = supabase.from('ejercicios').select('*').order('created_at', { ascending: false })

    if (tieneAccesoElite) {
      query = query.or(`club_id.eq.${clubId},club_id.is.null`)
    } else {
      query = query.eq('club_id', clubId)
    }

    const { data, error } = await query

    if (error) console.error('Error cargando ejercicios:', error)
    setEjercicios(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargarEjercicios()
  }, [clubId]) 

  const ejerciciosFiltrados = ejercicios.filter(ej => {
    const termino = busqueda.toLowerCase()
    return (
      ej.nombre?.toLowerCase().includes(termino) || 
      ej.categoria?.toLowerCase().includes(termino) ||
      ej.aparato?.toLowerCase().includes(termino)
    )
  })

  const guardarNuevoEjercicio = async () => {
    if (!nuevoEj.nombre) return alert("El nombre es obligatorio")
    setGuardando(true)
    
    const ejercicioAGuardar = {
      ...nuevoEj,
      club_id: clubId 
    }

    const { error } = await supabase.from('ejercicios').insert([ejercicioAGuardar])
    
    if (!error) {
      setModalAbierto(false)
      setNuevoEj({ nombre: '', categoria: 'Técnico', dificultad: 'Básico', aparato: 'Suelo', descripcion_corta: '', rangos_repeticiones: '10-20 reps' })
      cargarEjercicios() 
    } else {
      console.error(error)
      alert("Error al guardar el ejercicio")
    }
    setGuardando(false)
  }

  return (
    <div className="p-2 font-sans relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-rose-400 to-rose-600 text-white rounded-xl shadow-sm">
            <Dumbbell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Biblioteca de Ejercicios</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Tu repertorio visual y técnico ({ejercicios.length} total)</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <BotonGenerarIA />
          <button 
            onClick={() => setModalAbierto(true)}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nuevo Manual
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-4 top-3 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar flic flac, spagat, Tarjeta Naranja..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none text-sm text-slate-800 placeholder-slate-400 shadow-sm transition-shadow font-medium bg-white"
          />
        </div>
        <button className="px-5 py-3 border border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-700 flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
          <Filter className="w-4 h-4" /> Filtros
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cargando ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando biblioteca...</p>
          </div>
        ) : (
          <>
            {ejerciciosFiltrados.map((ej) => (
              <TarjetaEjercicio key={ej.id} ejercicio={ej} />
            ))}

            {ejerciciosFiltrados.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
                <div className="inline-block p-4 bg-slate-50 rounded-full mb-4">
                  <Search className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">No se encontraron ejercicios</h3>
                <p className="text-slate-500">Intenta buscar con otros términos o crea uno nuevo.</p>
              </div>
            )}
          </>
        )}
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800">Nuevo Ejercicio Manual</h2>
              <button onClick={() => setModalAbierto(false)} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-rose-100 hover:text-rose-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Nombre del Ejercicio</label>
                <input type="text" value={nuevoEj.nombre} onChange={e => setNuevoEj({...nuevoEj, nombre: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-800 placeholder-slate-300" placeholder="Ej. Doble Mortal Atrás..." />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* 🔥 SELECT DE CATEGORÍA */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Categoría</label>
                  <select value={nuevoEj.categoria} onChange={e => setNuevoEj({...nuevoEj, categoria: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-800 cursor-pointer">
                    <option value="Técnico">Técnico</option>
                    <option value="Prep. Física - General">Prep. Física - General</option>
                    <option value="Prep. Física - Tarjeta Azul">Prep. Física - Tarjeta Azul</option>
                    <option value="Prep. Física - Tarjeta Roja">Prep. Física - Tarjeta Roja</option>
                    <option value="Flexibilidad">Flexibilidad</option>
                    <option value="Calentamiento">Calentamiento</option>
                    <option value="Calma / Cierre">Calma / Cierre</option>
                  </select>
                </div>

                {/* 🔥 SELECT DE APARATO */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Aparato</label>
                  <select value={nuevoEj.aparato} onChange={e => setNuevoEj({...nuevoEj, aparato: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-800 cursor-pointer">
                    <option value="Suelo">Suelo</option>
                    <option value="Salto">Salto</option>
                    <option value="Barras Asimétricas">Barras Asimétricas</option>
                    <option value="Viga de Equilibrio">Viga de Equilibrio</option>
                    <option value="Barra Fija">Barra Fija</option>
                    <option value="Anillas">Anillas</option>
                    <option value="Caballo con Arzones">Caballo con Arzones</option>
                    <option value="Barras Paralelas">Barras Paralelas</option>
                    <option value="Trampolín / Tumbling">Trampolín / Tumbling</option>
                    <option value="General / Ninguno">General / Ninguno</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* 🔥 SELECT DE DIFICULTAD */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Dificultad / Nivel</label>
                  <select value={nuevoEj.dificultad} onChange={e => setNuevoEj({...nuevoEj, dificultad: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-800 cursor-pointer">
                    <option value="Básico">Básico</option>
                    <option value="Intermedio">Intermedio</option>
                    <option value="Avanzado">Avanzado</option>
                    <option value="Élite">Élite</option>
                    <option value="Niveles 1-3">Niveles 1-3 (USAG)</option>
                    <option value="Niveles 4-6">Niveles 4-6 (USAG)</option>
                    <option value="Niveles 7-9">Niveles 7-9 (USAG)</option>
                    <option value="Nivel 10">Nivel 10 (USAG)</option>
                  </select>
                </div>

                {/* 🔥 SELECT DE RANGOS */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Rango Sugerido</label>
                  <select value={nuevoEj.rangos_repeticiones} onChange={e => setNuevoEj({...nuevoEj, rangos_repeticiones: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-800 cursor-pointer">
                    <option value="5-10 reps">5-10 reps</option>
                    <option value="10-20 reps">10-20 reps</option>
                    <option value="20-30 reps">20-30 reps</option>
                    <option value="Al fallo">Al fallo</option>
                    <option value="10-30 seg">10-30 seg</option>
                    <option value="30-60 seg">30-60 seg</option>
                    <option value="1-2 min">1-2 min</option>
                    <option value="Personalizado">Personalizado (Detallar desc.)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Descripción Corta</label>
                <textarea rows={3} value={nuevoEj.descripcion_corta} onChange={e => setNuevoEj({...nuevoEj, descripcion_corta: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-800 placeholder-slate-300 resize-none" placeholder="Explica la técnica o ejecución..."></textarea>
              </div>
            </div>

            <button onClick={guardarNuevoEjercicio} disabled={guardando} className="w-full mt-6 bg-slate-900 text-white font-black py-4 rounded-xl flex justify-center items-center gap-2 hover:bg-slate-800 transition-colors">
              {guardando ? <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</> : <><Save className="w-5 h-5" /> Guardar en Biblioteca</>}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
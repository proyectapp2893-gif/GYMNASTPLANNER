"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useClubStore } from '../../../store/useClubStore' // 🔥 NUEVO: Importamos nuestra memoria central
import { ClipboardList, Filter, Save, Activity, Loader2, CheckCircle2, XCircle, History, PlusCircle, Calendar, TrendingUp, Trash2 } from 'lucide-react'
import { analyzePhysicalTest, type RawPhysicalTestResults } from '../../lib/physical-tests'
import type { Atleta, EvaluacionFisica, Grupo } from '../../lib/types'

const RESULTADOS_INICIALES: RawPhysicalTestResults = {
  dominadas: '', lagartijas: '', soga: '', 
  piernas_flexionadas: '', piernas_extendidas: '', postura_ahuecada: '',
  carrera_18m: '', vela_salto: '', split: '', hombros: '', arco: ''
}

const valorFormulario = (valor: RawPhysicalTestResults[string]) => valor ?? ''

export default function TestFisicos() {
  const { clubId } = useClubStore() // 🔥 NUEVO: Extraemos el ID del club activo

  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [grupoSeleccionado, setGrupoSeleccionado] = useState('')
  const [atletas, setAtletas] = useState<Atleta[]>([])
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [fechaTest, setFechaTest] = useState(new Date().toISOString().split('T')[0])
  const [atletaSeleccionada, setAtletaSeleccionada] = useState<Atleta | null>(null)
  
  const [historial, setHistorial] = useState<EvaluacionFisica[]>([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [vistaActiva, setVistaActiva] = useState<'nueva' | 'historial'>('nueva')
  const [notificacion, setNotificacion] = useState({ mostrar: false, mensaje: '', tipo: '' })
  
  const [resultados, setResultados] = useState<RawPhysicalTestResults>(RESULTADOS_INICIALES)

  useEffect(() => {
    // 🔥 NUEVO: Solo cargamos datos si ya tenemos el clubId
    if (!clubId) return;

    const cargarGrupos = async () => {
      // 🔥 NUEVO: Filtramos grupos por club_id
      const { data } = await supabase.from('grupos').select('*').eq('club_id', clubId)
      if (data) setGrupos(data as Grupo[])
    }
    cargarGrupos()
  }, [clubId]) // 🔥 NUEVO: Dependencia actualizada

  useEffect(() => {
    if (!grupoSeleccionado || !clubId) return
    const cargarAtletas = async () => {
      setCargando(true)
      // Nota: Como los grupos ya están filtrados por clubId, 
      // los atletas de ese grupo pertenecen implícitamente a ese club.
      const { data } = await supabase.from('atletas').select('*').eq('grupo_id', grupoSeleccionado).eq('club_id', clubId).order('nombre')
      setAtletas((data || []) as Atleta[])
      setAtletaSeleccionada(null)
      setCargando(false)
    }
    cargarAtletas()
  }, [clubId, grupoSeleccionado])

  const cargarHistorial = useCallback(async (atletaId: string) => {
    if (!clubId) return
    setCargandoHistorial(true)
    const { data } = await supabase
      .from('evaluaciones_fisicas')
      .select('*')
      .eq('atleta_id', atletaId)
      .eq('club_id', clubId)
      .order('fecha', { ascending: false })
    
    setHistorial((data || []) as EvaluacionFisica[])
    setCargandoHistorial(false)
  }, [clubId])

  useEffect(() => {
    if (atletaSeleccionada) {
      void cargarHistorial(atletaSeleccionada.id)
      setVistaActiva('nueva')
    }
  }, [atletaSeleccionada, cargarHistorial])

  const mostrarNotificacion = (mensaje: string, tipo: 'exito' | 'error') => {
    setNotificacion({ mostrar: true, mensaje, tipo })
    setTimeout(() => setNotificacion({ mostrar: false, mensaje: '', tipo: '' }), 3500)
  }

  const manejarCambio = (campo: keyof RawPhysicalTestResults, valor: string) => {
    setResultados(prev => ({ ...prev, [campo]: valor }))
  }

  const guardarTest = async () => {
    if (!atletaSeleccionada) return mostrarNotificacion("Selecciona una atleta", 'error')
    if (!clubId) return mostrarNotificacion("Error: No se ha detectado el club activo", 'error') // 🔥 NUEVO

    setGuardando(true)
    try {
      const analisis = analyzePhysicalTest(resultados)
      const resultadosNormalizados = {
        ...resultados,
        analisis,
      }
      // 🔥 NUEVO: Agregamos club_id al registro de la evaluación
      const { error } = await supabase.from('evaluaciones_fisicas').insert([{
        atleta_id: atletaSeleccionada.id,
        fecha: fechaTest,
        resultados: resultadosNormalizados,
        club_id: clubId 
      }])
      if (error) throw error
      
      mostrarNotificacion('¡Resultados guardados en el historial!', 'exito')
      setResultados(RESULTADOS_INICIALES)
      
      await cargarHistorial(atletaSeleccionada.id)
      setVistaActiva('historial')

    } catch (error) {
      console.error(error)
      mostrarNotificacion("Hubo un error al guardar", 'error')
    } finally {
      setGuardando(false)
    }
  }

  // 🔥 NUEVO: Función para eliminar un test
  const eliminarTest = async (testId: string) => {
    if (!confirm('¿Estás seguro de eliminar este test? Se borrará permanentemente de la base de datos.')) return
    
    try {
      const { error } = await supabase.from('evaluaciones_fisicas').delete().eq('id', testId).eq('club_id', clubId)
      if (error) throw error
      
      mostrarNotificacion('Evaluación eliminada correctamente', 'exito')
      
      // Recargamos el historial para que desaparezca visualmente
      if (atletaSeleccionada) {
        void cargarHistorial(atletaSeleccionada.id)
      }
    } catch (error) {
      console.error(error)
      mostrarNotificacion("Error al eliminar la evaluación", 'error')
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans relative">
      
      {notificacion.mostrar && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-50 ${notificacion.tipo === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {notificacion.tipo === 'error' ? <XCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          <span className="font-bold">{notificacion.mensaje}</span>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <ClipboardList className="w-8 h-8 text-emerald-500" /> Control de Preparación Física
        </h1>
        <p className="text-slate-500 mt-2 font-medium">Batería de pruebas para medir fuerza, potencia y flexibilidad.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PANEL IZQUIERDO */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
          <div className="mb-6 border-b border-slate-100 pb-6">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2"><Filter className="w-4 h-4" /> Filtrar por Grupo</label>
            <select value={grupoSeleccionado} onChange={(e) => setGrupoSeleccionado(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700 cursor-pointer">
              <option value="" disabled>Selecciona un grupo...</option>
              {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre} ({g.nivel})</option>)}
            </select>
          </div>

          <h3 className="font-bold text-slate-800 mb-4">Seleccionar Atleta</h3>
          {cargando ? (
            <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : atletas.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Selecciona un grupo con atletas registradas.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-2">
              {atletas.map(a => (
                <button 
                  key={a.id} 
                  onClick={() => setAtletaSeleccionada(a)}
                  className={`text-left p-3 rounded-xl text-sm font-bold transition-all border ${atletaSeleccionada?.id === a.id ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'}`}
                >
                  {a.nombre}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* PANEL DERECHO */}
        <div className="lg:col-span-2">
          {atletaSeleccionada ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
              
              <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-800">{atletaSeleccionada.nombre}</h2>
                  <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-wider">Módulo de Evaluación Continua</p>
                </div>
              </div>

              <div className="flex gap-1 px-6 md:px-8 pt-6 border-b border-slate-200">
                <button 
                  onClick={() => setVistaActiva('nueva')} 
                  className={`flex items-center gap-2 pb-3 px-4 font-bold text-sm border-b-2 transition-colors ${vistaActiva === 'nueva' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  <PlusCircle className="w-4 h-4" /> Registrar Nuevo Test
                </button>
                <button 
                  onClick={() => setVistaActiva('historial')} 
                  className={`flex items-center gap-2 pb-3 px-4 font-bold text-sm border-b-2 transition-colors ${vistaActiva === 'historial' ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  <History className="w-4 h-4" /> Historial de Evolución ({historial.length})
                </button>
              </div>

              {vistaActiva === 'nueva' && (
                <div className="p-6 md:p-8 animate-in fade-in duration-300">
                  <div className="flex justify-end mb-6">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-500">Fecha:</label>
                      <input type="date" value={fechaTest} onChange={(e) => setFechaTest(e.target.value)} className="bg-transparent font-bold text-slate-700 outline-none text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h3 className="font-bold text-indigo-700 text-sm uppercase tracking-wider flex items-center gap-2"><Activity className="w-4 h-4"/> Fuerza de Brazos</h3>
                      <div><label className="text-xs font-bold text-slate-600 block mb-1">Dominadas (Reps)</label><input type="number" value={valorFormulario(resultados.dominadas)} onChange={(e)=>manejarCambio('dominadas', e.target.value)} className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none" /></div>
                      <div><label className="text-xs font-bold text-slate-600 block mb-1">Lagartijas (Reps)</label><input type="number" value={valorFormulario(resultados.lagartijas)} onChange={(e)=>manejarCambio('lagartijas', e.target.value)} className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none" /></div>
                      <div><label className="text-xs font-bold text-slate-600 block mb-1">Subir Soga (Metros)</label><input type="number" value={valorFormulario(resultados.soga)} onChange={(e)=>manejarCambio('soga', e.target.value)} className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none" /></div>
                    </div>

                    <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h3 className="font-bold text-rose-700 text-sm uppercase tracking-wider flex items-center gap-2"><Activity className="w-4 h-4"/> Fuerza de Abdomen</h3>
                      <div><label className="text-xs font-bold text-slate-600 block mb-1">Piernas Flexionadas (Tiempo)</label><input type="text" placeholder="Ej. 30s" value={valorFormulario(resultados.piernas_flexionadas)} onChange={(e)=>manejarCambio('piernas_flexionadas', e.target.value)} className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none" /></div>
                      <div><label className="text-xs font-bold text-slate-600 block mb-1">Piernas Extendidas (Reps)</label><input type="number" value={valorFormulario(resultados.piernas_extendidas)} onChange={(e)=>manejarCambio('piernas_extendidas', e.target.value)} className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none" /></div>
                      <div><label className="text-xs font-bold text-slate-600 block mb-1">Postura Ahuecada / Canoa (Tiempo)</label><input type="text" placeholder="Ej. 1m 20s" value={valorFormulario(resultados.postura_ahuecada)} onChange={(e)=>manejarCambio('postura_ahuecada', e.target.value)} className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none" /></div>
                    </div>

                    <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h3 className="font-bold text-amber-700 text-sm uppercase tracking-wider flex items-center gap-2"><Activity className="w-4 h-4"/> Fuerza de Piernas</h3>
                      <div><label className="text-xs font-bold text-slate-600 block mb-1">Carrera 18.6 mts (Tiempo)</label><input type="text" placeholder="Ej. 4.2s" value={valorFormulario(resultados.carrera_18m)} onChange={(e)=>manejarCambio('carrera_18m', e.target.value)} className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none" /></div>
                      <div><label className="text-xs font-bold text-slate-600 block mb-1">Vela Salto Extendido (Reps)</label><input type="number" value={valorFormulario(resultados.vela_salto)} onChange={(e)=>manejarCambio('vela_salto', e.target.value)} className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none" /></div>
                    </div>

                    <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h3 className="font-bold text-sky-700 text-sm uppercase tracking-wider flex items-center gap-2"><Activity className="w-4 h-4"/> Flexibilidad (cm / grados)</h3>
                      <div><label className="text-xs font-bold text-slate-600 block mb-1">Split (cm faltantes)</label><input type="number" value={valorFormulario(resultados.split)} onChange={(e)=>manejarCambio('split', e.target.value)} className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none" /></div>
                      <div><label className="text-xs font-bold text-slate-600 block mb-1">Hombros (cm)</label><input type="number" value={valorFormulario(resultados.hombros)} onChange={(e)=>manejarCambio('hombros', e.target.value)} className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none" /></div>
                      <div><label className="text-xs font-bold text-slate-600 block mb-1">Arco (cm / grados)</label><input type="number" value={valorFormulario(resultados.arco)} onChange={(e)=>manejarCambio('arco', e.target.value)} className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none" /></div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end pt-6 border-t border-slate-100">
                    <button onClick={guardarTest} disabled={guardando} className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all ${guardando ? 'bg-slate-400 text-white cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg hover:-translate-y-0.5'}`}>
                      {guardando ? <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</> : <><Save className="w-5 h-5" /> Guardar Evaluación</>}
                    </button>
                  </div>
                </div>
              )}

              {vistaActiva === 'historial' && (
                <div className="p-6 md:p-8 bg-slate-50 min-h-[400px] animate-in fade-in duration-300">
                  {cargandoHistorial ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
                  ) : historial.length === 0 ? (
                    <div className="text-center py-20">
                      <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-slate-700">Sin Evaluaciones Previas</h3>
                      <p className="text-slate-500 text-sm mt-1">Registra el primer test de esta atleta para ver su evolución.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6">
                      {historial.map((test) => (
                        <div key={test.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group">
                          
                          {/* ENCABEZADO CON BOTÓN DE ELIMINAR */}
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-5 h-5 text-indigo-500" />
                              <h4 className="font-bold text-slate-800 text-lg">
                                Test del {new Date(test.fecha || fechaTest).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </h4>
                            </div>
                            <button 
                              onClick={() => eliminarTest(test.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 text-sm font-bold"
                              title="Eliminar este test"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {Object.entries(test.resultados || {}).filter(([llave]) => llave !== 'analisis').map(([llave, valor]) => {
                              const tituloLimpio = llave.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                              return valor ? (
                                <div key={llave} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">{tituloLimpio}</span>
                                  <span className="block font-black text-slate-700 text-sm">{String(valor)}</span>
                                </div>
                              ) : null
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl shadow-sm border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center h-full min-h-[500px]">
              <div className="bg-slate-50 p-4 rounded-full mb-4"><ClipboardList className="w-12 h-12 text-slate-300" /></div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">Panel de Evaluación</h3>
              <p className="text-slate-500 max-w-md">Selecciona una atleta del panel izquierdo para comenzar a registrar o visualizar sus métricas de evolución.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

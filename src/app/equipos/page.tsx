"use client"

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Users, PlusCircle, Trash2, Loader2, CheckCircle2, XCircle, Shield } from 'lucide-react'

export default function GestorEquipos() {
  const [grupos, setGrupos] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [notificacion, setNotificacion] = useState({ mostrar: false, mensaje: '', tipo: '' })

  const [nuevoGrupo, setNuevoGrupo] = useState({ nombre: '', nivel: 'Nivel 1' })

  const nivelesUSAG = ['Nivel 1', 'Nivel 2', 'Nivel 3', 'Nivel 4', 'Nivel 5', 'Nivel 6', 'Nivel 7', 'Nivel 8', 'Nivel 9', 'Nivel 10', 'Élite']

  useEffect(() => {
    cargarGrupos()
  }, [])

  const cargarGrupos = async () => {
    setCargando(true)
    const { data } = await supabase.from('grupos').select('*').order('nivel', { ascending: true })
    setGrupos(data || [])
    setCargando(false)
  }

  const mostrarToast = (mensaje: string, tipo: 'exito' | 'error') => {
    setNotificacion({ mostrar: true, mensaje, tipo })
    setTimeout(() => setNotificacion({ mostrar: false, mensaje: '', tipo: '' }), 3500)
  }

  const crearGrupo = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    try {
      const { error } = await supabase.from('grupos').insert([{
        nombre: nuevoGrupo.nombre,
        nivel: nuevoGrupo.nivel
      }])
      if (error) throw error
      
      mostrarToast('Grupo creado exitosamente', 'exito')
      setNuevoGrupo({ nombre: '', nivel: 'Nivel 1' }) // Limpiar formulario
      cargarGrupos() // Recargar lista
    } catch (error) {
      console.error(error)
      mostrarToast('Error al crear el grupo', 'error')
    } finally {
      setGuardando(false)
    }
  }

  const eliminarGrupo = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar el grupo "${nombre}"? Esto podría afectar a las atletas inscritas en él.`)) return
    
    try {
      const { error } = await supabase.from('grupos').delete().eq('id', id)
      if (error) throw error
      
      mostrarToast('Grupo eliminado', 'exito')
      cargarGrupos()
    } catch (error) {
      console.error(error)
      mostrarToast('Error al eliminar el grupo', 'error')
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto font-sans relative bg-slate-50 min-h-screen">
      
      {notificacion.mostrar && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-[100] ${notificacion.tipo === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {notificacion.tipo === 'error' ? <XCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          <span className="font-bold">{notificacion.mensaje}</span>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <Shield className="w-8 h-8 text-indigo-500" /> Gestor de Equipos
        </h1>
        <p className="text-slate-500 mt-2 font-medium">Crea los niveles y grupos de tu club para organizar a las gimnastas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* FORMULARIO DE CREACIÓN */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 sticky top-8">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
              <PlusCircle className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg font-black text-slate-800">Nuevo Grupo</h2>
            </div>
            
            <form onSubmit={crearGrupo} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nombre del Equipo</label>
                <input 
                  required 
                  type="text" 
                  placeholder="Ej. Pre-Equipo Infantil" 
                  value={nuevoGrupo.nombre} 
                  onChange={e => setNuevoGrupo({...nuevoGrupo, nombre: e.target.value})} 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nivel Técnico</label>
                <select 
                  value={nuevoGrupo.nivel} 
                  onChange={e => setNuevoGrupo({...nuevoGrupo, nivel: e.target.value})} 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                >
                  {nivelesUSAG.map(nivel => <option key={nivel} value={nivel}>{nivel}</option>)}
                </select>
              </div>

              <button type="submit" disabled={guardando} className={`mt-2 w-full py-3.5 rounded-xl font-black flex items-center justify-center gap-2 transition-all ${guardando ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg'}`}>
                {guardando ? <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</> : 'Crear Equipo'}
              </button>
            </form>
          </div>
        </div>

        {/* LISTA DE GRUPOS ACTIVOS */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 min-h-[400px]">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-slate-400" /> Equipos Activos</h2>
              <span className="bg-slate-100 text-slate-600 text-xs font-black px-3 py-1 rounded-lg">{grupos.length} Totales</span>
            </div>

            {cargando ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : grupos.length === 0 ? (
              <div className="text-center py-20 flex flex-col items-center">
                <Shield className="w-16 h-16 text-slate-200 mb-4" />
                <h3 className="text-xl font-black text-slate-400">Sin grupos registrados</h3>
                <p className="text-slate-500 text-sm mt-1">Crea tu primer equipo en el panel izquierdo.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {grupos.map((grupo) => (
                  <div key={grupo.id} className="group bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between hover:border-indigo-300 transition-colors">
                    <div>
                      <span className="inline-block bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md mb-3">
                        {grupo.nivel}
                      </span>
                      <h3 className="text-lg font-black text-slate-800 leading-tight mb-1">{grupo.nombre}</h3>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-end border-t border-slate-200/60 pt-3">
                      <button onClick={() => eliminarGrupo(grupo.id, grupo.nombre)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition-all" title="Eliminar Grupo">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
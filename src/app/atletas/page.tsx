"use client"

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useClubStore } from '../../../store/useClubStore' 
import { Users, UserPlus, Save, Trash2, Search, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

export default function Atletas() {
  const { clubId } = useClubStore() 

  const [grupos, setGrupos] = useState<any[]>([])
  const [atletas, setAtletas] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const [nombre, setNombre] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [grupoId, setGrupoId] = useState('')

  // 🔥 NUEVO: Sistema moderno de notificaciones y modal
  const [notificacion, setNotificacion] = useState({ mostrar: false, mensaje: '', tipo: '' })
  const [modalEliminar, setModalEliminar] = useState<{ id: string, nombre: string } | null>(null)

  useEffect(() => {
    if (clubId) {
      cargarDatos()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId])

  const cargarDatos = async () => {
    if (!clubId) return; 
    
    setCargando(true)
    try {
      const { data: gruposData } = await supabase.from('grupos').select('*').eq('club_id', clubId)
      const { data: atletasData } = await supabase.from('atletas').select('*, grupos(nombre, nivel)').eq('club_id', clubId).order('nombre')
      
      setGrupos(gruposData || [])
      setAtletas(atletasData || [])
    } catch (error) {
      console.error("Error cargando datos:", error)
      setGrupos([])
      setAtletas([])
    } finally {
      setCargando(false)
    }
  }

  // 🔥 NUEVO: Función para mostrar el Toast
  const mostrarToast = (mensaje: string, tipo: 'exito' | 'error') => {
    setNotificacion({ mostrar: true, mensaje, tipo })
    setTimeout(() => setNotificacion({ mostrar: false, mensaje: '', tipo: '' }), 3500)
  }

  const agregarAtleta = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clubId) return mostrarToast('Error: No se ha detectado el club activo', 'error') 
    
    setGuardando(true)
    try {
      const { error } = await supabase.from('atletas').insert([{ nombre, fecha_nacimiento: fechaNacimiento, grupo_id: grupoId, club_id: clubId }])
      if (error) throw error
      
      setNombre('')
      setFechaNacimiento('')
      setGrupoId('')
      cargarDatos()
      mostrarToast('¡Atleta inscrita con éxito!', 'exito') // 🔥 NUEVO: Usamos Toast
    } catch (error) {
      console.error(error)
      mostrarToast('Error al guardar atleta', 'error') // 🔥 NUEVO: Usamos Toast
    } finally {
      setGuardando(false)
    }
  }

  // 🔥 NUEVO: Función modernizada para confirmar eliminación
  const confirmarEliminacion = async () => {
    if (!modalEliminar) return
    try {
      await supabase.from('atletas').delete().eq('id', modalEliminar.id)
      mostrarToast('Atleta eliminada del directorio', 'exito')
      setModalEliminar(null)
      cargarDatos()
    } catch (error) {
      console.error(error)
      mostrarToast('Error al eliminar atleta', 'error')
    }
  }

  const atletasSeguros = atletas || []
  const atletasFiltradas = atletasSeguros.filter(a => a?.nombre?.toLowerCase().includes((busqueda || '').toLowerCase()))

  const mostrarGrupo = (atleta: any) => {
    if (!atleta?.grupos) {
      return <span className="bg-slate-100 text-slate-500 font-bold text-xs px-2 py-1 rounded-md border border-slate-200">Sin grupo</span>
    }
    if (Array.isArray(atleta.grupos)) {
      const grupo = atleta.grupos[0]
      if (!grupo) return <span className="bg-slate-100 text-slate-500 font-bold text-xs px-2 py-1 rounded-md border border-slate-200">Sin grupo</span>
      return <span className="bg-indigo-50 text-indigo-700 font-bold text-xs px-2 py-1 rounded-md border border-indigo-100">{grupo.nombre} ({grupo.nivel})</span>
    }
    return <span className="bg-indigo-50 text-indigo-700 font-bold text-xs px-2 py-1 rounded-md border border-indigo-100">{atleta.grupos.nombre} ({atleta.grupos.nivel})</span>
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans relative">
      
      {/* 🔥 NUEVO: TOAST DE NOTIFICACIÓN */}
      {notificacion.mostrar && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-[100] ${notificacion.tipo === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {notificacion.tipo === 'error' ? <XCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          <span className="font-bold">{notificacion.mensaje}</span>
        </div>
      )}

      {/* 🔥 NUEVO: MODAL MODERNO DE ELIMINACIÓN */}
      {modalEliminar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="p-6 flex flex-col items-center text-center">
              <div className="bg-rose-50 p-4 rounded-full mb-4">
                <AlertTriangle className="w-10 h-10 text-rose-500" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">¿Eliminar Atleta?</h3>
              <p className="text-slate-500 text-sm mb-6">
                Estás a punto de dar de baja a <strong>{modalEliminar.nombre}</strong>. Se perderá su historial y test físicos asociados.
              </p>
              <div className="flex w-full gap-3">
                <button onClick={() => setModalEliminar(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancelar</button>
                <button onClick={confirmarEliminacion} className="flex-1 py-3 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md transition-colors">Sí, Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <Users className="w-8 h-8 text-rose-500" /> Roster de Gimnastas
        </h1>
        <p className="text-slate-500 mt-2 font-medium">Inscribe a las gimnastas y asígnalas a su grupo de entrenamiento.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulario de Inscripción */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-500" /> Nueva Inscripción
          </h2>
          <form onSubmit={agregarAtleta} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nombre Completo</label>
              <input required type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Ana Pérez" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Fecha de Nacimiento</label>
              <input required type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-600" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Asignar a Grupo</label>
              <select required value={grupoId} onChange={(e) => setGrupoId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 cursor-pointer">
                <option value="" disabled>Selecciona un grupo...</option>
                {(grupos || []).map(g => <option key={g.id} value={g.id}>{g.nombre} ({g.nivel})</option>)}
              </select>
            </div>
            <button type="submit" disabled={guardando} className="mt-4 w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex justify-center items-center gap-2">
              {guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Guardar Atleta
            </button>
          </form>
        </div>

        {/* Lista de Atletas */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800">Directorio ({(atletasFiltradas || []).length})</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input type="text" placeholder="Buscar atleta..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64" />
            </div>
          </div>

          {cargando ? (
            <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="p-3 rounded-tl-xl font-bold">Atleta</th>
                    <th className="p-3 font-bold">Edad Aprox.</th>
                    <th className="p-3 font-bold">Grupo / Nivel</th>
                    <th className="p-3 rounded-tr-xl font-bold text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(atletasFiltradas || []).map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-3 font-bold text-slate-800">{a.nombre}</td>
                      <td className="p-3 text-sm text-slate-600">
                        {a.fecha_nacimiento ? `${new Date().getFullYear() - new Date(a.fecha_nacimiento).getFullYear()} años` : '-'}
                      </td>
                      <td className="p-3">
                        {mostrarGrupo(a)}
                      </td>
                      <td className="p-3 text-right">
                        {/* 🔥 NUEVO: Ahora abre el modal en lugar del confirm de navegador */}
                        <button onClick={() => setModalEliminar({ id: a.id, nombre: a.nombre })} className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(atletasFiltradas || []).length === 0 && <p className="text-center text-slate-400 py-6 text-sm">No hay atletas registradas.</p>}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
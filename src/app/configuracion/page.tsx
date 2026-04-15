"use client"

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useClubStore } from '../../../store/useClubStore'
import { Users, PlusCircle, Trash2, Loader2, CheckCircle2, XCircle, Shield, Settings, AlertTriangle, Save, CalendarDays, Calculator, Clock, Upload, Building2 } from 'lucide-react'
import GestorInventario from '../../components/dashboard/GestorInventario' // 🔥 IMPORTAMOS EL GESTOR DE INVENTARIO

export default function ConfiguracionGeneral() {
  const { clubId, nombreClub, logoUrl, setClubData } = useClubStore() 
  const [grupos, setGrupos] = useState<any[]>([])
  const [cargandoGrupos, setCargandoGrupos] = useState(true)
  const [notificacion, setNotificacion] = useState({ mostrar: false, mensaje: '', tipo: '' })
  
  // ==========================================
  // ESTADOS: PERFIL DEL CLUB 
  // ==========================================
  const [nuevoNombreClub, setNuevoNombreClub] = useState('')
  const [nuevoLogoClub, setNuevoLogoClub] = useState('')
  const [archivoLogo, setArchivoLogo] = useState<File | null>(null) // Para subir a Supabase
  const [guardandoClub, setGuardandoClub] = useState(false)

  useEffect(() => {
    if (nombreClub && nombreClub !== 'Cargando...') setNuevoNombreClub(nombreClub)
    if (logoUrl) setNuevoLogoClub(logoUrl)
  }, [nombreClub, logoUrl])

  // ==========================================
  // ESTADOS: GESTOR DE EQUIPOS
  // ==========================================
  const [nuevoGrupo, setNuevoGrupo] = useState({ nombre: '', nivel: 'Nivel 1' })
  const [guardandoGrupo, setGuardandoGrupo] = useState(false)
  const [modalEliminar, setModalEliminar] = useState<{ id: string, nombre: string } | null>(null)
  const nivelesUSAG = ['Nivel 1', 'Nivel 2', 'Nivel 3', 'Nivel 4', 'Nivel 5', 'Nivel 6', 'Nivel 7', 'Nivel 8', 'Nivel 9', 'Nivel 10', 'Élite']

  // ==========================================
  // ESTADOS: CONFIGURACIÓN DE TEMPORADA
  // ==========================================
  const [grupoActivo, setGrupoActivo] = useState<string>('')
  const [guardandoConfig, setGuardandoConfig] = useState(false)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaCompetencia, setFechaCompetencia] = useState('')
  const [calculo, setCalculo] = useState({ totales: 0, preparatorio: 0, competitivo: 0, general: 0, especial: 0 })

  const horarioBase = [
    { dia: 'Lunes', enfoque: 'Prep. Física Gral + Salto y Barras', aparatos: 'Salto, Barras', lugar: 'Gimnasio Principal', hora: '4:00 PM - 7:00 PM' },
    { dia: 'Martes', enfoque: 'Flexibilidad + Viga y Suelo', aparatos: 'Viga, Suelo', lugar: 'Gimnasio Principal', hora: '4:00 PM - 7:00 PM' },
    { dia: 'Miércoles', enfoque: 'Coreografía, Ballet y Prevención', aparatos: 'Suelo, Danza', lugar: 'Salón de Danza', hora: '4:00 PM - 6:00 PM' },
    { dia: 'Jueves', enfoque: 'Física Especial + Salto y Viga', aparatos: 'Salto, Viga', lugar: 'Pista Atlética / Gimnasio', hora: '4:00 PM - 7:00 PM' },
    { dia: 'Viernes', enfoque: 'Barras, Suelo y Acrobacia', aparatos: 'Barras, Suelo', lugar: 'Gimnasio Principal', hora: '4:00 PM - 7:00 PM' },
    { dia: 'Sábado', enfoque: 'Control Técnico y Repaso Rutinas', aparatos: 'Todos', lugar: 'Gimnasio Principal', hora: '8:00 AM - 12:00 PM' }
  ]
  const [horario, setHorario] = useState(horarioBase)

  useEffect(() => {
    if (clubId) cargarGrupos()
  }, [clubId])

  const cargarGrupos = async () => {
    setCargandoGrupos(true)
    const { data } = await supabase.from('grupos').select('*').eq('club_id', clubId).order('nivel', { ascending: true })
    setGrupos(data || [])
    setCargandoGrupos(false)
  }

  const mostrarToast = (mensaje: string, tipo: 'exito' | 'error') => {
    setNotificacion({ mostrar: true, mensaje, tipo })
    setTimeout(() => setNotificacion({ mostrar: false, mensaje: '', tipo: '' }), 3500)
  }

  // --- LÓGICA DEL CLUB: GUARDAR LOGO REAL ---
  const handleSimularSubidaLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setArchivoLogo(file) // Guardamos el archivo real para subirlo
      setNuevoLogoClub(URL.createObjectURL(file)) // Vista previa inmediata
    }
  }

  const guardarPerfilClub = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clubId) return
    setGuardandoClub(true)
    
    try {
      let finalLogoUrl = nuevoLogoClub

      // Si hay un archivo nuevo, lo subimos a Supabase Storage
      if (archivoLogo) {
        const fileExt = archivoLogo.name.split('.').pop()
        const fileName = `${clubId}-${Math.random()}.${fileExt}`
        const filePath = `logos/${fileName}`

        // 🔥 Asegúrate de tener un bucket llamado 'logos' en Supabase
        const { error: uploadError } = await supabase.storage.from('logos').upload(filePath, archivoLogo)
        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(filePath)
        finalLogoUrl = publicUrl
      }

      // Actualizamos la base de datos con el nuevo nombre y la URL final del logo
      const { error } = await supabase.from('clubs').update({ nombre: nuevoNombreClub, logo_url: finalLogoUrl }).eq('id', clubId)
      if (error) throw error

      setClubData({ nombreClub: nuevoNombreClub, logoUrl: finalLogoUrl })
      setArchivoLogo(null) // Limpiamos el archivo pendiente
      mostrarToast('Perfil y Logo del club actualizados', 'exito')
    } catch (error) {
      console.error(error)
      mostrarToast('Error al actualizar el club. ¿Existe el bucket "logos"?', 'error')
    } finally {
      setGuardandoClub(false)
    }
  }

  // --- LÓGICA DE EQUIPOS ---
  const crearGrupo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clubId) return mostrarToast('Error: No se ha detectado el club activo', 'error')
    
    setGuardandoGrupo(true)
    try {
      const { error } = await supabase.from('grupos').insert([{ nombre: nuevoGrupo.nombre, nivel: nuevoGrupo.nivel, club_id: clubId }])
      if (error) throw error
      mostrarToast('Equipo creado exitosamente', 'exito')
      setNuevoGrupo({ nombre: '', nivel: 'Nivel 1' })
      cargarGrupos()
    } catch (error) {
      console.error(error)
      mostrarToast('Error al crear el equipo', 'error')
    } finally {
      setGuardandoGrupo(false)
    }
  }

  const confirmarEliminacion = async () => {
    if (!modalEliminar) return
    try {
      const { error } = await supabase.from('grupos').delete().eq('id', modalEliminar.id)
      if (error) throw error
      mostrarToast('Equipo eliminado del sistema', 'exito')
      setModalEliminar(null)
      if (grupoActivo === modalEliminar.id) setGrupoActivo('')
      cargarGrupos()
    } catch (error) {
      console.error(error)
      mostrarToast('Error al eliminar el equipo', 'error')
    }
  }

  // --- LÓGICA DE TEMPORADA ---
  useEffect(() => {
    if (!grupoActivo) return
    const cargarConfig = async () => {
      const { data } = await supabase.from('configuracion_grupos').select('*').eq('grupo_id', grupoActivo).single()
      if (data) {
        if (data.fecha_inicio) setFechaInicio(data.fecha_inicio)
        if (data.fecha_competencia) setFechaCompetencia(data.fecha_competencia)
        if (data.horario_semanal) setHorario(data.horario_semanal)
      } else {
        setFechaInicio('')
        setFechaCompetencia('')
        setHorario(horarioBase)
        setCalculo({ totales: 0, preparatorio: 0, competitivo: 0, general: 0, especial: 0 })
      }
    }
    cargarConfig()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupoActivo])

  useEffect(() => {
    if (fechaInicio && fechaCompetencia) {
      const inicio = new Date(fechaInicio)
      const final = new Date(fechaCompetencia)
      const diferenciaTiempo = final.getTime() - inicio.getTime()
      const diasTotales = Math.ceil(diferenciaTiempo / (1000 * 3600 * 24))
      
      if (diasTotales > 0) {
        const semanasTotales = Math.floor(diasTotales / 7)
        const prep = Math.round(semanasTotales * 0.8)
        const comp = semanasTotales - prep
        const gral = Math.round(prep * 0.6)
        const esp = prep - gral
        setCalculo({ totales: semanasTotales, preparatorio: prep, competitivo: comp, general: gral, especial: esp })
      }
    }
  }, [fechaInicio, fechaCompetencia])

  const manejarCambioHorario = (index: number, campo: string, valor: string) => {
    const nuevoHorario = [...horario]
    nuevoHorario[index] = { ...nuevoHorario[index], [campo]: valor }
    setHorario(nuevoHorario)
  }

  const guardarConfiguracion = async () => {
    if (!grupoActivo) return mostrarToast("Selecciona un grupo primero", "error")
    setGuardandoConfig(true)
    try {
      const { error } = await supabase.from('configuracion_grupos').upsert({
        grupo_id: grupoActivo,
        fecha_inicio: fechaInicio,
        fecha_competencia: fechaCompetencia,
        semanas_totales: calculo.totales,
        semanas_preparatorio: calculo.preparatorio,
        semanas_competitivo: calculo.competitivo,
        horario_semanal: horario
      }, { onConflict: 'grupo_id' })

      if (error) throw error
      mostrarToast("¡Configuración de temporada guardada!", "exito")
    } catch (error) {
      console.error(error)
      mostrarToast("Error al guardar la configuración.", "error")
    } finally {
      setGuardandoConfig(false)
    }
  }

  if (!clubId) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /></div>
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans relative bg-slate-50 min-h-screen">
      
      {notificacion.mostrar && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-[100] ${notificacion.tipo === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {notificacion.tipo === 'error' ? <XCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          <span className="font-bold">{notificacion.mensaje}</span>
        </div>
      )}

      {modalEliminar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="p-6 flex flex-col items-center text-center">
              <div className="bg-rose-50 p-4 rounded-full mb-4">
                <AlertTriangle className="w-10 h-10 text-rose-500" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">¿Eliminar Equipo?</h3>
              <p className="text-slate-500 text-sm mb-6">Estás a punto de borrar <strong>"{modalEliminar.nombre}"</strong>.</p>
              <div className="flex w-full gap-3">
                <button onClick={() => setModalEliminar(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancelar</button>
                <button onClick={confirmarEliminacion} className="flex-1 py-3 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md transition-colors">Sí, Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-10 border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <Settings className="w-8 h-8 text-indigo-500" /> Centro de Configuración
        </h1>
        <p className="text-slate-500 mt-2 font-medium">Gestión de identidad, equipos, macrociclos, horarios de entrenamiento e inventario de implementación.</p>
      </div>

      {/* =========================================================================
          SECCIÓN 1: PERFIL DEL CLUB E INVENTARIO (GLOBAL)
          ========================================================================= */}
      <div className="mb-12">
        <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-slate-400"/> 1. Perfil del Club e Inventario
        </h2>
        
        <form onSubmit={guardarPerfilClub} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 mb-6">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-full border-4 border-slate-100 flex items-center justify-center bg-slate-50 overflow-hidden relative shadow-sm group">
                 {nuevoLogoClub && nuevoLogoClub !== '/default-club-logo.png' ? (
                    <img src={nuevoLogoClub} alt="Preview Logo" className="w-full h-full object-cover" />
                 ) : (
                    <Upload className="text-slate-300 w-10 h-10" />
                 )}
                 <label className="absolute inset-0 bg-slate-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    <span className="text-white text-xs font-bold uppercase tracking-widest">Cambiar</span>
                    <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleSimularSubidaLogo} />
                 </label>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Logo Oficial</span>
            </div>

            <div className="flex-1 w-full flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nombre Oficial del Club</label>
                <input required type="text" value={nuevoNombreClub} onChange={(e) => setNuevoNombreClub(e.target.value)} placeholder="Ej. G.A. Estrella" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-lg" />
              </div>
              {/* 🔥 BOTÓN ARREGLADO CON bg-indigo-600 PARA QUE EL TEXTO BLANCO SE VEA */}
              <button type="submit" disabled={guardandoClub} className={`mt-2 w-full md:w-auto self-start px-8 py-3.5 rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-md ${guardandoClub ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                {guardandoClub ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5"/> Guardar Perfil</>}
              </button>
            </div>
          </div>
        </form>

        {/* 🔥 GESTOR DE INVENTARIO A NIVEL CLUB (GLOBAL) */}
        <GestorInventario grupoId={clubId} />
      </div>

      {/* =========================================================================
          SECCIÓN 2: GESTOR DE EQUIPOS
          ========================================================================= */}
      <div className="mb-12 border-t border-slate-200 pt-8">
        <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2"><Shield className="w-6 h-6 text-slate-400"/> 2. Gestión de Equipos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Crear Nuevo</h3>
            <form onSubmit={crearGrupo} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nombre del Equipo</label>
                <input required type="text" placeholder="Ej. Pre-Equipo Infantil" value={nuevoGrupo.nombre} onChange={e => setNuevoGrupo({...nuevoGrupo, nombre: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nivel Técnico USAG/FIG</label>
                <select value={nuevoGrupo.nivel} onChange={e => setNuevoGrupo({...nuevoGrupo, nivel: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer">
                  {nivelesUSAG.map(nivel => <option key={nivel} value={nivel}>{nivel}</option>)}
                </select>
              </div>
              <button type="submit" disabled={guardandoGrupo} className={`mt-2 w-full py-3.5 rounded-xl font-black flex items-center justify-center gap-2 transition-all ${guardandoGrupo ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'}`}>
                {guardandoGrupo ? <Loader2 className="w-5 h-5 animate-spin" /> : <><PlusCircle className="w-5 h-5"/> Añadir</>}
              </button>
            </form>
          </div>

          <div className="md:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Equipos Activos</h3>
              <span className="bg-indigo-50 text-indigo-600 text-xs font-black px-3 py-1 rounded-lg">{grupos.length} Totales</span>
            </div>
            {cargandoGrupos ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
            ) : grupos.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-10 italic">No hay equipos registrados en tu club.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-2">
                {grupos.map((grupo) => (
                  <div key={grupo.id} className="group bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-indigo-300 transition-colors">
                    <div>
                      <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{grupo.nivel}</span>
                      <span className="font-bold text-slate-800">{grupo.nombre}</span>
                    </div>
                    <button onClick={() => setModalEliminar({ id: grupo.id, nombre: grupo.nombre })} className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 p-2 rounded-lg transition-all" title="Eliminar Equipo">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECCIÓN 3: CONFIGURACIÓN DE TEMPORADA Y HORARIOS
          ========================================================================= */}
      <div className="mb-12 border-t border-slate-200 pt-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><CalendarDays className="w-6 h-6 text-slate-400"/> 3. Temporada y Horarios</h2>
          
          <button onClick={guardarConfiguracion} disabled={guardandoConfig || !grupoActivo} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm ${!grupoActivo ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
            {guardandoConfig ? <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</> : <><Save className="w-5 h-5" /> Guardar Ajustes</>}
          </button>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row items-center gap-4">
          <label className="text-sm font-bold text-slate-700 whitespace-nowrap">Configurar temporada para:</label>
          <select value={grupoActivo} onChange={(e) => setGrupoActivo(e.target.value)} className="w-full md:w-1/3 bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl focus:ring-indigo-500 outline-none p-3 font-bold cursor-pointer">
            <option value="" disabled>Selecciona un equipo...</option>
            {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre} ({g.nivel})</option>)}
          </select>
        </div>

        {grupoActivo ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2"><CalendarDays className="w-4 h-4 text-rose-500" /> Fechas Clave</h3>
                <div className="mb-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Inicio de Pretemporada</label>
                  <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 text-slate-700 font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-rose-600 uppercase mb-1">Competencia Fundamental</label>
                  <input type="date" value={fechaCompetencia} onChange={(e) => setFechaCompetencia(e.target.value)} className="w-full p-3 bg-rose-50 border border-rose-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 text-rose-700 font-bold" />
                </div>
              </div>

              <div className="bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-800 text-white">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-6 text-indigo-400 uppercase tracking-wider"><Calculator className="w-4 h-4" /> Calculadora Macrociclo</h3>
                <div className="flex justify-between items-center pb-4 border-b border-slate-700 mb-4">
                  <span className="text-sm font-medium text-slate-400">Semanas Totales:</span>
                  <span className="text-3xl font-black">{calculo.totales}</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-300">P. Preparatorio (80%):</span>
                    <span className="text-sm font-bold bg-slate-800 px-3 py-1 rounded-lg">{calculo.preparatorio} sem</span>
                  </div>
                  <div className="flex justify-between items-center pl-4 border-l-2 border-slate-700">
                    <span className="text-xs text-slate-400">General (60%)</span>
                    <span className="text-xs font-bold text-slate-300">{calculo.general} sem</span>
                  </div>
                  <div className="flex justify-between items-center pl-4 border-l-2 border-slate-700">
                    <span className="text-xs text-slate-400">Especial (40%)</span>
                    <span className="text-xs font-bold text-slate-300">{calculo.especial} sem</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                    <span className="text-sm font-medium text-amber-400">P. Competitivo (20%):</span>
                    <span className="text-sm font-bold bg-amber-500/20 text-amber-300 px-3 py-1 rounded-lg">{calculo.competitivo} sem</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-6 uppercase tracking-wider"><Clock className="w-4 h-4 text-indigo-500" /> Horario Semanal del Grupo</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                      <th className="p-3 rounded-tl-xl">Día</th>
                      <th className="p-3 w-1/3">Enfoque Físico/Técnico</th>
                      <th className="p-3">Aparatos</th>
                      <th className="p-3">Lugar</th>
                      <th className="p-3 rounded-tr-xl">Horario</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {horario.map((dia, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors group">
                        <td className="p-3 font-black text-slate-700">{dia.dia}</td>
                        <td className="p-3"><input type="text" value={dia.enfoque} onChange={(e) => manejarCambioHorario(index, 'enfoque', e.target.value)} className="w-full bg-transparent border-b border-transparent focus:border-indigo-400 outline-none py-1 font-medium text-slate-600 transition-colors" /></td>
                        <td className="p-3"><input type="text" value={dia.aparatos} onChange={(e) => manejarCambioHorario(index, 'aparatos', e.target.value)} className="w-full bg-transparent border-b border-transparent focus:border-indigo-400 outline-none py-1 font-medium text-slate-600 text-xs transition-colors" /></td>
                        <td className="p-3"><input type="text" value={dia.lugar} onChange={(e) => manejarCambioHorario(index, 'lugar', e.target.value)} className="w-full bg-transparent border-b border-transparent focus:border-indigo-400 outline-none py-1 text-slate-500 text-xs transition-colors" /></td>
                        <td className="p-3"><input type="text" value={dia.hora} onChange={(e) => manejarCambioHorario(index, 'hora', e.target.value)} className="w-full bg-transparent border-b border-transparent focus:border-indigo-400 outline-none py-1 text-slate-800 text-xs font-black whitespace-nowrap transition-colors" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-12 rounded-3xl shadow-sm border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center">
            <CalendarDays className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">Selecciona un equipo arriba para configurar su temporada y horarios.</p>
          </div>
        )}
      </div>

    </div>
  )
}
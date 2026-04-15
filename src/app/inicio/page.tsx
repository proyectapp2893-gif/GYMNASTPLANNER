"use client"

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useClubStore } from '../../../store/useClubStore' 
import { Users, Activity, Trophy, Calendar, Dumbbell, Award, Flame, Loader2, AlertCircle, ChevronLeft, ChevronRight, Filter, X, Edit3, PlusCircle, CheckCircle2, ShieldCheck, Wind } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TermometroFisicoCard from '../../components/dashboard/TermometroFisico'

export default function InicioPage() {
  const router = useRouter()
  const { clubId, nombreClub } = useClubStore() 

  const [stats, setStats] = useState({ atletas: 0, grupos: 0 })
  const [proximoEvento, setProximoEvento] = useState<any>(null)
  const [rendimiento, setRendimiento] = useState({ dominadas: 0, lagartijas: 0 })
  const [cargando, setCargando] = useState(true)
  const [timeoutAlcanzado, setTimeoutAlcanzado] = useState(false)
  
  const [fechaInicioSemana, setFechaInicioSemana] = useState(new Date())
  const [sesionesDeSemana, setSesionesDeSemana] = useState<any[]>([])
  const [nivelFiltro, setNivelFiltro] = useState('Todos') 
  const [nivelesDisponibles, setNivelesDisponibles] = useState<string[]>([])
  
  const [modalAbierto, setModalAbierto] = useState(false)
  const [diaSeleccionadoModal, setDiaSeleccionadoModal] = useState<Date | null>(null)
  const [sesionSeleccionadaModal, setSesionSeleccionadaModal] = useState<any | null>(null)
  const [tabActivoModal, setTabActivoModal] = useState('calentamiento')

  const diasSemanaNombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  const formatearFechaLocal = (d: Date) => {
    const z = (n: number) => (n < 10 ? '0' : '') + n;
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  }

  // Control de timeout por si la base de datos tarda o no hay club
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cargando && !clubId) {
      timer = setTimeout(() => { setTimeoutAlcanzado(true); }, 3500);
    }
    return () => clearTimeout(timer);
  }, [cargando, clubId]);

  // Carga principal de datos del Dashboard de Inicio
  useEffect(() => {
    if (!clubId) return;

    const cargarDashboard = async () => {
      setCargando(true)
      setTimeoutAlcanzado(false) 

      // 1. Cargar Estadísticas (Atletas y Grupos)
      const { count: countAtletas } = await supabase.from('atletas').select('*', { count: 'exact', head: true }).eq('club_id', clubId)
      const { count: countGrupos } = await supabase.from('grupos').select('*', { count: 'exact', head: true }).eq('club_id', clubId)
      setStats({ atletas: countAtletas || 0, grupos: countGrupos || 0 })

      // 2. Cargar Próximo Evento
      const hoyStr = formatearFechaLocal(new Date())
      const { data: evento } = await supabase.from('competencias').select('*').eq('club_id', clubId).gte('fecha', hoyStr).order('fecha', { ascending: true }).limit(1).single()
      if (evento) setProximoEvento(evento)

      // 3. Cargar Datos del Termómetro (Evaluaciones)
      const { data: evaluaciones } = await supabase.from('evaluaciones_fisicas').select('resultados').eq('club_id', clubId).order('created_at', { ascending: false }).limit(20) 
      if (evaluaciones && evaluaciones.length > 0) {
        let totalDominadas = 0, totalLagartijas = 0, validos = 0
        evaluaciones.forEach(ev => {
          const dom = parseInt(ev.resultados.dominadas)
          const lag = parseInt(ev.resultados.lagartijas)
          if (!isNaN(dom) && !isNaN(lag)) { 
            totalDominadas += dom; 
            totalLagartijas += lag; 
            validos++ 
          }
        })
        if (validos > 0) {
          setRendimiento({ 
            dominadas: Math.round((totalDominadas / validos) * 10) / 10, 
            lagartijas: Math.round((totalLagartijas / validos) * 10) / 10 
          })
        }
      } else {
         setRendimiento({ dominadas: 0, lagartijas: 0 })
      }

      // 4. Cargar Niveles para el Filtro
      const { data: gruposData } = await supabase.from('grupos').select('nivel').eq('club_id', clubId)
      if (gruposData) {
        const nivelesUnicos = Array.from(new Set(gruposData.map(g => g.nivel)))
        setNivelesDisponibles(nivelesUnicos as string[])
      }

      cargarSesionesMiniCalendario(fechaInicioSemana);
      setCargando(false)
    }

    cargarDashboard()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]) 

  const cargarSesionesMiniCalendario = async (fechaBase: Date) => {
    if (!clubId) return;
    const inicio = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), fechaBase.getDate());
    inicio.setDate(inicio.getDate() - inicio.getDay());
    const fin = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6);

    const inicioStr = formatearFechaLocal(inicio);
    const finStr = formatearFechaLocal(fin);

    const { data: sesiones } = await supabase.from('sesiones').select('id, nivel, objetivo, fecha_calendario, ejercicios').eq('club_id', clubId).gte('fecha_calendario', inicioStr).lte('fecha_calendario', finStr);
    setSesionesDeSemana(sesiones || []);
  };

  const cambiarSemana = (dias: number) => {
    const nuevaFecha = new Date(fechaInicioSemana.getFullYear(), fechaInicioSemana.getMonth(), fechaInicioSemana.getDate() + dias);
    setFechaInicioSemana(nuevaFecha);
    cargarSesionesMiniCalendario(nuevaFecha);
  };

  const obtenerDiasSemanaVisible = () => {
    const inicio = new Date(fechaInicioSemana.getFullYear(), fechaInicioSemana.getMonth(), fechaInicioSemana.getDate());
    inicio.setDate(inicio.getDate() - inicio.getDay());
    const dias = [];
    for (let i = 0; i < 7; i++) { 
      dias.push(new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i)); 
    }
    return dias;
  };

  const abrirPantallaFlotante = (dia: Date, sesion: any) => {
    setDiaSeleccionadoModal(dia);
    setSesionSeleccionadaModal(sesion);
    setTabActivoModal('calentamiento'); 
    setModalAbierto(true);
  }

  const irAlConstructor = () => {
    if (!diaSeleccionadoModal) return;
    const fechaFormateada = diaSeleccionadoModal.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    router.push(`/dashboard?fechaExactaDia=${encodeURIComponent(fechaFormateada)}&nivel=${encodeURIComponent(nivelFiltro !== 'Todos' ? nivelFiltro : 'Nivel General')}`);
  }

  if (cargando || !clubId) {
    if (timeoutAlcanzado) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <div className="bg-amber-100 p-4 rounded-full mb-6"><AlertCircle className="w-12 h-12 text-amber-600" /></div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Cuenta en Revisión o Sin Club</h2>
          <p className="text-slate-500 max-w-md mb-8 font-medium">Tu cuenta ha sido creada, pero aún no tienes un club asociado.</p>
          <button onClick={() => router.push('/superadmin')} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">Ir al Panel Maestro</button>
        </div>
      );
    }
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /></div>
  }

  const tabsModal = [
    { id: 'calentamiento', label: 'Calentamiento', icon: Flame, color: 'text-amber-500', bg: 'bg-amber-50' },
    { id: 'prep-fisica', label: 'Prep. Física', icon: Dumbbell, color: 'text-rose-500', bg: 'bg-rose-50' },
    { id: 'tecnico', label: 'Técnico', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'flexibilidad', label: 'Flexibilidad', icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 'cierre', label: 'Calma', icon: Wind, color: 'text-slate-500', bg: 'bg-slate-100' }
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans bg-slate-50 min-h-screen relative animate-in fade-in duration-500">
      
      {/* CABECERA PRINCIPAL */}
      <div className="mb-10 bg-slate-900 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none translate-x-1/4 -translate-y-1/4">
          <Trophy className="w-96 h-96" />
        </div>
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-black uppercase tracking-widest mb-4 border border-indigo-500/30">
            <Flame className="w-3 h-3" /> Temporada 2026
          </span>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Bienvenido, Head Coach.</h1>
          <p className="text-slate-400 text-lg max-w-xl font-medium">Este es el resumen de operaciones de <strong>{nombreClub}</strong>.</p>
        </div>
      </div>

      {/* TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Tarjeta: Roster Activo */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-500 uppercase tracking-widest text-xs">Roster Activo</h3>
              <div className="bg-blue-50 p-2 rounded-lg"><Users className="w-5 h-5 text-blue-500" /></div>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-black text-slate-800">{stats.atletas}</span>
              <span className="text-sm font-bold text-slate-400 mb-1.5">Gimnastas</span>
            </div>
            <p className="text-sm font-bold text-blue-600 mt-2">Distribuidas en {stats.grupos} niveles</p>
          </div>
        </div>

        {/* Tarjeta: Próximo Evento */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-500 uppercase tracking-widest text-xs">Próximo Evento</h3>
              <div className="bg-amber-50 p-2 rounded-lg"><Calendar className="w-5 h-5 text-amber-500" /></div>
            </div>
            {proximoEvento ? (
              <>
                <h4 className="text-2xl font-black text-slate-800 leading-tight truncate">{proximoEvento.nombre}</h4>
                <p className="text-sm font-bold text-amber-600 mt-2 capitalize">{new Date(proximoEvento.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                <span className="inline-block mt-3 bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider">{proximoEvento.tipo}</span>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 opacity-50">
                <Award className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-400">Sin eventos próximos</p>
              </div>
            )}
          </div>
        </div>

        {/* Tarjeta: Termómetro Físico */}
        <TermometroFisicoCard dominadasActual={rendimiento.dominadas} lagartijasActual={rendimiento.lagartijas} />
      </div>

      {/* MINI CALENDARIO OPERATIVO */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col mb-10">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              <h3 className="font-black text-slate-800 text-lg">Horario Operativo</h3>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              Semana del {obtenerDiasSemanaVisible()[0].getDate()} al {obtenerDiasSemanaVisible()[6].getDate()} de {obtenerDiasSemanaVisible()[0].toLocaleDateString('es-ES', { month: 'long' })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
              <Filter className="w-4 h-4 text-slate-400" />
              <select value={nivelFiltro} onChange={(e) => setNivelFiltro(e.target.value)} className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer">
                <option value="Todos">Todos los Grupos</option>
                {nivelesDisponibles.map(nivel => <option key={nivel} value={nivel}>{nivel}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => cambiarSemana(-7)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors shadow-sm"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
              <button onClick={() => cambiarSemana(7)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors shadow-sm"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-x-auto custom-scrollbar flex-1 bg-white">
           <div className="grid grid-cols-7 gap-4 min-w-[800px] h-full">
              {obtenerDiasSemanaVisible().map((dia, index) => {
                const esHoy = dia.toDateString() === new Date().toDateString();
                const fechaStr = formatearFechaLocal(dia); 
                
                let sesionesDelDia = sesionesDeSemana.filter(s => s.fecha_calendario === fechaStr);
                if (nivelFiltro !== 'Todos') { sesionesDelDia = sesionesDelDia.filter(s => s.nivel === nivelFiltro); }
                
                const tieneSesion = sesionesDelDia.length > 0;
                const infoSesion = tieneSesion ? sesionesDelDia[0] : null;

                return (
                  <div key={index} onClick={() => abrirPantallaFlotante(dia, infoSesion)} className={`flex-1 rounded-2xl border flex flex-col cursor-pointer transition-all hover:shadow-md relative overflow-hidden group ${esHoy ? 'border-indigo-400 ring-4 ring-indigo-50' : 'border-slate-200 hover:border-indigo-300'} ${tieneSesion ? 'bg-indigo-50/30' : 'bg-white'}`}>
                    <div className={`p-3 border-b ${esHoy ? 'border-indigo-100 bg-indigo-50/50' : 'border-slate-100 bg-slate-50/50'} flex justify-between items-center`}>
                      <span className={`text-xs font-black uppercase tracking-widest ${esHoy ? 'text-indigo-600' : 'text-slate-500'}`}>{diasSemanaNombres[dia.getDay()]}</span>
                      <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${esHoy ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-700'}`}>{dia.getDate()}</span>
                    </div>
                    <div className="p-4 flex flex-col justify-between flex-1">
                      {tieneSesion ? (
                        <>
                          <div>
                            <div className="flex items-center gap-1.5 mb-2">
                              <Activity className="w-3.5 h-3.5 text-indigo-500" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Planificado</span>
                            </div>
                            <p className="text-xs font-bold text-slate-800 leading-tight line-clamp-2">{infoSesion.objetivo}</p>
                          </div>
                          <div className="mt-4 pt-3 border-t border-slate-100/80">
                             <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                               <Users className="w-3 h-3" />
                               <span className="text-[10px] font-bold truncate">{infoSesion.nivel}</span>
                             </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mb-2"><Calendar className="w-4 h-4 text-slate-400" /></div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Abrir Día</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
           </div>
        </div>
      </div>

      {/* MODAL / PANTALLA FLOTANTE DE LA SESIÓN */}
      {modalAbierto && diaSeleccionadoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start shrink-0">
              <div>
                <h2 className="text-2xl font-black text-slate-800 capitalize">{diaSeleccionadoModal.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
                {sesionSeleccionadaModal ? (
                  <p className="text-sm font-bold text-indigo-600 mt-1 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> {sesionSeleccionadaModal.objetivo} • {sesionSeleccionadaModal.nivel}</p>
                ) : (
                  <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">Día libre de planificación</p>
                )}
              </div>
              <button onClick={() => setModalAbierto(false)} className="p-2 bg-slate-200 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
              {sesionSeleccionadaModal ? (
                <>
                  <div className="flex overflow-x-auto border-b border-slate-200 bg-white px-4 shrink-0">
                    {tabsModal.map(tab => {
                      const Icono = tab.icon;
                      const isActivo = tabActivoModal === tab.id;
                      const count = sesionSeleccionadaModal.ejercicios?.[tab.id]?.length || 0;
                      
                      return (
                        <button 
                          key={tab.id}
                          onClick={() => setTabActivoModal(tab.id)}
                          className={`flex items-center gap-2 px-5 py-4 border-b-2 transition-colors whitespace-nowrap ${isActivo ? `border-${tab.color.split('-')[1]}-500 ${tab.color} bg-slate-50` : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                        >
                          <Icono className="w-4 h-4" />
                          <span className="font-bold text-sm">{tab.label}</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isActivo ? tab.bg : 'bg-slate-100 text-slate-400'}`}>{count}</span>
                        </button>
                      )
                    })}
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {sesionSeleccionadaModal.ejercicios?.[tabActivoModal]?.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {sesionSeleccionadaModal.ejercicios[tabActivoModal].map((ej: any, idx: number) => (
                          <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 hover:border-indigo-300 transition-colors">
                            <h4 className="font-bold text-slate-800 text-base">{ej.contenido || ej.nombre}</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 pt-3 border-t border-slate-100">
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <span className="block text-[9px] font-black uppercase text-indigo-500 mb-1 tracking-widest">Avanzado</span>
                                <p className="text-xs text-slate-700 font-medium whitespace-pre-line">{typeof ej.dosificacion === 'string' ? ej.dosificacion : (ej.dosificacion?.avanzado || '-')}</p>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <span className="block text-[9px] font-black uppercase text-emerald-500 mb-1 tracking-widest">Base</span>
                                <p className="text-xs text-slate-700 font-medium whitespace-pre-line">{typeof ej.dosificacion === 'string' ? '-' : (ej.dosificacion?.base || '-')}</p>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <span className="block text-[9px] font-black uppercase text-amber-500 mb-1 tracking-widest">Desarrollo</span>
                                <p className="text-xs text-slate-700 font-medium whitespace-pre-line">{typeof ej.dosificacion === 'string' ? '-' : (ej.dosificacion?.desarrollo || '-')}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center opacity-50 text-center py-12">
                        <Dumbbell className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-sm font-bold text-slate-500">No hay ejercicios en este bloque</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4"><Calendar className="w-8 h-8 text-slate-400" /></div>
                  <h3 className="text-lg font-bold text-slate-800">El tapiz está vacío</h3>
                  <p className="text-sm text-slate-500 mt-2 max-w-sm">No hay ninguna clase asignada a este grupo para la fecha seleccionada.</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
              <button onClick={() => setModalAbierto(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cerrar Ventana</button>
              <button onClick={irAlConstructor} className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition-colors flex items-center gap-2">
                {sesionSeleccionadaModal ? <><Edit3 className="w-4 h-4"/> Editar en Constructor</> : <><PlusCircle className="w-4 h-4"/> Armar Sesión Ahora</>}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
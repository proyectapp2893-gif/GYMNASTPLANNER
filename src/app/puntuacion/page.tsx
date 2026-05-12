"use client"

import { useState, useEffect, useCallback, type ComponentType } from 'react'
import { supabase } from '../../lib/supabase'
import { useClubStore } from '../../../store/useClubStore' // 🔥 NUEVO: Importamos nuestra memoria central
import { Trophy, Medal, PlusCircle, Save, Loader2, CheckCircle2, XCircle, Award, ChevronRight } from 'lucide-react'
import type { Atleta, Competencia, Grupo, Puntuacion } from '../../lib/types'

// =========================================================================
// 🔥 ICONOS GIMNÁSTICOS PERSONALIZADOS (SVGs Puros)
// Dibujados exactamente como en tu captura de pantalla
// =========================================================================
const IconSalto = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 18h16" />
    <path d="M8 18v-6" />
    <path d="M16 18v-6" />
    <rect x="4" y="8" width="16" height="4" rx="1.5" />
  </svg>
)

const IconBarras = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 20h4" />
    <path d="M7 20v-8" />
    <path d="M4 12h6" />
    <path d="M15 20h4" />
    <path d="M17 20V4" />
    <path d="M14 4h6" />
    <path d="M7 14l10-8" strokeDasharray="3 3" strokeWidth="1.5" />
  </svg>
)

const IconViga = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="8" width="18" height="4" rx="1.5" />
    <path d="M7 12v6" />
    <path d="M4 18h6" />
    <path d="M17 12v6" />
    <path d="M14 18h6" />
  </svg>
)

const IconSuelo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="7,6 22,6 17,18 2,18" />
    <path d="M12 9v6M9 12h6" />
  </svg>
)

const APARATOS = ['Salto', 'Barras', 'Viga', 'Suelo'] as const
type Aparato = typeof APARATOS[number]
type NotaAparato = Record<Aparato, { d: string, e: string }>

export default function Puntuacion() {
  const { clubId } = useClubStore() // 🔥 NUEVO: Extraemos el ID del club activo

  const [competencias, setCompetencias] = useState<Competencia[]>([])
  const [competenciaActiva, setCompetenciaActiva] = useState<Competencia | null>(null)
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [grupoSeleccionado, setGrupoSeleccionado] = useState('')
  const [atletas, setAtletas] = useState<Atleta[]>([])
  const [atletaSeleccionada, setAtletaSeleccionada] = useState<Atleta | null>(null)
  
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [notificacion, setNotificacion] = useState({ mostrar: false, mensaje: '', tipo: '' })

  const [mostrarNuevoEvento, setMostrarNuevoEvento] = useState(false)
  const [nuevoEvento, setNuevoEvento] = useState({ nombre: '', fecha: '', tipo: 'Control Interno' })

  const [sistemaJueceo, setSistemaJueceo] = useState<'USAG' | 'FIG'>('USAG')

  const aparatos = APARATOS

  const crearNotasVacias = useCallback((): NotaAparato => ({
    'Salto': { d: sistemaJueceo === 'USAG' ? '10.000' : '', e: '' },
    'Barras': { d: sistemaJueceo === 'USAG' ? '10.000' : '', e: '' },
    'Viga': { d: sistemaJueceo === 'USAG' ? '10.000' : '', e: '' },
    'Suelo': { d: sistemaJueceo === 'USAG' ? '10.000' : '', e: '' }
  }), [sistemaJueceo])

  const [notas, setNotas] = useState<NotaAparato>({
    'Salto': { d: '10.000', e: '' },
    'Barras': { d: '10.000', e: '' },
    'Viga': { d: '10.000', e: '' },
    'Suelo': { d: '10.000', e: '' }
  })

  // Mapeamos los aparatos con nuestros nuevos SVGs dibujados
  const apparatusIcons: Record<Aparato, ComponentType<{ className?: string }>> = {
    'Salto': IconSalto,
    'Barras': IconBarras,
    'Viga': IconViga,
    'Suelo': IconSuelo
  };

  const cargarCompetencias = useCallback(async () => {
    if (!clubId) return // 🔥 Doble seguridad
    // 🔥 NUEVO: Filtramos competencias por club_id
    const { data } = await supabase.from('competencias').select('*').eq('club_id', clubId).order('fecha', { ascending: false })
    const competenciasClub = (data || []) as Competencia[]
    setCompetencias(competenciasClub)
    if (competenciasClub.length > 0 && !competenciaActiva) setCompetenciaActiva(competenciasClub[0])
  }, [clubId, competenciaActiva])

  const cargarGrupos = useCallback(async () => {
    if (!clubId) return // 🔥 Doble seguridad
    // 🔥 NUEVO: Filtramos grupos por club_id
    const { data } = await supabase.from('grupos').select('*').eq('club_id', clubId)
    setGrupos((data || []) as Grupo[])
  }, [clubId])

  useEffect(() => {
    // 🔥 NUEVO: Solo cargamos datos si ya tenemos el clubId
    if (clubId) {
      void cargarCompetencias()
      void cargarGrupos()
    }
  }, [clubId, cargarCompetencias, cargarGrupos]) // 🔥 NUEVO: Dependencia actualizada

  useEffect(() => {
    if (!grupoSeleccionado || !clubId) return
    const cargarAtletas = async () => {
      setCargando(true)
      // Nota: Como los grupos ya están filtrados, los atletas de este grupo pertenecen a este club
      const { data } = await supabase.from('atletas').select('*').eq('grupo_id', grupoSeleccionado).eq('club_id', clubId).order('nombre')
      setAtletas((data || []) as Atleta[])
      setAtletaSeleccionada(null)
      setCargando(false)
    }
    cargarAtletas()
  }, [clubId, grupoSeleccionado])

  useEffect(() => {
    if (atletaSeleccionada && competenciaActiva) {
      const cargarNotasExistentes = async () => {
        const { data } = await supabase
          .from('puntuaciones')
          .select('*')
          .eq('competencia_id', competenciaActiva.id)
          .eq('atleta_id', atletaSeleccionada.id)

        if (data && data.length > 0) {
          setNotas(() => {
            const notasRestauradas = crearNotasVacias()
            ;(data as Puntuacion[]).forEach((p) => {
              if (APARATOS.includes(p.aparato as Aparato)) {
                notasRestauradas[p.aparato as Aparato] = { d: String(p.nota_d ?? ''), e: String(p.nota_e ?? '') }
              }
            })
            return notasRestauradas
          })
        } else {
          setNotas(crearNotasVacias())
        }
      }
      cargarNotasExistentes()
    }
  }, [atletaSeleccionada, competenciaActiva, crearNotasVacias])

  const mostrarToast = (mensaje: string, tipo: 'exito' | 'error') => {
    setNotificacion({ mostrar: true, mensaje, tipo })
    setTimeout(() => setNotificacion({ mostrar: false, mensaje: '', tipo: '' }), 3500)
  }

  const crearCompetencia = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clubId) return mostrarToast('Error: No se ha detectado el club activo', 'error') // 🔥 NUEVO

    try {
      // 🔥 NUEVO: Agregamos club_id al registro del evento
      const { error } = await supabase.from('competencias').insert([{
        nombre: nuevoEvento.nombre, 
        fecha: nuevoEvento.fecha, 
        tipo: nuevoEvento.tipo,
        club_id: clubId 
      }])
      if (error) throw error
      mostrarToast('Evento creado exitosamente', 'exito')
      setMostrarNuevoEvento(false)
      void cargarCompetencias()
    } catch (error) {
      console.error(error)
      mostrarToast('Error al crear el evento', 'error')
    }
  }

  const calcularNotaFinal = (aparato: Aparato) => {
    const n = notas[aparato]
    const d = parseFloat(n.d) || 0
    const e = parseFloat(n.e) || 0

    if (sistemaJueceo === 'USAG') {
      const final = d - e
      return final < 0 ? 0 : final
    } else {
      return d + e
    }
  }

  const calcularAllAround = () => {
    return aparatos.reduce((total, aparato) => total + calcularNotaFinal(aparato), 0)
  }

  const manejarCambioNota = (aparato: Aparato, campo: 'd' | 'e', valor: string) => {
    setNotas(prev => ({ ...prev, [aparato]: { ...prev[aparato], [campo]: valor } }))
  }

  const guardarPuntuaciones = async () => {
    if (!atletaSeleccionada || !competenciaActiva) return
    setGuardando(true)

    try {
      const puntuacionesArray: Puntuacion[] = aparatos.map(aparato => ({
        competencia_id: competenciaActiva.id,
        atleta_id: atletaSeleccionada.id,
        aparato: aparato,
        nota_d: parseFloat(notas[aparato].d) || 0,
        nota_e: parseFloat(notas[aparato].e) || 0,
        nota_final: calcularNotaFinal(aparato)
      }))

      const { error } = await supabase.from('puntuaciones').upsert(puntuacionesArray, { onConflict: 'competencia_id, atleta_id, aparato' })
      if (error) throw error

      mostrarToast('¡Puntuaciones guardadas con éxito! 🏆', 'exito')
    } catch (error) {
      console.error(error)
      mostrarToast('Error al guardar las puntuaciones', 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    // 🔥 FONDO OSCURO DE LA APLICACIÓN
    <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans relative bg-slate-950 min-h-screen">
      {notificacion.mostrar && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-[100] ${notificacion.tipo === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {notificacion.tipo === 'error' ? <XCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          <span className="font-bold">{notificacion.mensaje}</span>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-white">
          <Trophy className="w-8 h-8 text-amber-500" /> Puntuación y Jueceo
        </h1>
        <p className="text-slate-400 mt-2 font-medium">Módulo de Scoring Oficial para Competencias, Festivales y Controles Técnicos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* 🔥 PANELES IZQUIERDOS BLANCOS (Como en tu diseño) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Evento Activo</h2>
              <button onClick={() => setMostrarNuevoEvento(!mostrarNuevoEvento)} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded-full transition-colors"><PlusCircle className="w-5 h-5" /></button>
            </div>
            
            {mostrarNuevoEvento && (
              <form onSubmit={crearCompetencia} className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4 flex flex-col gap-3 animate-in fade-in zoom-in-95">
                <input required type="text" placeholder="Nombre (Ej. Copa CSJB)" value={nuevoEvento.nombre} onChange={e=>setNuevoEvento({...nuevoEvento, nombre: e.target.value})} className="w-full p-2.5 text-sm rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 font-bold" />
                <input required type="date" value={nuevoEvento.fecha} onChange={e=>setNuevoEvento({...nuevoEvento, fecha: e.target.value})} className="w-full p-2.5 text-sm rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900" />
                <select value={nuevoEvento.tipo} onChange={e=>setNuevoEvento({...nuevoEvento, tipo: e.target.value})} className="w-full p-2.5 text-sm rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 font-medium">
                  <option value="Control Interno">Control Interno</option>
                  <option value="Competencia Oficial">Competencia Oficial</option>
                  <option value="Festival">Festival</option>
                </select>
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold text-sm py-2.5 rounded-lg hover:bg-indigo-700 shadow-sm">Crear Evento</button>
              </form>
            )}

            <select value={competenciaActiva?.id || ''} onChange={(e) => setCompetenciaActiva(competencias.find(c => c.id === e.target.value) || null)} className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-black text-slate-800 cursor-pointer shadow-sm text-sm uppercase">
              {competencias.length === 0 && <option disabled>No hay eventos...</option>}
              {competencias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex-1">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Filtrar por Grupo</label>
            <select value={grupoSeleccionado} onChange={(e) => setGrupoSeleccionado(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-800 cursor-pointer mb-5 shadow-sm text-sm">
              <option value="" disabled>Selecciona un grupo...</option>
              {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre} ({g.nivel})</option>)}
            </select>

            <h3 className="font-black text-slate-800 mb-3 text-sm tracking-tight">Roster de Jueceo</h3>
            {cargando ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div>
            ) : atletas.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium text-center p-4 bg-slate-50 rounded-lg border border-slate-100">Selecciona un grupo para ver a las gimnastas.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
                {atletas.map(a => (
                  <button 
                    key={a.id} 
                    onClick={() => setAtletaSeleccionada(a)}
                    className={`text-left px-4 py-3.5 rounded-xl text-sm font-black transition-all border flex items-center justify-between ${atletaSeleccionada?.id === a.id ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'}`}
                  >
                    {a.nombre}
                    {atletaSeleccionada?.id === a.id && <ChevronRight className="w-4 h-4 text-amber-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          {atletaSeleccionada && competenciaActiva ? (
            <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
              
              {/* 🔥 CABECERA OSCURA DEL PANEL DERECHO */}
              <div className="p-6 md:p-8 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="text-3xl font-black">{atletaSeleccionada.nombre}</h2>
                  <div className="flex gap-2 mt-2">
                    <span className="bg-white/10 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase text-slate-300">{competenciaActiva.nombre}</span>
                    <span className="bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase">Jueceo en Vivo</span>
                  </div>
                </div>

                <div className="bg-slate-800 p-1.5 rounded-xl flex items-center border border-slate-700 shadow-inner">
                  <button onClick={() => setSistemaJueceo('USAG')} className={`px-6 py-2.5 rounded-lg text-xs tracking-wider font-black transition-all ${sistemaJueceo === 'USAG' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'}`}>USAG</button>
                  <button onClick={() => setSistemaJueceo('FIG')} className={`px-6 py-2.5 rounded-lg text-xs tracking-wider font-black transition-all ${sistemaJueceo === 'FIG' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'}`}>FIG / LIBRE</button>
                </div>
              </div>

              {/* 🔥 CONTENEDOR DE APARATOS CON FONDO BLANCO */}
              <div className="p-6 md:p-8 bg-white rounded-t-[2.5rem] flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {aparatos.map((aparato) => {
                    const ApparatusIcon = apparatusIcons[aparato];
                    return (
                      <div key={aparato} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col transition-all hover:-translate-y-1">
                        <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                          <ApparatusIcon className="w-5 h-5 text-indigo-500" /> {aparato}
                        </h3>
                        
                        <div className="space-y-4 flex-1">
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                              {sistemaJueceo === 'USAG' ? 'Valor Partida (SV)' : 'Dificultad (D)'}
                            </label>
                            <input 
                              type="number" step="0.05"
                              value={notas[aparato].d} 
                              onChange={(e) => manejarCambioNota(aparato, 'd', e.target.value)}
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-indigo-700 text-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                              {sistemaJueceo === 'USAG' ? 'Deducciones' : 'Ejecución (E)'}
                            </label>
                            <input 
                              type="number" step="0.05"
                              value={notas[aparato].e} 
                              onChange={(e) => manejarCambioNota(aparato, 'e', e.target.value)}
                              placeholder="0.000"
                              className="w-full p-3 bg-slate-50 border border-rose-100 rounded-xl font-black text-rose-600 text-lg focus:ring-2 focus:ring-rose-400 outline-none transition-all placeholder:text-slate-300"
                            />
                          </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nota Final</span>
                          <span className="text-2xl font-black text-slate-800">{calcularNotaFinal(aparato).toFixed(3)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 🔥 PANEL RESUMEN ALL-AROUND EN NEGRO ÉLITE */}
                <div className="mt-8 bg-[#0f1115] rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between shadow-xl">
                  <div className="flex items-center gap-5 mb-6 md:mb-0">
                    <div className="bg-amber-500 p-4 rounded-2xl shadow-lg shadow-amber-500/20"><Medal className="w-8 h-8 text-white" /></div>
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">All-Around (AA)</p>
                      <p className="text-5xl font-black text-white tracking-tighter">{calcularAllAround().toFixed(3)}</p>
                    </div>
                  </div>
                  
                  <button onClick={guardarPuntuaciones} disabled={guardando} className={`px-8 py-4 rounded-2xl font-black flex items-center gap-3 transition-all ${guardando ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-[#00c885] text-slate-950 hover:bg-[#00e599] hover:scale-105 shadow-[0_0_20px_rgba(0,200,133,0.3)]'}`}>
                    {guardando ? <><Loader2 className="w-5 h-5 animate-spin" /> Registrando...</> : <><Save className="w-5 h-5" /> Guardar Notas Oficiales</>}
                  </button>
                </div>

              </div>
            </div>
          ) : (
            <div className="bg-slate-900 p-12 rounded-3xl shadow-sm border-2 border-dashed border-slate-800 text-center flex flex-col items-center justify-center h-full min-h-[500px]">
              <div className="bg-slate-800 p-6 rounded-full mb-6 border border-slate-700"><Award className="w-16 h-16 text-amber-500" /></div>
              <h3 className="text-2xl font-black text-slate-300 mb-2">Panel de Jueceo</h3>
              <p className="text-slate-500 max-w-md font-medium">Crea un evento y selecciona a una gimnasta del panel izquierdo para comenzar a registrar sus puntuaciones oficiales USAG o FIG.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

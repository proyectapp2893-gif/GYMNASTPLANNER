"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Trophy, Medal, Search, Award, Loader2, RefreshCw, Filter, Activity } from 'lucide-react'
import { useClubStore } from '../../../store/useClubStore'
import { supabase } from '../../lib/supabase'
import type { Competencia, Puntuacion } from '../../lib/types'

const LISTA_APARATOS = ['Salto', 'Barras', 'Viga', 'Suelo'] as const
type AparatoRanking = typeof LISTA_APARATOS[number]
type FiltroAparato = AparatoRanking | 'All-Around'

interface AtletaRankingInfo {
  nombre: string
  nivel: string
}

interface ResultadoRanking {
  id: string
  nombre: string
  nivel: string
  totalAA: number
  notas: Record<AparatoRanking, number>
}

export default function RankingEnVivo() {
  const { clubId, nombreClub } = useClubStore()
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [nivelFiltro, setNivelFiltro] = useState('Todos')
  const [aparatoFiltro, setAparatoFiltro] = useState<FiltroAparato>('All-Around') // 🔥 NUEVO FILTRO POR APARATO

  const [competencias, setCompetencias] = useState<Competencia[]>([])
  const [competenciaActiva, setCompetenciaActiva] = useState<string>('')
  const [resultados, setResultados] = useState<ResultadoRanking[]>([])
  const [nivelesDisponibles, setNivelesDisponibles] = useState<string[]>([])

  const listaAparatos = LISTA_APARATOS

  useEffect(() => {
    const cargarCompetencias = async () => {
      if (!clubId) return
      const { data } = await supabase.from('competencias').select('*').eq('club_id', clubId).order('fecha', { ascending: false })
      const competenciasClub = (data || []) as Competencia[]
      if (competenciasClub.length > 0) {
        setCompetencias(competenciasClub)
        setCompetenciaActiva(competenciasClub[0].id) 
      } else {
        setCargando(false)
      }
    }
    cargarCompetencias()
  }, [clubId])

  const cargarResultados = useCallback(async () => {
    if (!clubId || !competenciaActiva) return
    setCargando(true)
    try {
      // 🔥 AHORA TAMBIÉN PEDIMOS EL APARATO
      const { data: puntuaciones, error: errPuntuaciones } = await supabase
        .from('puntuaciones')
        .select('nota_final, atleta_id, aparato')
        .eq('competencia_id', competenciaActiva)

      if (errPuntuaciones) throw errPuntuaciones

      if (puntuaciones && puntuaciones.length > 0) {
        const puntuacionesCompetencia = puntuaciones as Puntuacion[]
        const idsAtletas = [...new Set(puntuacionesCompetencia.map(p => p.atleta_id).filter(Boolean))]

        const { data: atletas, error: errAtletas } = await supabase
          .from('atletas')
          .select('id, nombre, grupo_id')
          .eq('club_id', clubId)
          .in('id', idsAtletas)

        if (errAtletas) throw errAtletas

        const idsGrupos = [...new Set(atletas?.map(a => a.grupo_id).filter(Boolean))]
        const infoGrupos: Record<string, string> = {}
        
        if (idsGrupos.length > 0) {
          const { data: grupos } = await supabase.from('grupos').select('id, nivel').eq('club_id', clubId).in('id', idsGrupos)
          if (grupos) grupos.forEach(g => { infoGrupos[g.id] = g.nivel })
        }

        const diccionarioAtletas: Record<string, AtletaRankingInfo> = {}
        const nivelesSet = new Set<string>()

        if (atletas) {
          atletas.forEach(a => {
            const nivelReal = a.grupo_id ? infoGrupos[a.grupo_id] || 'General' : 'General'
            diccionarioAtletas[a.id] = { nombre: a.nombre, nivel: nivelReal }
            nivelesSet.add(nivelReal)
          })
        }

        setNivelesDisponibles(nivelesSet.size > 0 ? Array.from(nivelesSet) : ['General'])

        // 🔥 NUEVA LÓGICA: GUARDAMOS NOTAS INDIVIDUALES POR APARATO
        const acumuladoPorAtleta: Record<string, ResultadoRanking> = {}

        puntuacionesCompetencia.forEach((p) => {
          const idAtleta = p.atleta_id
          if (!idAtleta) return 

          const info = diccionarioAtletas[idAtleta] || { nombre: 'Gimnasta', nivel: 'General' }

          if (!acumuladoPorAtleta[idAtleta]) {
            acumuladoPorAtleta[idAtleta] = {
              id: idAtleta,
              nombre: info.nombre,
              nivel: info.nivel,
              totalAA: 0,
              notas: { 'Salto': 0, 'Barras': 0, 'Viga': 0, 'Suelo': 0 }
            }
          }
          
          const nota = Number(p.nota_final) || 0
          acumuladoPorAtleta[idAtleta].totalAA += nota
          if (LISTA_APARATOS.includes(p.aparato as AparatoRanking)) {
            acumuladoPorAtleta[idAtleta].notas[p.aparato as AparatoRanking] = nota
          }
        })

        setResultados(Object.values(acumuladoPorAtleta))
      } else {
         setResultados([])
         setNivelesDisponibles([])
      }
    } catch (error) {
      console.error("❌ Error al calcular:", error)
      setResultados([])
    } finally {
      setCargando(false)
    }
  }, [clubId, competenciaActiva])

  useEffect(() => {
    if (competenciaActiva) void cargarResultados()
  }, [competenciaActiva, cargarResultados])

  // 🔥 OBTENER PUNTAJE DINÁMICO (Dependiendo del filtro)
  const getPuntaje = useCallback((gimnasta: ResultadoRanking) => {
    if (aparatoFiltro === 'All-Around') return gimnasta.totalAA
    return gimnasta.notas[aparatoFiltro]
  }, [aparatoFiltro])

  // 🔥 LÓGICA DE FILTRADO Y ORDENAMIENTO DINÁMICO
  const rankingFiltrado = useMemo(() => [...resultados]
    .filter(r => (nivelFiltro === 'Todos' || r.nivel === nivelFiltro))
    .filter(r => r.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    .sort((a, b) => getPuntaje(b) - getPuntaje(a)), [busqueda, getPuntaje, nivelFiltro, resultados]) // Ordena basado en lo que el usuario quiere ver

  const podio = rankingFiltrado.slice(0, 3)

  return (
    <div className="p-3 md:p-6 lg:p-8 font-sans bg-slate-50 min-h-screen">
      
      {/* CABECERA DEL EVENTO RESPONSIVA */}
      <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden mb-6 md:mb-8 flex flex-col xl:flex-row justify-between items-center gap-6">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none translate-x-1/4 -translate-y-1/4">
          <Trophy className="w-48 h-48 md:w-64 md:h-64" />
        </div>
        
        <div className="relative z-10 text-center xl:text-left w-full xl:w-auto">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] md:text-xs font-black uppercase tracking-widest mb-3 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Panel en Vivo
          </span>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight mb-2">Central de Resultados</h1>
          <p className="text-xs md:text-sm text-slate-400 font-medium">Análisis de Competencia • {nombreClub}</p>
        </div>

        <div className="relative z-10 w-full xl:w-auto flex flex-col sm:flex-row gap-3">
          <select 
            value={competenciaActiva}
            onChange={(e) => setCompetenciaActiva(e.target.value)}
            className="w-full sm:w-64 bg-slate-800 text-white border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer truncate"
          >
            {competencias.length > 0 ? (
              competencias.map(comp => <option key={comp.id} value={comp.id}>{comp.nombre}</option>)
            ) : (
              <option value="">Sin eventos activos</option>
            )}
          </select>
          <button onClick={cargarResultados} disabled={cargando || !competenciaActiva} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-lg shadow-indigo-500/25">
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* 🏆 EL PODIO 3D DINÁMICO (Versión Indestructible) 🏆 */}
      {!cargando && podio.length > 0 && (
        <div className="mb-12 mt-12 pt-16">
          <div className="flex justify-center items-end max-w-4xl mx-auto h-64 md:h-72 gap-2 md:gap-4 px-2">
            
            {/* PLATA (2do Lugar) */}
            <div className={`w-1/3 flex flex-col items-center justify-end h-full relative transition-opacity duration-300 ${podio[1] ? 'opacity-100' : 'opacity-40'}`}>
              {podio[1] && (
                <div className="absolute bottom-[58%] w-full flex flex-col items-center pb-3">
                  <Medal className="w-10 h-10 text-slate-300 drop-shadow-md mb-1" fill="#cbd5e1" />
                  <p className="font-black text-slate-800 text-center text-xs sm:text-sm leading-tight truncate w-full px-1">{podio[1]?.nombre}</p>
                  <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{podio[1]?.nivel}</p>
                  <div className="bg-slate-800 text-white text-xs md:text-sm font-black px-3 py-1 rounded-full mt-1.5 shadow-md">{getPuntaje(podio[1]).toFixed(3)}</div>
                </div>
              )}
              <div className="w-full bg-gradient-to-t from-slate-300 to-slate-200 h-[55%] rounded-t-lg border-x border-t border-slate-300 shadow-inner flex justify-center pt-3 md:pt-4">
                <span className="text-3xl md:text-4xl font-black text-slate-400 opacity-50">2</span>
              </div>
            </div>

            {/* ORO (1er Lugar) */}
            <div className="w-1/3 flex flex-col items-center justify-end h-full relative z-10 transition-opacity duration-300 opacity-100">
              {podio[0] && (
                <div className="absolute bottom-[83%] w-full flex flex-col items-center pb-3">
                  <Trophy className="w-12 h-12 md:w-16 md:h-16 text-amber-400 drop-shadow-xl mb-1" fill="#fbbf24" />
                  <p className="font-black text-slate-900 text-center text-sm md:text-lg leading-tight truncate w-full px-1">{podio[0]?.nombre}</p>
                  <p className="text-[9px] md:text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-0.5">{podio[0]?.nivel}</p>
                  <div className="bg-amber-400 text-amber-900 text-sm md:text-base font-black px-4 py-1 rounded-full mt-1.5 shadow-lg">{getPuntaje(podio[0]).toFixed(3)}</div>
                </div>
              )}
              <div className="w-full bg-gradient-to-t from-amber-300 to-amber-200 h-[80%] rounded-t-xl border-x border-t border-amber-400 shadow-[0_10px_30px_-10px_rgba(251,191,36,0.5)] flex justify-center pt-3 md:pt-5 transform sm:scale-105">
                <span className="text-4xl md:text-5xl font-black text-amber-500 opacity-60">1</span>
              </div>
            </div>

            {/* BRONCE (3er Lugar) */}
            <div className={`w-1/3 flex flex-col items-center justify-end h-full relative transition-opacity duration-300 ${podio[2] ? 'opacity-100' : 'opacity-40'}`}>
              {podio[2] && (
                <div className="absolute bottom-[38%] w-full flex flex-col items-center pb-3">
                  <Medal className="w-9 h-9 md:w-10 md:h-10 text-orange-400 drop-shadow-md mb-1" fill="#fb923c" />
                  <p className="font-black text-slate-800 text-center text-xs sm:text-sm leading-tight truncate w-full px-1">{podio[2]?.nombre}</p>
                  <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{podio[2]?.nivel}</p>
                  <div className="bg-slate-800 text-white text-xs md:text-sm font-black px-3 py-1 rounded-full mt-1.5 shadow-md">{getPuntaje(podio[2]).toFixed(3)}</div>
                </div>
              )}
              <div className="w-full bg-gradient-to-t from-orange-300 to-orange-200 h-[35%] rounded-t-lg border-x border-t border-orange-300 shadow-inner flex justify-center pt-2 md:pt-3">
                <span className="text-2xl md:text-3xl font-black text-orange-400 opacity-50">3</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CONTROLES Y TABLA GENERAL DETALLADA */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        
        {/* BARRA DE FILTROS SUPERIOR */}
        <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
            <h3 className="font-black text-slate-800 text-lg flex items-center gap-2 whitespace-nowrap">
              <Award className="w-5 h-5 text-indigo-500" /> Clasificación 
              <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md text-sm">{aparatoFiltro}</span>
            </h3>
            
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 pl-0 sm:pl-4">
              {/* FILTRO: NIVEL */}
              <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg flex-1 sm:flex-none">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select value={nivelFiltro} onChange={(e) => setNivelFiltro(e.target.value)} className="bg-transparent text-xs md:text-sm font-bold text-slate-700 outline-none cursor-pointer w-full">
                  <option value="Todos">Todos los Niveles</option>
                  {nivelesDisponibles.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              {/* FILTRO: APARATO */}
              <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg flex-1 sm:flex-none">
                <Activity className="w-3.5 h-3.5 text-rose-400" />
                <select value={aparatoFiltro} onChange={(e) => setAparatoFiltro(e.target.value as FiltroAparato)} className="bg-transparent text-xs md:text-sm font-bold text-rose-600 outline-none cursor-pointer w-full">
                  <option value="All-Around">All-Around (AA)</option>
                  {listaAparatos.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* BUSCADOR */}
          <div className="w-full lg:w-64 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar gimnasta..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-slate-700"
            />
          </div>
        </div>

        {/* TABLA RESPONSIVA CON SCROLL HORIZONTAL */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="p-4 pl-6 w-16 text-center">Pos</th>
                <th className="p-4">Gimnasta / Nivel</th>
                {listaAparatos.map(aparato => (
                  <th key={aparato} className={`p-4 text-center ${aparatoFiltro === aparato ? 'bg-rose-50 text-rose-600' : ''}`}>
                    {aparato}
                  </th>
                ))}
                <th className={`p-4 pr-6 text-right ${aparatoFiltro === 'All-Around' ? 'bg-indigo-50 text-indigo-600' : ''}`}>
                  All-Around
                </th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-400">Analizando rendimientos...</p>
                  </td>
                </tr>
              ) : rankingFiltrado.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                    No se encontraron resultados con estos filtros.
                  </td>
                </tr>
              ) : (
                rankingFiltrado.map((gimnasta, index) => {
                  const posicion = index + 1;
                  
                  return (
                    <tr key={gimnasta.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group">
                      <td className="p-4 pl-6 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                          posicion === 1 ? 'bg-amber-100 text-amber-600' :
                          posicion === 2 ? 'bg-slate-200 text-slate-600' :
                          posicion === 3 ? 'bg-orange-100 text-orange-600' :
                          'bg-slate-100 text-slate-400 group-hover:bg-white'
                        }`}>
                          {posicion}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800 text-sm">{gimnasta.nombre}</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5">{gimnasta.nivel}</div>
                      </td>
                      
                      {/* CELDAS DINÁMICAS POR APARATO */}
                      {listaAparatos.map(aparato => {
                        const notaAparato = gimnasta.notas[aparato]
                        const estaFiltrado = aparatoFiltro === aparato
                        return (
                          <td key={aparato} className={`p-4 text-center font-medium text-sm ${estaFiltrado ? 'bg-rose-50/50 text-rose-700 font-black' : 'text-slate-500'}`}>
                            {notaAparato > 0 ? notaAparato.toFixed(3) : <span className="text-slate-300">-</span>}
                          </td>
                        )
                      })}

                      {/* CELDA TOTAL ALL-AROUND */}
                      <td className={`p-4 pr-6 text-right ${aparatoFiltro === 'All-Around' ? 'bg-indigo-50/50' : ''}`}>
                        <span className={`text-base font-black ${aparatoFiltro === 'All-Around' ? 'text-indigo-700' : 'text-slate-700'}`}>
                          {gimnasta.totalAA.toFixed(3)}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

"use client"

import { useState, useEffect, useMemo } from 'react'
import { LineChart, Line, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { BrainCircuit, TrendingUp, Target, Download, Activity, AlertTriangle, CheckCircle2, Filter, Users, Dumbbell } from 'lucide-react'
import { useClubStore } from '../../../store/useClubStore'
import { supabase } from '../../lib/supabase'

export default function AnalisisPremium() {
  const { clubId, nombreClub, logoUrl } = useClubStore() 
  const [cargando, setCargando] = useState(true)
  
  const [atletas, setAtletas] = useState<any[]>([])
  const [atletaActiva, setAtletaActiva] = useState<any>(null)
  
  const [nivelFiltro, setNivelFiltro] = useState('Todos')
  const [nivelesDisponibles, setNivelesDisponibles] = useState<string[]>([])

  const [historial, setHistorial] = useState<any[]>([])
  const [promediosAparatos, setPromediosAparatos] = useState<any[]>([])
  const [diagnosticoIA, setDiagnosticoIA] = useState<any>(null)

  // 1. CARGAR ATLETAS Y NIVELES
  useEffect(() => {
    const cargarDatosBase = async () => {
      if (!clubId) return
      setCargando(true)
      try {
        const { data: datosAtletas, error: errAtletas } = await supabase.from('atletas').select('id, nombre, grupo_id').order('nombre')
        if (errAtletas) throw errAtletas

        const { data: datosGrupos, error: errGrupos } = await supabase.from('grupos').select('id, nivel')
        if (errGrupos) throw errGrupos

        if (datosAtletas && datosGrupos) {
          const mapGrupos: Record<string, string> = {}
          datosGrupos.forEach(g => { mapGrupos[g.id] = g.nivel })

          const nivelesSet = new Set<string>()
          const atletasConNivel = datosAtletas.map(a => {
            const nivelReal = mapGrupos[a.grupo_id] || 'General'
            nivelesSet.add(nivelReal)
            return { ...a, nivel: nivelReal }
          })

          setAtletas(atletasConNivel)
          setNivelesDisponibles(Array.from(nivelesSet))
          
          // Por defecto arranca mostrando el promedio de todos
          setAtletaActiva({ id: 'equipo', nombre: `🌟 Promedio del Equipo (Todos)` })
        }
      } catch (error) {
        console.error("❌ Error al cargar datos base:", error)
      } finally {
        setCargando(false)
      }
    }
    cargarDatosBase()
  }, [clubId])

  const atletasFiltrados = useMemo(() => {
    return nivelFiltro === 'Todos' ? atletas : atletas.filter(a => a.nivel === nivelFiltro)
  }, [atletas, nivelFiltro])

  // 2. CARGAR HISTORIAL (INDIVIDUAL O GRUPAL)
  useEffect(() => {
    if (!atletaActiva || atletasFiltrados.length === 0) return
    
    const cargarHistorial = async () => {
      setCargando(true)
      try {
        const { data: competencias, error: errComp } = await supabase.from('competencias').select('id, nombre, fecha').eq('club_id', clubId).order('fecha', { ascending: true })
        if (errComp) throw errComp

        const mapCompetencias: Record<string, any> = {}
        competencias?.forEach(c => { mapCompetencias[c.id] = c })

        // 🔥 LÓGICA INTELIGENTE: Si es equipo, traemos notas de todas las niñas del filtro. Si es individual, solo de ella.
        let query = supabase.from('puntuaciones').select('competencia_id, aparato, nota_final, atleta_id')
        
        if (atletaActiva.id === 'equipo') {
          const ids = atletasFiltrados.map(a => a.id)
          if (ids.length === 0) { setHistorial([]); setCargando(false); return }
          query = query.in('atleta_id', ids)
        } else {
          query = query.eq('atleta_id', atletaActiva.id)
        }

        const { data: puntuaciones, error: errPunt } = await query
        if (errPunt) throw errPunt

        if (!puntuaciones || puntuaciones.length === 0) {
          setHistorial([]); setPromediosAparatos([]); setDiagnosticoIA(null); setCargando(false); return
        }

        const agrupado: Record<string, any> = {}
        
        puntuaciones.forEach(p => {
          const compId = p.competencia_id
          if (!mapCompetencias[compId]) return 

          if (!agrupado[compId]) {
            const fechaObj = new Date(mapCompetencias[compId].fecha)
            agrupado[compId] = {
              fechaOriginal: mapCompetencias[compId].fecha,
              nombre: mapCompetencias[compId].nombre,
              etiquetaX: `${fechaObj.getDate()}/${fechaObj.getMonth() + 1} - ${mapCompetencias[compId].nombre}`,
              notas: { Salto: [], Barras: [], Viga: [], Suelo: [] }, // Guardamos en arreglos para poder promediar
              aaPorAtleta: {} // Para calcular el All-Around perfecto
            }
          }
          
          const nota = Number(p.nota_final) || 0
          const ap = p.aparato

          if (ap && agrupado[compId].notas[ap]) {
            agrupado[compId].notas[ap].push(nota)
          }

          const atlId = p.atleta_id || 'indiv'
          if (!agrupado[compId].aaPorAtleta[atlId]) agrupado[compId].aaPorAtleta[atlId] = 0
          agrupado[compId].aaPorAtleta[atlId] += nota
        })

        // Procesamos los promedios finales por competencia
        const historialArray = Object.values(agrupado).map(comp => {
          const avg = (arr: number[]) => arr.length ? arr.reduce((a,b) => a+b, 0) / arr.length : 0
          const aaVals = Object.values(comp.aaPorAtleta) as number[]
          const avgAA = aaVals.length ? aaVals.reduce((a,b) => a+b, 0) / aaVals.length : 0

          return {
            ...comp,
            totalAA: avgAA,
            Salto: avg(comp.notas.Salto),
            Barras: avg(comp.notas.Barras),
            Viga: avg(comp.notas.Viga),
            Suelo: avg(comp.notas.Suelo)
          }
        }).sort((a: any, b: any) => new Date(a.fechaOriginal).getTime() - new Date(b.fechaOriginal).getTime())
        
        if (historialArray.length === 0) {
          setHistorial([]); setDiagnosticoIA(null); setCargando(false); return
        }

        // Promedios globales para el Radar (El promedio de los promedios de las competencias)
        let sumSalto = 0, sumBarras = 0, sumViga = 0, sumSuelo = 0
        historialArray.forEach((h: any) => {
          sumSalto += h.Salto; sumBarras += h.Barras; sumViga += h.Viga; sumSuelo += h.Suelo;
        })
        const numComps = historialArray.length || 1 
        
        const radarData = [
          { aparato: 'Salto', nota: Number((sumSalto / numComps).toFixed(2)), fullMark: 10 },
          { aparato: 'Barras', nota: Number((sumBarras / numComps).toFixed(2)), fullMark: 10 },
          { aparato: 'Viga', nota: Number((sumViga / numComps).toFixed(2)), fullMark: 10 },
          { aparato: 'Suelo', nota: Number((sumSuelo / numComps).toFixed(2)), fullMark: 10 }
        ]

        setHistorial(historialArray)
        setPromediosAparatos(radarData)
        generarDiagnosticoIA(radarData, historialArray)

      } catch (error) {
        console.error("❌ Error en el historial:", error)
      } finally {
        setCargando(false)
      }
    }

    cargarHistorial()
  }, [atletaActiva, clubId, atletasFiltrados])

  const generarDiagnosticoIA = (radarData: any[], historialArray: any[]) => {
    const aparatoMasDebil = radarData.reduce((prev, curr) => (prev.nota < curr.nota ? prev : curr))
    const aparatoFuerte = radarData.reduce((prev, curr) => (prev.nota > curr.nota ? prev : curr))
    
    let tendenciaAA = "Estabilidad Técnica"
    if (historialArray.length >= 2) {
      const primerAA = historialArray[0].totalAA
      const ultimoAA = historialArray[historialArray.length - 1].totalAA
      if (ultimoAA > primerAA + 0.3) tendenciaAA = "Progresión Positiva"
      if (ultimoAA < primerAA - 0.3) tendenciaAA = "Fase de Ajuste (Descenso)"
    }

    const sujetoTexto = atletaActiva?.id === 'equipo' ? `del equipo de ${nivelFiltro}` : `de ${atletaActiva?.nombre}`;

    setDiagnosticoIA({
      sujeto: sujetoTexto,
      aparatoDebil: aparatoMasDebil.aparato,
      notaDebil: aparatoMasDebil.nota,
      aparatoFuerte: aparatoFuerte.aparato,
      tendencia: tendenciaAA,
      recomendacionMacro: `Incrementar carga técnica específica (15-20%) en ${aparatoMasDebil.aparato} durante la fase de Preparación Especial. Priorizar volumen sobre intensidad.`,
      recomendacionFisica: aparatoMasDebil.aparato === 'Salto' || aparatoMasDebil.aparato === 'Suelo' 
        ? 'Protocolo de potencia pliométrica y reactividad neuromuscular enfocado en tren inferior.' 
        : 'Énfasis en estabilización lumbopélvica (Core) y propiocepción articular.'
    })
  }

  const exportarPDF = () => { window.print() }

  const manejarCambioNivel = (nuevoNivel: string) => {
    setNivelFiltro(nuevoNivel)
    // Al cambiar de nivel, autoseleccionamos el promedio de ese nuevo nivel
    setAtletaActiva({ id: 'equipo', nombre: ` Promedio del Equipo (${nuevoNivel})` })
  }

  // Combinamos la opción del equipo con las atletas reales
  const opcionesMostradas = useMemo(() => {
    return [{ id: 'equipo', nombre: ` Promedio del Equipo (${nivelFiltro})` }, ...atletasFiltrados]
  }, [atletasFiltrados, nivelFiltro])

  return (
    <div className="p-3 md:p-6 lg:p-8 font-sans bg-slate-50 min-h-screen relative contenedor-principal-pdf">
      
      {/* ========================================================= */}
      {/* 📄 ENCABEZADO EXCLUSIVO PARA IMPRESIÓN (PDF) 📄 */}
      {/* ========================================================= */}
      <div className="hidden print:flex flex-col mb-4 border-b-4 border-indigo-600 pb-4 w-full">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            {logoUrl && logoUrl !== '/default-club-logo.png' ? (
               <img src={logoUrl} alt="Logo" className="w-14 h-14 object-contain" />
            ) : (
               <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center text-white"><Dumbbell size={28} /></div>
            )}
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gymnast<span className="text-indigo-600">Planner</span></h1>
              <p className="text-xs font-bold text-slate-500">{nombreClub}</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Reporte Oficial de Rendimiento</h2>
            <p className="text-xs font-bold text-slate-500">Documento Generado Analíticamente</p>
          </div>
        </div>
        
        <div className="flex justify-between items-end bg-slate-50 p-3 rounded-2xl border border-slate-200">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
              {atletaActiva?.id === 'equipo' ? 'Análisis Grupal' : 'Gimnasta Evaluada'}
            </p>
            <p className="text-2xl font-black text-slate-900 leading-none">{atletaActiva?.nombre}</p>
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mt-1">
              {atletaActiva?.id === 'equipo' ? nivelFiltro : atletaActiva?.nivel}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Fecha de Emisión</p>
            <p className="text-base font-black text-slate-800 leading-none">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
      {/* ========================================================= */}

      {/* CABECERA PREMIUM (Solo en pantalla) */}
      <div className="bg-[#0a0f1c] rounded-3xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden mb-6 md:mb-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border border-slate-800 print:hidden">
        <div className="absolute -right-20 -top-20 opacity-5 pointer-events-none hidden md:block">
          <BrainCircuit className="w-96 h-96" />
        </div>
        
        <div className="relative z-10 w-full xl:w-auto">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] md:text-xs font-black uppercase tracking-widest mb-3 border border-indigo-500/30">
            Análisis de Rendimiento
          </span>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight mb-2">Diagnóstico Técnico</h1>
          <p className="text-xs md:text-sm text-slate-400 font-medium">Modelado de progresión deportiva • {nombreClub}</p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row flex-wrap gap-3 w-full xl:w-auto bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl w-full sm:w-auto focus-within:ring-2 ring-indigo-500 transition-all">
            <Filter className="w-4 h-4 text-slate-400" />
            <select className="bg-transparent text-white text-sm md:text-base outline-none font-bold w-full sm:w-32 cursor-pointer appearance-none" value={nivelFiltro} onChange={(e) => manejarCambioNivel(e.target.value)}>
              <option value="Todos">Todos (Niveles)</option>
              {nivelesDisponibles.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl w-full sm:w-auto flex-1 focus-within:ring-2 ring-indigo-500 transition-all">
            <Users className="w-4 h-4 text-indigo-400" />
            <select 
              className="bg-transparent text-white text-sm md:text-base outline-none font-bold w-full cursor-pointer appearance-none truncate" 
              value={atletaActiva?.id || ''} 
              onChange={(e) => setAtletaActiva(opcionesMostradas.find(a => a.id === e.target.value))} 
              disabled={cargando || opcionesMostradas.length === 0}
            >
              {opcionesMostradas.length === 0 && <option disabled>Sin atletas...</option>}
              {opcionesMostradas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>

          <button onClick={exportarPDF} disabled={cargando || historial.length === 0} className="bg-white text-slate-900 px-6 py-2.5 rounded-xl font-black flex justify-center items-center gap-2 hover:bg-slate-200 disabled:opacity-50 transition-colors shadow-lg w-full sm:w-auto">
            <Download className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

      {/* ÁREA DE CONTENIDO */}
      {!cargando && historial.length > 0 && diagnosticoIA ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 print-grid">
          
          {/* GRÁFICO 1: EVOLUCIÓN HISTÓRICA */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm print:shadow-none print:border-slate-300 print:break-inside-avoid">
            <h3 className="text-base md:text-lg font-black text-slate-800 tracking-tight flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-indigo-500" /> Trayectoria All-Around (AA)
            </h3>
            <div className="h-[220px] w-full print:h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historial} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="etiquetaX" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis domain={['auto', 'auto']} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }} itemStyle={{ color: '#0f172a', fontWeight: 'black' }} />
                  <Line type="monotone" dataKey="totalAA" name="Puntaje AA" stroke="#6366f1" strokeWidth={4} dot={{ r: 5, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GRÁFICO 2: BALANCE DE APARATOS */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm print:shadow-none print:border-slate-300 print:break-inside-avoid">
            <h3 className="text-base md:text-lg font-black text-slate-800 tracking-tight flex items-center gap-2 mb-1">
              <Target className="w-5 h-5 text-rose-500" /> Modelado Biomecánico
            </h3>
            <p className="text-[10px] text-slate-500 font-medium mb-2">
              {atletaActiva?.id === 'equipo' ? 'Promedio de eficiencia técnica del equipo.' : `Mapeo de eficiencia técnica histórica de ${atletaActiva?.nombre}.`}
            </p>
            
            <div className="h-[220px] w-full print:h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={promediosAparatos} startAngle={90} endAngle={-270}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="aparato" tick={{ fill: '#0f172a', fontSize: 11, fontWeight: 900 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 'bold' }} axisLine={false} />
                  <Radar name={atletaActiva?.nombre} dataKey="nota" stroke="#f43f5e" strokeWidth={3} fill="#f43f5e" fillOpacity={0.3} dot={{ r: 4, fill: '#f43f5e' }} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* INSIGHTS IA */}
          <div className="bg-slate-900 rounded-3xl p-5 text-white shadow-xl border border-slate-800 print:break-inside-avoid print:bg-white print:text-black print:border-slate-300 print:shadow-none">
            <div className="flex items-center gap-3 mb-4 border-b border-slate-700 print:border-slate-200 pb-3">
              <div className="bg-indigo-500 p-2 rounded-lg print:bg-indigo-100"><BrainCircuit className="w-5 h-5 text-white print:text-indigo-600" /></div>
              <div>
                <h4 className="font-black text-sm md:text-base tracking-tight">Ajuste Técnico</h4>
                <p className="text-[9px] text-indigo-300 font-bold uppercase tracking-wider print:text-slate-500">Inferencia Estratégica</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 print:text-indigo-600">Evaluación del Sistema</p>
                <p className="text-xs font-medium leading-relaxed">
                  Tendencia de rendimiento: <strong className={diagnosticoIA.tendencia === 'Progresión Positiva' ? 'text-emerald-400 print:text-emerald-600' : 'text-amber-400 print:text-amber-600'}>{diagnosticoIA.tendencia}</strong>.<br/>
                  Eficiencia Máxima: <strong className="text-white print:text-slate-900">{diagnosticoIA.aparatoFuerte}</strong>.<br/>
                  Déficit Técnico: <strong className="text-rose-400 print:text-rose-600">{diagnosticoIA.aparatoDebil}</strong> (Promedio: {diagnosticoIA.notaDebil}).
                </p>
              </div>

              <div className="bg-slate-800/50 print:bg-slate-50 rounded-xl p-3 border border-slate-700 print:border-slate-200">
                <p className="text-[9px] font-black text-amber-400 print:text-amber-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" /> Prescripción de Macrociclo
                </p>
                <p className="text-xs font-bold text-slate-200 print:text-slate-700">{diagnosticoIA.recomendacionMacro}</p>
              </div>

              <div className="bg-slate-800/50 print:bg-slate-50 rounded-xl p-3 border border-slate-700 print:border-slate-200">
                <p className="text-[9px] font-black text-emerald-400 print:text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Activity className="w-3 h-3" /> Prescripción Física
                </p>
                <p className="text-xs font-bold text-slate-200 print:text-slate-700">{diagnosticoIA.recomendacionFisica}</p>
              </div>
            </div>
          </div>

          {/* TABLA RESUMEN HISTÓRICO COMPACTA */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm print:break-inside-avoid print:shadow-none print:border-slate-300 flex flex-col">
             <h4 className="font-black text-slate-800 mb-3 flex items-center gap-2 text-sm md:text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Registro Cuantitativo Promedio
             </h4>
             <div className="flex-1 space-y-2 overflow-y-auto pr-2 print:overflow-visible">
                {historial.map((comp, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-100 print:border-slate-200 print:bg-white">
                    <div>
                      <p className="font-bold text-slate-800 text-xs truncate w-32 sm:w-48">{comp.nombre}</p>
                      <p className="text-[8px] font-black text-slate-400 uppercase">{new Date(comp.fechaOriginal).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-indigo-600 text-sm">{comp.totalAA.toFixed(3)}</p>
                      <p className="text-[7px] font-bold text-slate-400 uppercase">AA</p>
                    </div>
                  </div>
                ))}
             </div>
          </div>

        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 print:hidden shadow-sm">
          {cargando ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
              <h3 className="text-lg md:text-xl font-black text-slate-700">Calculando métricas del equipo...</h3>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center p-6">
              <div className="bg-slate-100 p-4 rounded-full mb-4">
                <Target className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg md:text-xl font-black text-slate-700">Falta Volumen de Datos</h3>
              <p className="text-sm text-slate-500 font-medium max-w-sm mt-2">
                {atletaActiva 
                  ? `El Algoritmo Predictivo requiere al menos un registro oficial en competencia para generar el diagnóstico técnico.` 
                  : 'Aún no tienes gimnastas en este nivel.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 🔥 CSS SÚPER AGRESIVO PARA MATAR EL SIDEBAR EN EL PDF 🔥 */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body, html { background-color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
          @page { margin: 1.2cm; size: A4 portrait; }
          aside, nav, [class*="w-64"], header, button { display: none !important; width: 0 !important; visibility: hidden !important; }
          main, body > div, #__next, .contenedor-principal-pdf { display: block !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; flex: none !important; }
          .print-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 1.5rem !important; }
          .overflow-y-auto { overflow: visible !important; max-height: none !important; }
          .print\\:break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
        }
      `}} />
    </div>
  )
}
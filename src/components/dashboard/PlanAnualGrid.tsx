"use client"

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Settings2, MapPin, CalendarDays } from 'lucide-react'

export default function PlanAnualGrid({ configuracion, onSeleccionarSemana, semanaSeleccionada }: any) {
  const [verPeriodos, setVerPeriodos] = useState(true)
  const [verEtapas, setVerEtapas] = useState(true)
  const [verMesociclos, setVerMesociclos] = useState(true)
  const [verMicrociclos, setVerMicrociclos] = useState(true)

  // 🔥 LÓGICA DINÁMICA CORREGIDA: Sincronizada de Lunes a Lunes
  const semanaRealActual = useMemo(() => {
    if (!configuracion || !configuracion.fecha_inicio) return 1;

    const hoy = new Date();
    hoy.setHours(12, 0, 0, 0);

    const inicio = new Date(configuracion.fecha_inicio + 'T12:00:00');

    // 1. Encontrar el Lunes de la semana en que inició el Macrociclo
    const diaInicio = inicio.getDay();
    const restarInicio = diaInicio === 0 ? 6 : diaInicio - 1; // 0 es Domingo
    const lunesInicio = new Date(inicio);
    lunesInicio.setDate(inicio.getDate() - restarInicio);

    // 2. Encontrar el Lunes de la semana actual (Hoy)
    const diaHoy = hoy.getDay();
    const restarHoy = diaHoy === 0 ? 6 : diaHoy - 1;
    const lunesHoy = new Date(hoy);
    lunesHoy.setDate(hoy.getDate() - restarHoy);

    // 3. Diferencia exacta en días entre ambos Lunes
    const diffTime = lunesHoy.getTime() - lunesInicio.getTime();
    // Usamos Math.round para evitar bugs con el cambio de horario de verano (Daylight Saving Time)
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 

    const semanaCalculada = Math.floor(diffDays / 7) + 1;

    if (semanaCalculada < 1) return 1;
    if (semanaCalculada > configuracion.semanas_totales) return configuracion.semanas_totales;

    return semanaCalculada;
  }, [configuracion]);

  const { semanas, meses } = useMemo(() => {
    if (!configuracion || configuracion.semanas_totales <= 0) return { semanas: [], meses: [] }
    
    const sems = Array.from({ length: configuracion.semanas_totales }, (_, i) => i + 1)
    const arrMeses: { nombre: string; span: number }[] = []
    
    let fechaActual = new Date(configuracion.fecha_inicio + 'T12:00:00') 
    
    for (let i = 0; i < configuracion.semanas_totales; i++) {
      const nombreMes = fechaActual.toLocaleString('es-ES', { month: 'short' })
      const lastMes = arrMeses[arrMeses.length - 1]
      if (lastMes && lastMes.nombre === nombreMes) {
        lastMes.span += 1
      } else {
        arrMeses.push({ nombre: nombreMes, span: 1 })
      }
      fechaActual.setDate(fechaActual.getDate() + 7)
    }
    return { semanas: sems, meses: arrMeses }
  }, [configuracion])

  if (!configuracion || configuracion.semanas_totales <= 0) return null

  const total = configuracion.semanas_totales || 1 
  const anchoPrep = (configuracion.semanas_preparatorio / total) * 100
  const anchoComp = (configuracion.semanas_competitivo / total) * 100
  
  const semGral = Math.round(configuracion.semanas_preparatorio * 0.6)
  const semEsp = configuracion.semanas_preparatorio - semGral
  const semPreComp = Math.round(configuracion.semanas_competitivo * 0.5)
  const semComp = configuracion.semanas_competitivo - semPreComp

  const anchoGral = (semGral / total) * 100
  const anchoEsp = (semEsp / total) * 100
  const anchoPreComp = (semPreComp / total) * 100
  const anchoCompFase = (semComp / total) * 100

  const semEntrante = Math.max(1, Math.round(semGral * 0.3))
  const semBasicoDes = semGral - semEntrante
  const semBasicoEst = Math.max(1, Math.round(semEsp * 0.6))
  const semControl = semEsp - semBasicoEst
  const semPulimiento = semPreComp
  const semCompetitivoMeso = Math.max(1, Math.round(semComp * 0.7))
  const semRestablecimiento = semComp - semCompetitivoMeso

  const wEntrante = (semEntrante / total) * 100
  const wBasicoDes = (semBasicoDes / total) * 100
  const wBasicoEst = (semBasicoEst / total) * 100
  const wControl = (semControl / total) * 100
  const wPulimiento = (semPulimiento / total) * 100
  const wCompetitivoMeso = (semCompetitivoMeso / total) * 100
  const wRestablecimiento = (semRestablecimiento / total) * 100

  const manejarClicSemana = (semana: number) => {
    if (!onSeleccionarSemana) return
    let objetivo = 'Preparación General'
    let mesocicloNombre = 'Entrante'

    if (semana <= semEntrante) { objetivo = 'Preparación General'; mesocicloNombre = 'Entrante' }
    else if (semana <= semGral) { objetivo = 'Preparación General'; mesocicloNombre = 'Básico Desarrollador' }
    else if (semana <= semGral + semBasicoEst) { objetivo = 'Preparación Especial'; mesocicloNombre = 'Básico Estabilizador' }
    else if (semana <= semGral + semEsp) { objetivo = 'Preparación Especial'; mesocicloNombre = 'Control y Prep.' }
    else if (semana <= semGral + semEsp + semPreComp) { objetivo = 'Pre-Competitiva'; mesocicloNombre = 'Pulimiento' }
    else if (semana <= total - semRestablecimiento) { objetivo = 'Competitiva'; mesocicloNombre = 'Competitivo' }
    else { objetivo = 'Competitiva'; mesocicloNombre = 'Restablecimiento' }

    onSeleccionarSemana(semana, `${objetivo} (${mesocicloNombre})`)
  }

  const TituloFila = ({ titulo, estado, setEstado }: any) => (
    <div onClick={() => setEstado(!estado)} className="w-36 flex-shrink-0 text-xs font-bold text-slate-700 flex items-center cursor-pointer hover:text-indigo-600 bg-slate-50 border-r border-slate-200 p-1 transition-colors select-none">
      {estado ? <ChevronDown className="w-4 h-4 mr-1 text-slate-400"/> : <ChevronRight className="w-4 h-4 mr-1 text-slate-400"/>}
      {titulo}
    </div>
  )

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 font-sans overflow-hidden mb-8 print:hidden">
      
      <div className="bg-[#0a0f1c] px-6 py-4 flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-bold text-white tracking-tight">Macrociclo Anual ({configuracion.semanas_totales} Semanas)</h2>
        </div>
      </div>

      <div className="overflow-x-auto p-4 hide-scrollbar">
        <div className="min-w-[1000px] border border-slate-200 rounded-lg pb-1">
          
          <div className="flex border-b border-slate-200 bg-slate-50">
            {/* Espaciador decorativo */}
            <div className="w-36 flex-shrink-0 border-r border-slate-200 flex items-center justify-center bg-slate-100/50">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                 <CalendarDays className="w-3 h-3" /> Calendario
               </span>
            </div>
            <div className="flex-1">
              <div className="flex border-b border-slate-200">
                {meses.map((mes, idx) => (
                  <div key={idx} className="text-center font-bold text-slate-600 text-[11px] py-1 uppercase border-l border-slate-200 first:border-0" style={{ width: `${(mes.span / total) * 100}%` }}>{mes.nombre}</div>
                ))}
              </div>
              
              <div className="flex gap-[1px] bg-slate-200 mt-3 relative">
                {semanas.map((semana) => {
                  const esLaVidaReal = semana === semanaRealActual;
                  return (
                    <div key={semana} className={`flex-1 text-center text-[10px] font-bold py-0.5 relative z-20 ${esLaVidaReal ? 'text-rose-700 bg-rose-100 rounded-t-sm border-t border-rose-400' : 'text-slate-500 bg-white'}`}>
                      {esLaVidaReal && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[8px] font-black uppercase tracking-widest px-1.5 py-[1px] rounded shadow-sm flex items-center justify-center gap-0.5 whitespace-nowrap">
                          HOY
                        </div>
                      )}
                      {semana}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex border-b border-slate-100 min-h-[32px]">
            <TituloFila titulo="PERIODOS" estado={verPeriodos} setEstado={setVerPeriodos} />
            {verPeriodos && (
              <div className="flex-1 flex gap-1 p-1">
                {anchoPrep > 0 && <div className="bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center rounded shadow-sm overflow-hidden" style={{ width: `${anchoPrep}%` }}>PREPARATORIO</div>}
                {anchoComp > 0 && <div className="bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center rounded shadow-sm overflow-hidden" style={{ width: `${anchoComp}%` }}>COMPETITIVO</div>}
              </div>
            )}
          </div>

          <div className="flex border-b border-slate-100 min-h-[32px]">
            <TituloFila titulo="ETAPAS" estado={verEtapas} setEstado={setVerEtapas} />
            {verEtapas && (
              <div className="flex-1 flex gap-1 p-1 text-[9px] font-bold text-slate-800">
                {anchoGral > 0 && <div className="bg-slate-200 flex items-center justify-center rounded border border-slate-300 overflow-hidden" style={{ width: `${anchoGral}%` }}>P. General</div>}
                {anchoEsp > 0 && <div className="bg-slate-300 flex items-center justify-center rounded border border-slate-400 overflow-hidden" style={{ width: `${anchoEsp}%` }}>P. Especial</div>}
                {anchoPreComp > 0 && <div className="bg-rose-100 text-rose-800 flex items-center justify-center rounded border border-rose-300 overflow-hidden" style={{ width: `${anchoPreComp}%` }}>Pre-Comp</div>}
                {anchoCompFase > 0 && <div className="bg-rose-200 text-rose-900 flex items-center justify-center rounded border border-rose-400 overflow-hidden" style={{ width: `${anchoCompFase}%` }}>Competitiva</div>}
              </div>
            )}
          </div>

          <div className="flex border-b border-slate-100 min-h-[36px]">
            <TituloFila titulo="MESOCICLOS" estado={verMesociclos} setEstado={setVerMesociclos} />
            {verMesociclos && (
              <div className="flex-1 flex gap-1 p-1 text-[9px] font-bold text-slate-700 text-center leading-tight">
                {wEntrante > 0 && <div className="bg-white flex items-center justify-center rounded border-2 border-slate-200 overflow-hidden px-1" style={{ width: `${wEntrante}%` }}>Entrante</div>}
                {wBasicoDes > 0 && <div className="bg-white flex items-center justify-center rounded border-2 border-slate-200 overflow-hidden px-1" style={{ width: `${wBasicoDes}%` }}>Básico Desarrollador</div>}
                {wBasicoEst > 0 && <div className="bg-white flex items-center justify-center rounded border-2 border-slate-200 overflow-hidden px-1" style={{ width: `${wBasicoEst}%` }}>Básico Estabilizador</div>}
                {wControl > 0 && <div className="bg-white flex items-center justify-center rounded border-2 border-slate-200 overflow-hidden px-1" style={{ width: `${wControl}%` }}>Control y Prep.</div>}
                {wPulimiento > 0 && <div className="bg-white flex items-center justify-center rounded border-2 border-slate-200 overflow-hidden px-1" style={{ width: `${wPulimiento}%` }}>Pulimiento</div>}
                {wCompetitivoMeso > 0 && <div className="bg-white flex items-center justify-center rounded border-2 border-slate-200 overflow-hidden px-1" style={{ width: `${wCompetitivoMeso}%` }}>Competitivo</div>}
                {wRestablecimiento > 0 && <div className="bg-white flex items-center justify-center rounded border-2 border-slate-200 overflow-hidden px-1" style={{ width: `${wRestablecimiento}%` }}>Restablecim.</div>}
              </div>
            )}
          </div>

          <div className="flex min-h-[36px]">
            <TituloFila titulo="MICROCICLOS" estado={verMicrociclos} setEstado={setVerMicrociclos} />
            {verMicrociclos && (
              <div className="flex-1 flex gap-[2px] p-1 relative overflow-visible">
                {semanas.map((semana) => {
                  let bgColor = 'bg-[#34d399]' // Verde Ajuste
                  let tipo = 'A' 

                  if (semana % 4 === 0) { 
                    bgColor = 'bg-[#60a5fa]'; // Azul Recuperación
                    tipo = 'R'; 
                  } else if (semana > semGral + semEsp) {
                    bgColor = 'bg-[#a78bfa]'; // Morado Aproximación
                    tipo = 'AP';
                  } else if (semana % 3 === 0) {
                    bgColor = 'bg-[#f43f5e]'; // Rojo Choque
                    tipo = 'CH';
                  } else {
                    bgColor = 'bg-[#fbbf24]'; // Amarillo Carga
                    tipo = 'C';
                  }

                  const isSeleccionada = semanaSeleccionada === semana;
                  const esLaVidaReal = semana === semanaRealActual;
                  
                  let anilloEstilo = 'border border-black/10 hover:scale-110 hover:ring-2 hover:ring-slate-400 z-10';
                  
                  if (isSeleccionada) {
                    anilloEstilo = 'ring-[3px] ring-indigo-600 ring-offset-1 scale-[1.15] shadow-xl outline-none z-30';
                  } else if (esLaVidaReal) {
                    anilloEstilo = 'ring-2 ring-rose-500 ring-offset-0 border border-white scale-105 shadow-md z-20';
                  }

                  return (
                    <div 
                      key={semana} 
                      onClick={() => manejarClicSemana(semana)}
                      className={`
                        flex-1 rounded-sm ${bgColor} hover:opacity-75 transition-all cursor-pointer 
                        flex items-center justify-center text-[10px] font-black text-white relative
                        ${anilloEstilo}
                      `} 
                      title={`Planificar Semana ${semana}`}
                    >
                       {tipo}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  )
}
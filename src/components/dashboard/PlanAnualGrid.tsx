"use client"

import { useState, useMemo, type Dispatch, type SetStateAction } from 'react'
import { ChevronDown, ChevronRight, Settings2, CalendarDays } from 'lucide-react'
import { calculateCurrentWeek, getTotalWeeks, getWeekPlan, MICRO_CYCLE_STYLE, type PlanningConfig } from '../../lib/sports-planning'

type TituloFilaProps = {
  titulo: string
  estado: boolean
  setEstado: Dispatch<SetStateAction<boolean>>
}

type PlanAnualGridProps = {
  configuracion: PlanningConfig
  onSeleccionarSemana?: (semana: number, objetivo: string) => void
  semanaSeleccionada?: number
}

function TituloFila({ titulo, estado, setEstado }: TituloFilaProps) {
  return (
    <div onClick={() => setEstado(!estado)} className="w-36 flex-shrink-0 text-xs font-bold text-slate-700 flex items-center cursor-pointer hover:text-indigo-600 bg-slate-50 border-r border-slate-200 p-1 transition-colors select-none">
      {estado ? <ChevronDown className="w-4 h-4 mr-1 text-slate-400"/> : <ChevronRight className="w-4 h-4 mr-1 text-slate-400"/>}
      {titulo}
    </div>
  )
}

function contiguousSegments(values: string[]) {
  return values.reduce<Array<{ label: string; count: number }>>((segments, label) => {
    const last = segments[segments.length - 1]
    if (last?.label === label) last.count += 1
    else segments.push({ label, count: 1 })
    return segments
  }, [])
}

function periodForStage(stage: string) {
  if (stage === 'Competitiva' || stage === 'Pre-Competitiva') return 'Competitivo'
  if (stage === 'Recuperación' || stage === 'Transición') return 'Recuperación'
  if (stage === 'Continuidad') return 'Continuidad'
  return 'Preparatorio'
}

export default function PlanAnualGrid({ configuracion, onSeleccionarSemana, semanaSeleccionada }: PlanAnualGridProps) {
  const [verPeriodos, setVerPeriodos] = useState(true)
  const [verEtapas, setVerEtapas] = useState(true)
  const [verMesociclos, setVerMesociclos] = useState(true)
  const [verMicrociclos, setVerMicrociclos] = useState(true)

  const semanaRealActual = useMemo(() => {
    return calculateCurrentWeek(configuracion)
  }, [configuracion]);

  const { semanas, meses } = useMemo(() => {
    const totalSemanas = configuracion ? getTotalWeeks(configuracion) : 0
    if (!configuracion || totalSemanas <= 0 || !configuracion.fecha_inicio) return { semanas: [] as number[], meses: [] }
    
    const sems = Array.from({ length: totalSemanas }, (_, i) => i + 1)
    const arrMeses: { nombre: string; span: number }[] = []
    
    const fechaActual = new Date(configuracion.fecha_inicio + 'T12:00:00') 
    
    for (let i = 0; i < totalSemanas; i++) {
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

  if (!configuracion || Number(configuracion.semanas_totales || 0) <= 0) return null

  const total = semanas.length
  const planes = semanas.map(semana => getWeekPlan(configuracion, semana))
  const periodos = contiguousSegments(planes.map(plan => periodForStage(plan.etapa)))
  const etapas = contiguousSegments(planes.map(plan => plan.etapa))
  const mesociclos = contiguousSegments(planes.map(plan => plan.mesociclo))
  const segmentWidth = (count: number) => `${(count / total) * 100}%`

  const manejarClicSemana = (semana: number) => {
    if (!onSeleccionarSemana) return
    onSeleccionarSemana(semana, getWeekPlan(configuracion, semana).objetivo)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 font-sans overflow-hidden mb-8 print:hidden">
      
      <div className="bg-[#0a0f1c] px-6 py-4 flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-bold text-white tracking-tight">Macrociclo Anual ({total} Semanas)</h2>
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
                {periodos.map((item, index) => <div key={index} className={`text-white text-[10px] font-bold flex items-center justify-center rounded shadow-sm overflow-hidden ${item.label === 'Competitivo' ? 'bg-rose-600' : item.label === 'Preparatorio' ? 'bg-slate-800' : item.label === 'Recuperación' ? 'bg-sky-600' : 'bg-indigo-600'}`} style={{ width: segmentWidth(item.count) }} title={item.label}>{item.label.toUpperCase()}</div>)}
              </div>
            )}
          </div>

          <div className="flex border-b border-slate-100 min-h-[32px]">
            <TituloFila titulo="ETAPAS" estado={verEtapas} setEstado={setVerEtapas} />
            {verEtapas && (
              <div className="flex-1 flex gap-1 p-1 text-[9px] font-bold text-slate-800">
                {etapas.map((item, index) => <div key={index} className={`flex items-center justify-center rounded border overflow-hidden ${item.label === 'Competitiva' ? 'bg-rose-200 text-rose-900 border-rose-400' : item.label === 'Pre-Competitiva' ? 'bg-rose-100 text-rose-800 border-rose-300' : item.label === 'Recuperación' || item.label === 'Transición' ? 'bg-sky-100 text-sky-800 border-sky-300' : item.label === 'Continuidad' ? 'bg-indigo-100 text-indigo-800 border-indigo-300' : 'bg-slate-200 border-slate-300'}`} style={{ width: segmentWidth(item.count) }} title={item.label}>{item.label === 'Preparación General' ? 'P. General' : item.label === 'Preparación Especial' ? 'P. Especial' : item.label === 'Pre-Competitiva' ? 'Pre-Comp' : item.label}</div>)}
              </div>
            )}
          </div>

          <div className="flex border-b border-slate-100 min-h-[36px]">
            <TituloFila titulo="MESOCICLOS" estado={verMesociclos} setEstado={setVerMesociclos} />
            {verMesociclos && (
              <div className="flex-1 flex gap-1 p-1 text-[9px] font-bold text-slate-700 text-center leading-tight">
                {mesociclos.map((item, index) => <div key={index} className="bg-white flex items-center justify-center rounded border-2 border-slate-200 overflow-hidden px-1" style={{ width: segmentWidth(item.count) }} title={item.label}>{item.label}</div>)}
              </div>
            )}
          </div>

          <div className="flex min-h-[36px]">
            <TituloFila titulo="MICROCICLOS" estado={verMicrociclos} setEstado={setVerMicrociclos} />
            {verMicrociclos && (
              <div className="flex-1 flex gap-[2px] p-1 relative overflow-visible">
                {semanas.map((semana) => {
                  const planSemana = planes[semana - 1]
                  const bgColor = MICRO_CYCLE_STYLE[planSemana.microciclo].color
                  const tipo = planSemana.microciclo

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
                      title={`Semana ${semana}: ${planSemana.objetivo} · ${MICRO_CYCLE_STYLE[tipo].label}`}
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

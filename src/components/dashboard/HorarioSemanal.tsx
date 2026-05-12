"use client"

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Calendar, Clock, MapPin, Activity } from 'lucide-react'

const DIAS_OFFSET: Record<string, number> = { 'Lunes': 0, 'Martes': 1, 'Miércoles': 2, 'Jueves': 3, 'Viernes': 4, 'Sábado': 5, 'Domingo': 6 }

export interface DiaHorario {
  dia: string
  enfoque?: string | null
  aparatos?: string | null
  lugar?: string | null
  hora?: string | null
}

interface HorarioSemanalProps {
  semanaActual: string
  semanaNum: number
  mesocicloActivo: string
  fechaInicio?: string | null
  horarioPersonalizado?: DiaHorario[] | null
  onSeleccionarDia: (dia: string, enfoque: string, fechaExacta: string, hora: string) => void
}

export default function HorarioSemanal({ semanaActual, semanaNum, mesocicloActivo, fechaInicio, horarioPersonalizado, onSeleccionarDia }: HorarioSemanalProps) {
  const [diaActivo, setDiaActivo] = useState('Lunes')

  const { inicioSemanaDate, rangoFechas } = useMemo(() => {
    const baseDate = fechaInicio ? new Date(`${fechaInicio}T12:00:00`) : new Date()
    baseDate.setHours(12, 0, 0, 0)

    const diaDeLaSemana = baseDate.getDay()
    const diasParaRestar = diaDeLaSemana === 0 ? 6 : diaDeLaSemana - 1 
    
    const lunesBase = new Date(baseDate)
    lunesBase.setDate(baseDate.getDate() - diasParaRestar)
    
    lunesBase.setDate(lunesBase.getDate() + ((semanaNum || 1) - 1) * 7)

    const domingoFin = new Date(lunesBase)
    domingoFin.setDate(lunesBase.getDate() + 6)

    return { 
      inicioSemanaDate: lunesBase, 
      rangoFechas: `${lunesBase.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })} - ${domingoFin.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })}` 
    }
  }, [fechaInicio, semanaNum])

  const calcularFechaDia = useCallback((nombreDia: string) => {
    const offset = DIAS_OFFSET[nombreDia] || 0
    const fecha = new Date(inicioSemanaDate)
    fecha.setDate(fecha.getDate() + offset)
    return fecha
  }, [inicioSemanaDate])

  const diaActivoValido = useMemo(() => {
    if (!horarioPersonalizado || horarioPersonalizado.length === 0) return diaActivo
    return horarioPersonalizado.some(dia => dia.dia === diaActivo) ? diaActivo : horarioPersonalizado[0].dia
  }, [diaActivo, horarioPersonalizado])

  useEffect(() => {
    if (horarioPersonalizado && horarioPersonalizado.length > 0) {
      const d = horarioPersonalizado.find((x) => x.dia === diaActivoValido) || horarioPersonalizado[0]
      const fecha = calcularFechaDia(d.dia).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      onSeleccionarDia(d.dia, d.enfoque || 'Entrenamiento General', fecha.charAt(0).toUpperCase() + fecha.slice(1), d.hora || '')
    }
  }, [calcularFechaDia, diaActivoValido, horarioPersonalizado, onSeleccionarDia])

  const manejarClicDia = (d: DiaHorario) => {
    setDiaActivo(d.dia)
    const fecha = calcularFechaDia(d.dia).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    onSeleccionarDia(d.dia, d.enfoque || 'Entrenamiento General', fecha.charAt(0).toUpperCase() + fecha.slice(1), d.hora || '')
  }

  const colores = ['bg-blue-50 text-blue-700', 'bg-emerald-50 text-emerald-700', 'bg-purple-50 text-purple-700', 'bg-rose-50 text-rose-700', 'bg-amber-50 text-amber-700', 'bg-slate-100 text-slate-800']

  if (!horarioPersonalizado) return null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6 mb-8 w-full print:hidden">
      
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 md:mb-4 gap-4 w-full">
        <div className="flex items-center gap-3 w-full">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shrink-0">
            <Calendar className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base md:text-lg font-bold text-slate-800 truncate">Horario de Entrenamiento</h2>
            <p className="text-xs md:text-sm font-bold text-indigo-600 tracking-wide uppercase truncate">
              {semanaActual} • <span className="text-emerald-600">{mesocicloActivo}</span> <span className="text-slate-400 font-medium lowercase hidden sm:inline-block">({rangoFechas})</span>
            </p>
            <p className="text-[10px] text-slate-400 font-medium sm:hidden">{rangoFechas}</p>
          </div>
        </div>
      </div>

      {/* 🔥 MAGIA VISUAL: py-4, px-2 y -mx-2 le dan "aire" a las tarjetas para que no se corten los bordes al crecer 🔥 */}
      <div className="flex flex-row overflow-x-auto gap-3 md:gap-4 py-4 px-2 -mx-2 snap-x hide-scrollbar w-full items-stretch">
        {horarioPersonalizado.map((dia, idx) => {
          const colorClass = colores[idx % colores.length]
          const isActivo = diaActivoValido === dia.dia
          
          const fechaObj = calcularFechaDia(dia.dia)
          const numDia = fechaObj.getDate()
          const mesCorto = fechaObj.toLocaleDateString('es-ES', { month: 'short' }).substring(0, 3)

          return (
            <div key={idx} onClick={() => manejarClicDia(dia)} 
                 className={`shrink-0 w-[150px] md:w-[170px] lg:w-auto lg:flex-1 snap-center cursor-pointer rounded-xl p-3 md:p-4 border-2 transition-all duration-200 flex flex-col group ${isActivo ? `${colorClass.split(' ')[0]} border-indigo-500 shadow-lg transform md:scale-[1.03] z-10` : 'border-slate-100 bg-slate-50 hover:border-slate-300 opacity-80 hover:opacity-100'}`}>
              
              {/* ENCABEZADO DE LA TARJETA */}
              <div className="flex justify-between items-start gap-2 mb-4 w-full">
                <h3 className={`text-base md:text-lg font-black tracking-tight truncate pt-1 ${isActivo ? colorClass.split(' ')[1] : 'text-slate-700'}`}>
                  {dia.dia}
                </h3>
                
                {/* Caja de fecha */}
                <div className="flex flex-col items-center bg-white/80 px-2 py-1 rounded-lg text-slate-500 shadow-sm border border-black/5 shrink-0 leading-none">
                  <span className="text-xs font-black text-slate-800">{numDia}</span>
                  <span className="text-[8px] font-bold uppercase tracking-widest">{mesCorto}</span>
                </div>
              </div>

              {/* ENFOQUE DEL DÍA */}
              <div className="flex items-start gap-1.5 mb-3 md:mb-4 flex-1">
                <Activity className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isActivo ? colorClass.split(' ')[1] : 'text-slate-400'}`} />
                <p className="text-[11px] md:text-xs font-bold text-slate-600 leading-tight line-clamp-3">
                  {dia.enfoque}
                </p>
              </div>

              {/* ETIQUETAS DE APARATOS */}
              <div className="flex flex-wrap gap-1.5 mb-3 md:mb-4">
                {(dia.aparatos || 'General').split(',').map((aparato: string, index: number) => (
                  <span key={index} className={`px-1.5 md:px-2 py-1 border rounded-md text-[8px] md:text-[9px] font-extrabold uppercase tracking-widest truncate max-w-full ${isActivo ? 'bg-white/90 border-indigo-200 text-indigo-700' : 'bg-slate-200/50 border-slate-200 text-slate-500'}`}>
                    {aparato.trim()}
                  </span>
                ))}
              </div>

              {/* PIE DE TARJETA (HORA Y LUGAR) */}
              <div className="mt-auto pt-2.5 md:pt-3 border-t border-black/5 flex flex-col gap-1.5 w-full">
                <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-semibold text-slate-500 truncate w-full">
                  <Clock className="w-3 h-3 shrink-0" /> 
                  <span className="truncate">{dia.hora}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-semibold text-slate-500 truncate w-full">
                  <MapPin className="w-3 h-3 shrink-0" /> 
                  <span className="truncate">{dia.lugar}</span>
                </div>
              </div>

            </div>
          )
        })}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  )
}

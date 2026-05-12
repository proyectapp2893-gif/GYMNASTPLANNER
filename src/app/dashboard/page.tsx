"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase' 
import { useClubStore } from '../../../store/useClubStore' 
import PlanAnualGrid from '../../components/dashboard/PlanAnualGrid' 
import HorarioSemanal from '../../components/dashboard/HorarioSemanal' 
import ConstructorSesion from '../../components/dashboard/ConstructorSesion' 
import GraficosCarga from '../../components/dashboard/GraficosCarga' 
import { Loader2, LayoutDashboard } from 'lucide-react'
import { calculateCurrentWeek, getWeekPlan, type PlanningConfig } from '../../lib/sports-planning'
import type { Grupo } from '../../lib/types'

type GrupoActivo = Grupo & { nivel: string }
type DiaHorario = { dia: string; [key: string]: unknown }
type ConfiguracionPlanificacion = PlanningConfig & {
  grupo_id?: string
  horario_semanal?: DiaHorario[] | null
}

const COLOMBIA_TIME_ZONE = 'America/Bogota'

function getColombiaDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const get = (type: string) => Number(parts.find(part => part.type === type)?.value)
  return new Date(get('year'), get('month') - 1, get('day'), 12, 0, 0, 0)
}

function getColombiaDayName(date: Date) {
  const raw = new Intl.DateTimeFormat('es-CO', { timeZone: COLOMBIA_TIME_ZONE, weekday: 'long' }).format(date)
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export default function DashboardPlanificacion() {
  const { clubId } = useClubStore() 

  const [grupos, setGrupos] = useState<GrupoActivo[]>([])
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<GrupoActivo | null>(null)
  const [configuracion, setConfiguracion] = useState<ConfiguracionPlanificacion | null>(null)
  const [cargandoConfig, setCargandoConfig] = useState(false)

  const [semanaNum, setSemanaNum] = useState(1)
  const [semanaActual, setSemanaActual] = useState('Semana 1')
  const [objetivoFase, setObjetivoFase] = useState('Desarrollo General')
  const [diaSeleccionado, setDiaSeleccionado] = useState('Lunes')
  const [enfoqueDelDia, setEnfoqueDelDia] = useState('Entrenamiento General')
  const [fechaExactaDia, setFechaExactaDia] = useState('')
  const [horaDia, setHoraDia] = useState('')

  useEffect(() => {
    const cargarGrupos = async () => {
      if (!clubId) return 
      const { data } = await supabase.from('grupos').select('*').eq('club_id', clubId)
      if (data) {
        const gruposActivos = data as GrupoActivo[]
        setGrupos(gruposActivos)
        setGrupoSeleccionado(prev => prev || gruposActivos[0] || null)
      }
    }
    cargarGrupos()
  }, [clubId]) 

  useEffect(() => {
    if (!grupoSeleccionado) return
    const cargarConfiguracion = async () => {
      setCargandoConfig(true)
      try {
        const { data, error } = await supabase.from('configuracion_grupos').select('*').eq('grupo_id', grupoSeleccionado.id).limit(1)
        if (error) throw error
        setConfiguracion(data && data.length > 0 ? data[0] as ConfiguracionPlanificacion : null)
      } catch (error) {
        console.error(error)
        setConfiguracion(null)
      } finally {
        setCargandoConfig(false)
      }
    }
    cargarConfiguracion()
  }, [grupoSeleccionado])

  useEffect(() => {
    if (configuracion && configuracion.fecha_inicio) {
      const hoy = getColombiaDate();
      const semanaCalculada = calculateCurrentWeek(configuracion, hoy)
      const planSemana = getWeekPlan(configuracion, semanaCalculada)

      setSemanaNum(semanaCalculada);
      setSemanaActual(`Semana ${semanaCalculada}`);
      setObjetivoFase(planSemana.objetivo);

      const nombreDiaHoy = getColombiaDayName(hoy);
      
      const entrenaHoy = configuracion.horario_semanal?.find((d) => d.dia === nombreDiaHoy);
      if (entrenaHoy) {
        setDiaSeleccionado(nombreDiaHoy);
      } else {
        setDiaSeleccionado(configuracion.horario_semanal?.[0]?.dia || 'Lunes');
      }
    }
  }, [configuracion]);

  const seleccionarDia = useCallback((dia: string, enfoque: string, fechaExacta: string, hora: string) => {
    setDiaSeleccionado(dia)
    setEnfoqueDelDia(enfoque)
    setFechaExactaDia(fechaExacta)
    setHoraDia(hora)
  }, [])

  return (
    <div className="p-2 md:p-4 font-sans bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Dashboard de Planificación</h1>
          <p className="text-sm text-slate-500 font-medium">Temporada 2026</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto bg-slate-50 p-2 rounded-xl border border-slate-100">
          <label className="text-sm font-bold text-slate-700 pl-2">Grupo Activo:</label>
          <select 
            onChange={(e) => setGrupoSeleccionado(grupos.find(g => g.id === e.target.value) || null)}
            value={grupoSeleccionado?.id || ''}
            className="bg-white border border-slate-300 text-indigo-700 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 block w-full md:w-64 p-2.5 font-bold cursor-pointer shadow-sm outline-none"
          >
            <option value="" disabled>Selecciona un grupo...</option>
            {grupos.map((grupo) => <option key={grupo.id} value={grupo.id}>{grupo.nombre} ({grupo.nivel})</option>)}
          </select>
        </div>
      </div>

      {cargandoConfig ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
      ) : !configuracion && grupoSeleccionado ? (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-xl mb-6 shadow-sm"><h3 className="font-bold text-amber-800">Sin configuración</h3><p className="text-sm text-amber-700">Ve a Configuración para asignar fechas a este equipo.</p></div>
      ) : configuracion && grupoSeleccionado ? (
        <>
          <PlanAnualGrid 
            configuracion={configuracion}
            semanaSeleccionada={semanaNum} 
            onSeleccionarSemana={(semana: number, objetivo: string) => {
              setSemanaNum(semana); setSemanaActual(`Semana ${semana}`); setObjetivoFase(objetivo);
            }} 
          />
          
          <GraficosCarga 
            configuracion={configuracion}
            horarioPersonalizado={configuracion.horario_semanal}
            semanaNum={semanaNum}
            mesocicloActivo={objetivoFase}
          />

          <HorarioSemanal 
            semanaNum={semanaNum}
            semanaActual={semanaActual}
            mesocicloActivo={objetivoFase} 
            diaInicial={diaSeleccionado}
            fechaInicio={configuracion.fecha_inicio}
            horarioPersonalizado={configuracion.horario_semanal}
            onSeleccionarDia={seleccionarDia}
          />
          
          <ConstructorSesion
            grupoId={grupoSeleccionado.id}
            nivelSeleccionado={grupoSeleccionado.nivel}
            semanaActual={semanaActual}
            objetivoFase={objetivoFase}
            diaActivo={diaSeleccionado}
            enfoqueDia={enfoqueDelDia}
            fechaExactaDia={fechaExactaDia}
            horaDia={horaDia} 
          />
        </>
      ) : (
        <div className="text-center py-32 text-slate-400 font-bold bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <LayoutDashboard className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          Selecciona un grupo en el menú superior para iniciar.
        </div>
      )}
    </div>
  )
}

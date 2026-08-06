"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase' 
import { useClubStore } from '../../../store/useClubStore' 
import PlanAnualGrid from '../../components/dashboard/PlanAnualGrid' 
import HorarioSemanal from '../../components/dashboard/HorarioSemanal' 
import ConstructorSesion from '../../components/dashboard/ConstructorSesion' 
import GraficosCarga from '../../components/dashboard/GraficosCarga' 
import { ArrowLeft, CalendarDays, ChevronRight, Clock3, LayoutDashboard, Layers3, Loader2, Settings, Trophy, Users } from 'lucide-react'
import { calculateCurrentWeek, getWeekPlan, type PlanningConfig } from '../../lib/sports-planning'
import type { Grupo } from '../../lib/types'
import Link from 'next/link'

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
  const { clubId,setClubData } = useClubStore()

  const [grupos, setGrupos] = useState<GrupoActivo[]>([])
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<GrupoActivo | null>(null)
  const [configuraciones, setConfiguraciones] = useState<Record<string,ConfiguracionPlanificacion>>({})
  const [configuracion, setConfiguracion] = useState<ConfiguracionPlanificacion | null>(null)
  const [cargandoConfig, setCargandoConfig] = useState(true)

  const [semanaNum, setSemanaNum] = useState(1)
  const [semanaActual, setSemanaActual] = useState('Semana 1')
  const [objetivoFase, setObjetivoFase] = useState('Desarrollo General')
  const [diaSeleccionado, setDiaSeleccionado] = useState('Lunes')
  const [enfoqueDelDia, setEnfoqueDelDia] = useState('Entrenamiento General')
  const [fechaExactaDia, setFechaExactaDia] = useState('')
  const [horaDia, setHoraDia] = useState('')
  const [aparatosDia, setAparatosDia] = useState('')

  useEffect(() => {
    const cargarGrupos = async () => {
      let activeClubId=clubId
      if(!activeClubId){
        const {data:{user}}=await supabase.auth.getUser()
        if(!user){setCargandoConfig(false);return}
        const {data:profile}=await supabase.from('perfiles').select('club_id').eq('id',user.id).maybeSingle()
        activeClubId=profile?.club_id||null
        if(activeClubId){const {data:club}=await supabase.from('clubs').select('nombre,logo_url').eq('id',activeClubId).maybeSingle();setClubData({clubId:activeClubId,nombreClub:club?.nombre||'Club',logoUrl:club?.logo_url||'/default-club-logo.png'})}
      }
      if (!activeClubId) {setCargandoConfig(false);return}
      setCargandoConfig(true)
      const { data } = await supabase.from('grupos').select('*').eq('club_id', activeClubId).order('nivel').order('nombre')
      const gruposActivos = (data || []) as GrupoActivo[]
      setGrupos(gruposActivos)
      const ids=gruposActivos.map(grupo=>grupo.id)
      const {data:planes}=ids.length?await supabase.from('configuracion_grupos').select('*').in('grupo_id',ids):{data:[]}
      const mapa=Object.fromEntries((planes||[]).map(plan=>[String(plan.grupo_id),plan as ConfiguracionPlanificacion]))
      setConfiguraciones(mapa)
      setGrupoSeleccionado(null)
      setConfiguracion(null)
      setCargandoConfig(false)
    }
    void cargarGrupos()
  }, [clubId,setClubData])

  const abrirGrupo = useCallback((grupo:GrupoActivo) => {
    const plan=configuraciones[grupo.id]||null
    setGrupoSeleccionado(grupo)
    setConfiguracion(plan)
    if(plan?.fecha_inicio){
      const hoy=getColombiaDate()
      const semanaCalculada=calculateCurrentWeek(plan,hoy)
      const planSemana=getWeekPlan(plan,semanaCalculada)
      const nombreDiaHoy=getColombiaDayName(hoy)
      const dia=plan.horario_semanal?.find(item=>item.dia===nombreDiaHoy)?.dia||plan.horario_semanal?.[0]?.dia||'Lunes'
      setSemanaNum(semanaCalculada)
      setSemanaActual(`Semana ${semanaCalculada}`)
      setObjetivoFase(planSemana.objetivo)
      setDiaSeleccionado(dia)
    }
  },[configuraciones])

  const volverAGrupos=()=>{setGrupoSeleccionado(null);setConfiguracion(null)}

  const seleccionarDia = useCallback((dia: string, enfoque: string, fechaExacta: string, hora: string, aparatos: string) => {
    setDiaSeleccionado(dia)
    setEnfoqueDelDia(enfoque)
    setFechaExactaDia(fechaExacta)
    setHoraDia(hora)
    setAparatosDia(aparatos)
  }, [])

  return (
    <div className="p-2 md:p-4 font-sans bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-3">{grupoSeleccionado&&<button type="button" onClick={volverAGrupos} className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700" aria-label="Volver a grupos"><ArrowLeft className="h-5 w-5"/></button>}<div><h1 className="text-2xl font-black text-slate-800 tracking-tight">{grupoSeleccionado?'Macrociclo anual':'Dashboard de Planificación'}</h1><p className="text-sm text-slate-500 font-medium">{grupoSeleccionado?`${grupoSeleccionado.nombre} · ${grupoSeleccionado.nivel}`:'Selecciona el grupo que deseas planificar'}</p></div></div>
        </div>
        {grupoSeleccionado?<div className="flex flex-wrap items-center gap-3 w-full md:w-auto bg-slate-50 p-2 rounded-xl border border-slate-100">
          <Link href={`/configuracion?seccion=planificacion&grupo=${grupoSeleccionado.id}`} className="rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-black text-white hover:bg-indigo-700">Configurar grupo</Link>
          <label htmlFor="selector-grupo" className="text-sm font-bold text-slate-700 pl-2 whitespace-nowrap">Cambiar grupo:</label>
          <select 
            id="selector-grupo"
            onChange={(e) => {const grupo=grupos.find(g => g.id === e.target.value);if(grupo)abrirGrupo(grupo)}}
            value={grupoSeleccionado?.id || ''}
            className="bg-white border border-slate-300 text-indigo-700 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 block w-full md:w-64 p-2.5 font-bold cursor-pointer shadow-sm outline-none"
          >
            <option value="" disabled>Selecciona un grupo...</option>
            {grupos.map((grupo) => <option key={grupo.id} value={grupo.id}>{grupo.nombre} ({grupo.nivel})</option>)}
          </select>
        </div>:<span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700"><Users className="h-4 w-4"/>{grupos.length} grupos</span>}
      </div>

      {cargandoConfig ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
      ) : !grupoSeleccionado ? (
        <GroupCards groups={grupos} configurations={configuraciones} onOpen={abrirGrupo}/>
      ) : !configuracion && grupoSeleccionado ? (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-xl mb-6 shadow-sm"><h3 className="font-bold text-amber-800">Macrociclo pendiente de configuración</h3><p className="text-sm text-amber-700">Asigna las fechas y el horario de este grupo para comenzar.</p><div className="mt-4 flex flex-wrap gap-2"><Link href={`/configuracion?seccion=planificacion&grupo=${grupoSeleccionado.id}`} className="inline-flex items-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-sm font-bold text-white"><Settings className="h-4 w-4"/>Configurar este grupo</Link><button type="button" onClick={volverAGrupos} className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-bold text-amber-800"><ArrowLeft className="h-4 w-4"/>Volver a los grupos</button></div></div>
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
            aparatosDia={aparatosDia}
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

function GroupCards({groups,configurations,onOpen}:{groups:GrupoActivo[];configurations:Record<string,ConfiguracionPlanificacion>;onOpen:(group:GrupoActivo)=>void}){
  if(groups.length===0)return <div className="text-center py-32 text-slate-400 font-bold bg-white rounded-3xl border-2 border-dashed border-slate-200"><LayoutDashboard className="w-16 h-16 mx-auto mb-4 text-slate-300"/>No hay grupos creados todavía.</div>
  return <section><div className="mb-5"><p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Macrociclos por grupo</p><h2 className="mt-1 text-xl font-black text-slate-800">Elige una tarjeta para abrir la planificación anual</h2></div><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{groups.map(group=>{const plan=configurations[group.id];return <button type="button" key={group.id} onClick={()=>onOpen(group)} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-indigo-100"><div className={`h-1.5 ${plan?'bg-gradient-to-r from-indigo-500 to-cyan-500':'bg-slate-300'}`}/><div className="p-5"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${plan?'bg-indigo-50 text-indigo-600':'bg-slate-100 text-slate-500'}`}><Layers3 className="h-6 w-6"/></div><div className="min-w-0"><h3 className="truncate text-lg font-black text-slate-900">{group.nombre}</h3><p className="text-sm font-bold text-indigo-600">{group.nivel}</p></div></div><ChevronRight className="mt-2 h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-600"/></div>{plan?<div className="mt-5 grid grid-cols-2 gap-3"><Summary icon={<CalendarDays/>} label="Inicio" value={formatDashboardDate(plan.fecha_inicio)}/><Summary icon={<Trophy/>} label="Competencia" value={formatDashboardDate(plan.fecha_competencia)}/><Summary icon={<Clock3/>} label="Duración" value={`${Number(plan.semanas_totales||0)} semanas`}/><Summary icon={<Users/>} label="Entrenamientos" value={`${plan.horario_semanal?.length||0} días/semana`}/></div>:<div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="text-sm font-black text-amber-800">Configuración pendiente</p><p className="mt-0.5 text-xs text-amber-700">Puedes abrir el grupo y luego asignar sus fechas.</p></div>}<div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${plan?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-500'}`}>{plan?'Macrociclo configurado':'Sin configurar'}</span><span className="text-xs font-black text-indigo-600">Abrir macrociclo</span></div></div></button>})}</div></section>
}

function Summary({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="rounded-xl bg-slate-50 p-3"><div className="flex items-center gap-1.5 text-slate-400 [&_svg]:h-3.5 [&_svg]:w-3.5"><span>{icon}</span><span className="text-[10px] font-black uppercase">{label}</span></div><p className="mt-1 truncate text-xs font-bold text-slate-700">{value}</p></div>}
function formatDashboardDate(value?:string|null){if(!value)return 'Por definir';return new Intl.DateTimeFormat('es-CO',{day:'numeric',month:'short',year:'numeric',timeZone:COLOMBIA_TIME_ZONE}).format(new Date(`${value}T12:00:00-05:00`))}

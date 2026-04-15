"use client"

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase' 
import { useClubStore } from '../../../store/useClubStore' 
import PlanAnualGrid from '../../components/dashboard/PlanAnualGrid' 
import HorarioSemanal from '../../components/dashboard/HorarioSemanal' 
import ConstructorSesion from '../../components/dashboard/ConstructorSesion' 
import GraficosCarga from '../../components/dashboard/GraficosCarga' 
import { Loader2, LayoutDashboard } from 'lucide-react'

export default function DashboardPlanificacion() {
  const { clubId } = useClubStore() 

  const [grupos, setGrupos] = useState<any[]>([])
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<any>(null)
  const [configuracion, setConfiguracion] = useState<any>(null)
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
      if (data) setGrupos(data)
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
        setConfiguracion(data && data.length > 0 ? data[0] : null)
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
      const hoy = new Date();
      hoy.setHours(12, 0, 0, 0); 
      
      const inicioMacro = new Date(`${configuracion.fecha_inicio}T12:00:00`);
      
      const diaSemanaInicio = inicioMacro.getDay();
      const lunesInicio = new Date(inicioMacro);
      lunesInicio.setDate(inicioMacro.getDate() - (diaSemanaInicio === 0 ? 6 : diaSemanaInicio - 1));

      const diaSemanaHoy = hoy.getDay();
      const lunesHoy = new Date(hoy);
      lunesHoy.setDate(hoy.getDate() - (diaSemanaHoy === 0 ? 6 : diaSemanaHoy - 1));

      let semanaCalculada = 1;
      if (lunesHoy >= lunesInicio) {
        const diffTime = lunesHoy.getTime() - lunesInicio.getTime();
        const diffSemanas = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7));
        semanaCalculada = diffSemanas + 1;
      }
      
      if (semanaCalculada > configuracion.semanas_totales) semanaCalculada = configuracion.semanas_totales;
      if (semanaCalculada < 1) semanaCalculada = 1;

      setSemanaNum(semanaCalculada);
      setSemanaActual(`Semana ${semanaCalculada}`);

      const total = configuracion.semanas_totales || 1;
      const semGral = Math.round(configuracion.semanas_preparatorio * 0.6);
      const semEsp = configuracion.semanas_preparatorio - semGral;
      const semPreComp = Math.round(configuracion.semanas_competitivo * 0.5);
      const semComp = configuracion.semanas_competitivo - semPreComp;

      const semEntrante = Math.max(1, Math.round(semGral * 0.3));
      const semBasicoEst = Math.max(1, Math.round(semEsp * 0.6));
      const semRestablecimiento = semComp - Math.max(1, Math.round(semComp * 0.7));

      let objetivo = 'Preparación General';
      let mesocicloNombre = 'Entrante';

      if (semanaCalculada <= semEntrante) {
        objetivo = 'Preparación General'; mesocicloNombre = 'Entrante';
      } else if (semanaCalculada <= semGral) {
        objetivo = 'Preparación General'; mesocicloNombre = 'Básico Desarrollador';
      } else if (semanaCalculada <= semGral + semBasicoEst) {
        objetivo = 'Preparación Especial'; mesocicloNombre = 'Básico Estabilizador';
      } else if (semanaCalculada <= semGral + semEsp) {
        objetivo = 'Preparación Especial'; mesocicloNombre = 'Control y Prep.';
      } else if (semanaCalculada <= semGral + semEsp + semPreComp) {
        objetivo = 'Pre-Competitiva'; mesocicloNombre = 'Pulimiento';
      } else if (semanaCalculada <= total - semRestablecimiento) {
        objetivo = 'Competitiva'; mesocicloNombre = 'Competitivo';
      } else {
        objetivo = 'Competitiva'; mesocicloNombre = 'Restablecimiento';
      }

      setObjetivoFase(`${objetivo} (${mesocicloNombre})`);

      const diasSemanaNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const nombreDiaHoy = diasSemanaNombres[hoy.getDay()];
      
      const entrenaHoy = configuracion.horario_semanal?.find((d: any) => d.dia === nombreDiaHoy);
      if (entrenaHoy) {
        setDiaSeleccionado(nombreDiaHoy);
      } else {
        setDiaSeleccionado(configuracion.horario_semanal?.[0]?.dia || 'Lunes');
      }
    }
  }, [configuracion]);

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
            defaultValue=""
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
      ) : configuracion ? (
        <>
          <PlanAnualGrid 
            configuracion={configuracion}
            semanaSeleccionada={semanaNum} 
            onSeleccionarSemana={(semana: number, objetivo: string) => {
              setSemanaNum(semana); setSemanaActual(`Semana ${semana}`); setObjetivoFase(objetivo);
            }} 
          />
          
          <GraficosCarga 
            horarioPersonalizado={configuracion.horario_semanal}
            semanaNum={semanaNum}
            mesocicloActivo={objetivoFase}
          />

          <HorarioSemanal 
            semanaNum={semanaNum}
            semanaActual={semanaActual}
            mesocicloActivo={objetivoFase} 
            fechaInicio={configuracion.fecha_inicio}
            horarioPersonalizado={configuracion.horario_semanal}
            onSeleccionarDia={(dia: string, enfoque: string, fechaExacta: string, hora: string) => {
              setDiaSeleccionado(dia); setEnfoqueDelDia(enfoque); setFechaExactaDia(fechaExacta); setHoraDia(hora);
            }}
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
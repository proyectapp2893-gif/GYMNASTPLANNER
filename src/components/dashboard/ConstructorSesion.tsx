"use client"

import { useState, useEffect, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { GripVertical, Flame, Dumbbell, Activity, ShieldCheck, Wind, Loader2, Archive, Save, Info, X, CalendarDays, Clock, Search, ChevronUp, ChevronDown, Users, CheckCircle2, XCircle, Edit3, Printer, BrainCircuit, Sparkles, AlertTriangle, PlayCircle, Globe, Maximize, Zap, AlignJustify, Ruler, Award } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useClubStore } from '../../../store/useClubStore' 
import { getCompetitionProximityForDate, getSessionTimeDistribution } from '../../lib/sports-planning'

const parsearFecha = (fechaStr: string) => {
  if (!fechaStr) return null;
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const match = fechaStr.toLowerCase().match(/(\d+)\s+de\s+([a-z]+)\s+de\s+(\d+)/);
  if (match) {
    const dia = match[1].padStart(2, '0');
    const mes = (meses.indexOf(match[2]) + 1).toString().padStart(2, '0');
    const anio = match[3];
    return `${anio}-${mes}-${dia}`;
  }
  return null;
};

const normalizarTexto = (texto?: string | null) => {
  if (!texto) return '';
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const subclavesEstaticas = [
  'calentamiento_general', 'calentamiento_especifico',
  'prep_fisica_core', 'prep_fisica_superior', 'prep_fisica_inferior',
  'tecnico_aparato1', 'tecnico_aparato2',
  'rutinas_mitades', 'rutinas_completas',
  'flexibilidad_activa', 'flexibilidad_pasiva',
  'cierre_elongacion', 'cierre_retroalimentacion'
] as const;

type GrupoDosis = 'avanzado' | 'base' | 'desarrollo'

type DosificacionPorGrupo = Partial<Record<GrupoDosis, string>> & Record<string, string | undefined>

interface EjercicioSesion {
  id: string
  contenido: string
  categoria?: string | null
  descripcion?: string | null
  descripcion_corta?: string | null
  video_url?: string | null
  aparato?: string | null
  dosificacion?: string | DosificacionPorGrupo | null
}

type ColumnasSesion = Record<string, EjercicioSesion[]>

interface ConstructorSesionProps {
  grupoId?: string
  nivelSeleccionado?: string
  objetivoFase?: string
  semanaActual?: string
  diaActivo?: string
  enfoqueDia?: string
  fechaExactaDia?: string
  horaDia?: string
}

interface CompetenciaPlanificada {
  nombre?: string
  fecha: string
}

interface DiagnosticoContexto {
  competencia: string
  aparatoDebil: string
  promedio: string
  mensaje: string
}

type IaEjercicioItem = string | { id?: string; dosificacion?: string | DosificacionPorGrupo | null }

interface IaSesionResponse {
  error?: string
  calentamiento?: IaEjercicioItem[]
  'prep-fisica'?: IaEjercicioItem[]
  tecnico?: IaEjercicioItem[]
  rutinas?: IaEjercicioItem[]
  flexibilidad?: IaEjercicioItem[]
  cierre?: IaEjercicioItem[]
}

const crearColumnasVacias = (banco: EjercicioSesion[] = []): ColumnasSesion => {
  const col: ColumnasSesion = { banco }
  subclavesEstaticas.forEach(k => col[k] = [])
  return col
}

const clonarColumnas = (columnas: ColumnasSesion): ColumnasSesion => {
  return Object.fromEntries(
    Object.entries(columnas).map(([key, ejercicios]) => [key, [...ejercicios]])
  ) as ColumnasSesion
}

const aparatosMenu = [
  { nombre: 'Todos los Aparatos', Icono: Globe },
  { nombre: 'Suelo', Icono: Maximize },
  { nombre: 'Salto', Icono: Zap },
  { nombre: 'Barras Asimétricas', Icono: AlignJustify },
  { nombre: 'Viga de Equilibrio', Icono: Ruler },
  { nombre: 'Trampolín / Tumbling', Icono: Wind },
  { nombre: 'General / Ninguno', Icono: Dumbbell },
];

export default function ConstructorSesion({ 
  grupoId = '',
  nivelSeleccionado = 'Nivel General', 
  objetivoFase = 'Desarrollo General',
  semanaActual = 'Semana 1',
  diaActivo = 'Lunes',
  enfoqueDia = 'Entrenamiento General',
  fechaExactaDia = '',
  horaDia = ''
}: ConstructorSesionProps) {
  
  const { clubId, nombreClub: nombreClubGlobal, logoUrl } = useClubStore()

  const [isBrowser, setIsBrowser] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [haySesionParaGuardar, setHaySesionParaGuardar] = useState(false)
  const [ejercicioSeleccionado, setEjercicioSeleccionado] = useState<EjercicioSesion | null>(null)
  
  const [sesionId, setSesionId] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [bancoAbierto, setBancoAbierto] = useState(true)
  const [todosLosEjercicios, setTodosLosEjercicios] = useState<EjercicioSesion[]>([])
  const [filtroActivo, setFiltroActivo] = useState('Todos')
  
  const [filtroAparato, setFiltroAparato] = useState('Todos los Aparatos')
  const [menuAparatosAbierto, setMenuAparatosAbierto] = useState(false) 

  const [notificacion, setNotificacion] = useState({ mostrar: false, mensaje: '', tipo: '' })
  
  const [cargandoDia, setCargandoDia] = useState(false)
  const [grupoTabActivo, setGrupoTabActivo] = useState<'avanzado' | 'base' | 'desarrollo'>('avanzado')
  const [nombreClub, setNombreClub] = useState(nombreClubGlobal || 'Club de Gimnasia')

  const [diagnosticoContexto, setDiagnosticoContexto] = useState<DiagnosticoContexto | null>(null)
  const [cargandoContexto, setCargandoContexto] = useState(false)

  // 🔥 NUEVO: Estados para el contexto de fogueos y frecuencia de entrenamiento
  const [competenciasSecundarias, setCompetenciasSecundarias] = useState<CompetenciaPlanificada[]>([])
  const [fechaCompetenciaPrincipal, setFechaCompetenciaPrincipal] = useState('')
  const [diasEntrenamiento, setDiasEntrenamiento] = useState(6) // Por defecto 6, se actualiza de la DB

  const [columnas, setColumnas] = useState<ColumnasSesion>(() => crearColumnasVacias())

  const AparatoIconoActivo = useMemo(() => {
    return aparatosMenu.find(a => a.nombre === filtroAparato)?.Icono || Globe;
  }, [filtroAparato]);

  useEffect(() => {
    if (nombreClubGlobal && nombreClubGlobal !== 'Cargando...') setNombreClub(nombreClubGlobal)
  }, [nombreClubGlobal])

  const [nombreAparato1, nombreAparato2] = useMemo(() => {
    if (!enfoqueDia) return ['Aparato Principal', 'Aparato Secundario'];
    const texto = enfoqueDia.toLowerCase();
    const aparatosDetectados = [];
    
    if (texto.includes('salto')) aparatosDetectados.push('Salto');
    if (texto.includes('barras') || texto.includes('asimétricas')) aparatosDetectados.push('Barras Asimétricas');
    if (texto.includes('viga') || texto.includes('equilibrio')) aparatosDetectados.push('Viga de Equilibrio');
    if (texto.includes('suelo') || texto.includes('piso') || texto.includes('manos libres')) aparatosDetectados.push('Suelo');

    if (aparatosDetectados.length >= 2) return [aparatosDetectados[0], aparatosDetectados[1]];
    if (aparatosDetectados.length === 1) return [aparatosDetectados[0], 'Preparación Específica / Básicos'];
    return ['Aparato Principal', 'Aparato Secundario / Básicos'];
  }, [enfoqueDia]);

  const tiemposCalculados = useMemo(() => {
    const fechaSesion = parsearFecha(fechaExactaDia)
    const proximidad = getCompetitionProximityForDate(
      fechaSesion,
      [fechaCompetenciaPrincipal, ...competenciasSecundarias.map(comp => comp.fecha)]
    )
    return getSessionTimeDistribution(objetivoFase, proximidad.isNear)
  }, [competenciasSecundarias, fechaCompetenciaPrincipal, fechaExactaDia, objetivoFase]);

  const bloquesDefinicion = useMemo(() => [
    { 
      id: 'calentamiento', titulo: '1. Calentamiento', tiempo: `${tiemposCalculados.calentamiento} min`, color: 'border-amber-300 bg-amber-50', icon: Flame, textColor: 'text-amber-600',
      subdivisiones: [
        { id: 'calentamiento_general', nombre: 'Activación Articular y Cardiovascular' },
        { id: 'calentamiento_especifico', nombre: 'Preparación Específica (Líneas / Posturas)' }
      ]
    },
    { 
      id: 'prep_fisica', titulo: '2. Prep. Física (PF)', tiempo: `${tiemposCalculados.prep_fisica} min`, color: 'border-rose-300 bg-rose-50', icon: Dumbbell, textColor: 'text-rose-600',
      subdivisiones: [
        { id: 'prep_fisica_core', nombre: 'Zona Media (Core) y Estabilizadores' },
        { id: 'prep_fisica_superior', nombre: 'Tren Superior (Fuerza / Empuje)' },
        { id: 'prep_fisica_inferior', nombre: 'Tren Inferior (Pliometría / Potencia)' }
      ]
    },
    { 
      id: 'tecnico', titulo: '3. Trabajo Técnico', tiempo: `${tiemposCalculados.tecnico} min`, color: 'border-blue-300 bg-blue-50', icon: Activity, textColor: 'text-blue-600',
      subdivisiones: [
        { id: 'tecnico_aparato1', nombre: nombreAparato1 },
        { id: 'tecnico_aparato2', nombre: nombreAparato2 }
      ]
    },
    { 
      id: 'rutinas', titulo: '4. Esquemas y Pasadas', tiempo: `${tiemposCalculados.rutinas} min`, color: 'border-purple-300 bg-purple-50', icon: Award, textColor: 'text-purple-600',
      subdivisiones: [
        { id: 'rutinas_mitades', nombre: 'Secuencias y Conexiones' },
        { id: 'rutinas_completas', nombre: 'Rutinas Completas' }
      ]
    },
    { 
      id: 'flexibilidad', titulo: '5. Flexibilidad', tiempo: `${tiemposCalculados.flexibilidad} min`, color: 'border-emerald-300 bg-emerald-50', icon: ShieldCheck, textColor: 'text-emerald-600',
      subdivisiones: [
        { id: 'flexibilidad_activa', nombre: 'Flexibilidad Activa (Lanzamientos)' },
        { id: 'flexibilidad_pasiva', nombre: 'Flexibilidad Pasiva (Spagat / Hombros)' }
      ]
    },
    { 
      id: 'cierre', titulo: '6. Vuelta a la Calma', tiempo: `${tiemposCalculados.cierre} min`, color: 'border-slate-300 bg-slate-50', icon: Wind, textColor: 'text-slate-600',
      subdivisiones: [
        { id: 'cierre_elongacion', nombre: 'Elongación de Relajación' },
        { id: 'cierre_retroalimentacion', nombre: 'Retroalimentación (Feedback)' }
      ]
    }
  ], [nombreAparato1, nombreAparato2, tiemposCalculados]);

  useEffect(() => {
    setIsBrowser(true)
    if (!clubId) return
    const fetchEjercicios = async () => {
      const { data: clubData } = await supabase.from('clubs').select('acceso_biblioteca_elite').eq('id', clubId).single()
      const tieneAccesoElite = clubData?.acceso_biblioteca_elite || false;
      let query = supabase.from('ejercicios').select('id, nombre, categoria, descripcion, video_url, aparato')
      if (tieneAccesoElite) query = query.or(`club_id.eq.${clubId},club_id.is.null`)
      else query = query.eq('club_id', clubId)
      const { data } = await query
      if (data) {
        setTodosLosEjercicios(data.map(e => ({
          id: e.id,
          contenido: e.nombre,
          categoria: e.categoria,
          descripcion: e.descripcion,
          video_url: e.video_url,
          aparato: e.aparato
        })))
      }
    }
    fetchEjercicios()
  }, [clubId])

  // 🔥 NUEVO: Radar de Configuración del Grupo (Fogueos y Frecuencia)
  useEffect(() => {
    if (!grupoId) return;
    const cargarConfigGrupo = async () => {
      try {
        const { data } = await supabase.from('configuracion_grupos')
          .select('competencias_secundarias, fecha_competencia, horario_semanal')
          .eq('grupo_id', grupoId)
          .single();
          
        if (data) {
          if (Array.isArray(data.competencias_secundarias)) setCompetenciasSecundarias(data.competencias_secundarias as CompetenciaPlanificada[]);
          if (data.fecha_competencia) setFechaCompetenciaPrincipal(data.fecha_competencia);
          if (data.horario_semanal && Array.isArray(data.horario_semanal)) {
            // Contamos cuántos días a la semana están configurados
            setDiasEntrenamiento(data.horario_semanal.length || 6);
          }
        }
      } catch (error) {
        console.error("Error cargando la configuración del grupo:", error);
      }
    };
    cargarConfigGrupo();
  }, [grupoId]);

  useEffect(() => {
    if (!clubId || !nivelSeleccionado) return;
    const cargarContextoInteligente = async () => {
      setCargandoContexto(true)
      try {
        const { data: comps } = await supabase.from('competencias').select('id, nombre').eq('club_id', clubId).order('fecha', { ascending: false }).limit(1)
        if (!comps || comps.length === 0) { setCargandoContexto(false); return }
        const ultimaComp = comps[0]

        const { data: grupos } = await supabase.from('grupos').select('id').eq('nivel', nivelSeleccionado).eq('club_id', clubId)
        if (!grupos || grupos.length === 0) { setCargandoContexto(false); return }
        const grupoIds = grupos.map(g => g.id)

        const { data: atletas } = await supabase.from('atletas').select('id').eq('club_id', clubId).in('grupo_id', grupoIds)
        if (!atletas || atletas.length === 0) { setCargandoContexto(false); return }
        const atletaIds = atletas.map(a => a.id)

        const { data: notas } = await supabase.from('puntuaciones').select('aparato, nota_final').eq('competencia_id', ultimaComp.id).in('atleta_id', atletaIds)
        if (!notas || notas.length === 0) { setCargandoContexto(false); return }

        const sumas: Record<string, { total: number, count: number }> = {}
        notas.forEach(n => {
          if (!n.aparato || n.nota_final == null) return
          if (!sumas[n.aparato]) sumas[n.aparato] = { total: 0, count: 0 }
          sumas[n.aparato].total += Number(n.nota_final)
          sumas[n.aparato].count += 1
        })

        let aparatoDebil = ''
        let minPromedio = 999
        Object.keys(sumas).forEach(ap => {
          const prom = sumas[ap].total / sumas[ap].count
          if (prom < minPromedio) { minPromedio = prom; aparatoDebil = ap }
        })

        if (aparatoDebil) {
          setDiagnosticoContexto({
            competencia: ultimaComp.nombre, aparatoDebil, promedio: minPromedio.toFixed(2),
            mensaje: `El rendimiento en ${aparatoDebil} fue nuestro punto débil en ${ultimaComp.nombre} (Prom. ${minPromedio.toFixed(2)}). Sugiero enfocar el bloque técnico y rutinas en ejercicios específicos de este aparato.`
          })
        }
      } catch (e) { console.error("Error cargando contexto IA:", e)
      } finally { setCargandoContexto(false) }
    }
    cargarContextoInteligente()
  }, [clubId, nivelSeleccionado])

  useEffect(() => {
    if (todosLosEjercicios.length === 0 || !fechaExactaDia || !clubId) return;
    const cargarSesionDelDia = async () => {
      setCargandoDia(true)
      const fechaParseada = parsearFecha(fechaExactaDia);
      const objetivoBuscado = `${objetivoFase} - ${fechaExactaDia}`;

      let query = supabase.from('sesiones').select('*').eq('club_id', clubId).eq('nivel', nivelSeleccionado);
      if (fechaParseada) query = query.eq('fecha_calendario', fechaParseada);
      else query = query.eq('objetivo', objetivoBuscado); 

      const { data: sesionDia } = await query.single();
      
      if (sesionDia && sesionDia.ejercicios) {
        setSesionId(sesionDia.id) 
        const ejerciciosGuardados = sesionDia.ejercicios as Record<string, EjercicioSesion[] | undefined>
        const refrescarColumna = (colVieja?: EjercicioSesion[]) => {
          if (!colVieja) return []
          return colVieja.map(viejo => {
            const fresco = todosLosEjercicios.find(f => f.id === viejo.id)
            if (fresco) return { ...fresco, dosificacion: viejo.dosificacion }
            return viejo
          })
        }
        
        const columnasRestauradas: ColumnasSesion = {}
        subclavesEstaticas.forEach(k => {
          columnasRestauradas[k] = refrescarColumna(ejerciciosGuardados[k])
        })

        // Restituir compatibilidad con nombres viejos
        if (!ejerciciosGuardados.calentamiento_general && ejerciciosGuardados.calentamiento) columnasRestauradas['calentamiento_general'] = refrescarColumna(ejerciciosGuardados.calentamiento)
        if (!ejerciciosGuardados.prep_fisica_core && ejerciciosGuardados['prep-fisica']) columnasRestauradas['prep_fisica_core'] = refrescarColumna(ejerciciosGuardados['prep-fisica'])
        if (!ejerciciosGuardados.tecnico_aparato1 && ejerciciosGuardados.tecnico) columnasRestauradas['tecnico_aparato1'] = refrescarColumna(ejerciciosGuardados.tecnico)
        if (!ejerciciosGuardados.flexibilidad_activa && ejerciciosGuardados.flexibilidad) columnasRestauradas['flexibilidad_activa'] = refrescarColumna(ejerciciosGuardados.flexibilidad)
        if (!ejerciciosGuardados.cierre_elongacion && ejerciciosGuardados.cierre) columnasRestauradas['cierre_elongacion'] = refrescarColumna(ejerciciosGuardados.cierre)

        const idsEnUso = new Set(subclavesEstaticas.flatMap(key => (columnasRestauradas[key] || []).map(e => e.id)))
        
        columnasRestauradas['banco'] = todosLosEjercicios.filter(e => !idsEnUso.has(e.id))
        setColumnas(columnasRestauradas)
        setHaySesionParaGuardar(false)
      } else {
        setSesionId(null) 
        setColumnas(crearColumnasVacias([...todosLosEjercicios]))
        setHaySesionParaGuardar(false)
      }
      setCargandoDia(false)
    }
    cargarSesionDelDia()
  }, [fechaExactaDia, objetivoFase, nivelSeleccionado, todosLosEjercicios, clubId])

  const mostrarNotificacion = (mensaje: string, tipo: 'exito' | 'error') => {
    setNotificacion({ mostrar: true, mensaje, tipo })
    setTimeout(() => setNotificacion({ mostrar: false, mensaje: '', tipo: '' }), 3500)
  }

  const aplicarFiltroShuffleUp = () => {
    if (diagnosticoContexto) {
      setFiltroActivo('Técnico'); setBusqueda(`${diagnosticoContexto.aparatoDebil}`); setBancoAbierto(true);
      mostrarNotificacion(`Cargando tarjetas Shuffle Up de ${diagnosticoContexto.aparatoDebil}...`, 'exito')
    }
  }

  const bancoFiltrado = useMemo(() => {
    const idsEnUso = new Set(subclavesEstaticas.flatMap(key => (columnas[key] || []).map(e => e.id)))
    let disponibles = todosLosEjercicios.filter(e => !idsEnUso.has(e.id))
    
    if (filtroActivo !== 'Todos') {
      const filtroNormalizado = normalizarTexto(filtroActivo);
      disponibles = disponibles.filter(e => 
        normalizarTexto(e.categoria).includes(filtroNormalizado) || 
        (filtroNormalizado === 'prep-fisica' && normalizarTexto(e.categoria).includes('prep')) ||
        (filtroNormalizado === 'rutinas' && (normalizarTexto(e.categoria).includes('rutina') || normalizarTexto(e.categoria).includes('secuencia')))
      )
    }

    if (filtroAparato !== 'Todos los Aparatos') {
      disponibles = disponibles.filter(e => e.aparato === filtroAparato)
    }
    
    if (busqueda) {
      const busquedaNormalizada = normalizarTexto(busqueda);
      disponibles = disponibles.filter(e => normalizarTexto(e.contenido).includes(busquedaNormalizada))
    }
    
    return disponibles
  }, [columnas, todosLosEjercicios, filtroActivo, filtroAparato, busqueda])

  const calcularDosisUnica = async (ejercicio: EjercicioSesion, colId: string) => {
    try {
      const response = await fetch('/api/ia', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          isSingle: true, 
          ejercicioUnico: ejercicio, 
          grupoId, 
          nivel: nivelSeleccionado, 
          objetivo: objetivoFase, 
          semana: semanaActual, 
          dia: diaActivo, 
          enfoqueDia: enfoqueDia, 
          horario: horaDia, 
          nombreClub,
          // 🔥 NUEVO: Enviamos el contexto extra a la IA
          competenciasSecundarias: [
            ...(fechaCompetenciaPrincipal ? [{ nombre: 'Competencia principal', fecha: fechaCompetenciaPrincipal }] : []),
            ...competenciasSecundarias,
          ],
          diasEntrenamiento,
          fechaSesionActual: parsearFecha(fechaExactaDia)
        })
      })
      const dosisGenerada = await response.json() as DosificacionPorGrupo & { error?: string }
      if(!dosisGenerada.error) {
         setColumnas((prev) => {
            const nuevas = clonarColumnas(prev)
            const index = nuevas[colId].findIndex(e => e.id === ejercicio.id)
            if (index !== -1) nuevas[colId][index].dosificacion = dosisGenerada
            return nuevas
         })
         setHaySesionParaGuardar(true)
      }
    } catch { mostrarNotificacion('Error al calcular carga', 'error') }
  }

  const autocompletarSesion = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/ia', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          grupoId, 
          nivel: nivelSeleccionado, 
          objetivo: objetivoFase, 
          semana: semanaActual, 
          dia: diaActivo, 
          enfoqueDia: enfoqueDia, 
          horario: horaDia, 
          nombreClub,
          // 🔥 NUEVO: Enviamos el contexto extra a la IA
          competenciasSecundarias: [
            ...(fechaCompetenciaPrincipal ? [{ nombre: 'Competencia principal', fecha: fechaCompetenciaPrincipal }] : []),
            ...competenciasSecundarias,
          ],
          diasEntrenamiento,
          fechaSesionActual: parsearFecha(fechaExactaDia)
        })
      })
      const iaSugerencia = await response.json() as IaSesionResponse
      const nuevasColumnas = clonarColumnas(columnas)
      const idsEnUso = new Set<string>()

      const procesarArregloIA = (arrIA: IaEjercicioItem[] = []): EjercicioSesion[] => {
        return (arrIA || []).reduce<EjercicioSesion[]>((acc, item) => {
          const idEjercicio = typeof item === 'string' ? item : item.id
          const objDosificacion = typeof item === 'string' ? null : item.dosificacion
          const ej = todosLosEjercicios.find(e => e.id === idEjercicio)
          if (ej) {
            idsEnUso.add(ej.id)
            acc.push({ ...ej, dosificacion: objDosificacion })
          }
          return acc
        }, [])
      }

      if (!iaSugerencia.error) {
        const calGenerado = procesarArregloIA(iaSugerencia['calentamiento']);
        nuevasColumnas['calentamiento_general'] = calGenerado.slice(0, Math.ceil(calGenerado.length/2));
        nuevasColumnas['calentamiento_especifico'] = calGenerado.slice(Math.ceil(calGenerado.length/2));

        const pfGenerado = procesarArregloIA(iaSugerencia['prep-fisica']);
        const pfCore: EjercicioSesion[] = []; const pfSup: EjercicioSesion[] = []; const pfInf: EjercicioSesion[] = [];
        pfGenerado.forEach(ej => {
          const txt = (ej.contenido + ' ' + ej.categoria + ' ' + (ej.descripcion||'')).toLowerCase();
          if (txt.includes('brazo') || txt.includes('flexi') || txt.includes('dominada') || txt.includes('hombro') || txt.includes('empuje') || txt.includes('asimétricas')) pfSup.push(ej);
          else if (txt.includes('pierna') || txt.includes('salto') || txt.includes('rana') || txt.includes('sentadilla') || txt.includes('zancada')) pfInf.push(ej);
          else pfCore.push(ej); 
        });
        nuevasColumnas['prep_fisica_core'] = pfCore;
        nuevasColumnas['prep_fisica_superior'] = pfSup;
        nuevasColumnas['prep_fisica_inferior'] = pfInf;

        const tecnicoGenerado = procesarArregloIA(iaSugerencia['tecnico']);
        const tec1: EjercicioSesion[] = []; const tec2: EjercicioSesion[] = [];
        tecnicoGenerado.forEach(ej => {
            const aparatoEj = ej.aparato || '';
            if (aparatoEj === nombreAparato1) { tec1.push(ej); } 
            else if (aparatoEj === nombreAparato2) { tec2.push(ej); } 
        });
        nuevasColumnas['tecnico_aparato1'] = tec1;
        nuevasColumnas['tecnico_aparato2'] = tec2;

        const rutinasGeneradas = procesarArregloIA(iaSugerencia['rutinas'] || []);
        const rutMitades: EjercicioSesion[] = []; const rutCompletas: EjercicioSesion[] = [];
        rutinasGeneradas.forEach(ej => {
            const cat = (ej.categoria || '').toLowerCase();
            if (cat.includes('completa')) rutCompletas.push(ej);
            else rutMitades.push(ej);
        });
        nuevasColumnas['rutinas_mitades'] = rutMitades;
        nuevasColumnas['rutinas_completas'] = rutCompletas;

        const flexGenerado = procesarArregloIA(iaSugerencia['flexibilidad']);
        nuevasColumnas['flexibilidad_activa'] = flexGenerado.slice(0, Math.ceil(flexGenerado.length/2));
        nuevasColumnas['flexibilidad_pasiva'] = flexGenerado.slice(Math.ceil(flexGenerado.length/2));

        const cierreGenerado = procesarArregloIA(iaSugerencia['cierre']);
        nuevasColumnas['cierre_elongacion'] = cierreGenerado;
        nuevasColumnas['cierre_retroalimentacion'] = []; 
      }
      setColumnas(nuevasColumnas); setHaySesionParaGuardar(true); setBancoAbierto(false);
      mostrarNotificacion('Distribución completada ✨', 'exito')
    } catch { mostrarNotificacion('Error al calcular cargas', 'error')
    } finally { setIsGenerating(false) }
  }

  const guardarSesionEnBaseDeDatos = async () => {
    setGuardando(true)
    try {
      const datosSesion: ColumnasSesion = {}
      subclavesEstaticas.forEach(k => datosSesion[k] = columnas[k])

      const payload = { club_id: clubId, nivel: nivelSeleccionado, objetivo: `${objetivoFase} - ${fechaExactaDia}`, ejercicios: datosSesion, fecha_calendario: parsearFecha(fechaExactaDia) }
      const { data, error } = sesionId
        ? await supabase.from('sesiones').update(payload).eq('id', sesionId).eq('club_id', clubId).select().single()
        : await supabase.from('sesiones').insert([payload]).select().single()
      if (error) throw error
      if (data) setSesionId(data.id) 
      mostrarNotificacion('¡Sesión guardada exitosamente! 🏆', 'exito'); setHaySesionParaGuardar(false)
    } catch { mostrarNotificacion('Error al guardar sesión', 'error');
    } finally { setGuardando(false) }
  }

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) return
    const nuevasColumnas = clonarColumnas(columnas)
    const origenArray = source.droppableId === 'banco' ? [...bancoFiltrado] : nuevasColumnas[source.droppableId]
    const [ejercicioMovido] = origenArray.splice(source.index, 1)
    if (!ejercicioMovido) return

    if (source.droppableId === 'banco' && destination.droppableId !== 'banco') {
        const indexReal = nuevasColumnas['banco'].findIndex(e => e.id === ejercicioMovido.id)
        if(indexReal !== -1) nuevasColumnas['banco'].splice(indexReal, 1)
        ejercicioMovido.dosificacion = { avanzado: '⏳ Calculando...', base: '⏳ Calculando...', desarrollo: '⏳ Calculando...' }
        nuevasColumnas[destination.droppableId].splice(destination.index, 0, ejercicioMovido)
        setColumnas(nuevasColumnas); calcularDosisUnica(ejercicioMovido, destination.droppableId)
    } else if (destination.droppableId === 'banco' && source.droppableId !== 'banco') {
        nuevasColumnas[source.droppableId] = origenArray
        ejercicioMovido.dosificacion = null
        nuevasColumnas['banco'].splice(destination.index, 0, ejercicioMovido)
        setColumnas(nuevasColumnas)
    } else {
        nuevasColumnas[source.droppableId] = origenArray
        nuevasColumnas[destination.droppableId].splice(destination.index, 0, ejercicioMovido)
        setColumnas(nuevasColumnas)
    }
    setHaySesionParaGuardar(true)
  }

  const actualizarDosificacionManual = (nivel: string, valor: string) => {
    if (!ejercicioSeleccionado) return
    const nuevaDosis = typeof ejercicioSeleccionado.dosificacion === 'object' && ejercicioSeleccionado.dosificacion !== null ? { ...ejercicioSeleccionado.dosificacion } : { avanzado: '', base: '', desarrollo: '' }
    nuevaDosis[nivel] = valor
    const ejercicioActualizado = { ...ejercicioSeleccionado, dosificacion: nuevaDosis }
    setEjercicioSeleccionado(ejercicioActualizado)

    const nuevasColumnas = clonarColumnas(columnas)
    for (const col in nuevasColumnas) {
      if (col === 'banco') continue
      const index = nuevasColumnas[col].findIndex(e => e.id === ejercicioActualizado.id)
      if (index !== -1) { nuevasColumnas[col][index] = ejercicioActualizado; break }
    }
    setColumnas(nuevasColumnas); setHaySesionParaGuardar(true)
  }

  const categoriasFiltro = ['Todos', 'Calentamiento', 'Prep. Física', 'Técnico', 'Rutinas', 'Flexibilidad', 'Cierre']

  const getColorFiltro = (cat: string, isActivo: boolean) => {
    const normalizado = normalizarTexto(cat);
    if (normalizado === 'todos') return isActivo ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-200 border border-slate-200'
    if (normalizado === 'calentamiento') return isActivo ? 'bg-amber-500 text-white shadow-md' : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200'
    if (normalizado.includes('prep')) return isActivo ? 'bg-rose-500 text-white shadow-md' : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
    if (normalizado === 'tecnico') return isActivo ? 'bg-blue-500 text-white shadow-md' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
    if (normalizado === 'rutinas') return isActivo ? 'bg-purple-500 text-white shadow-md' : 'bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200'
    if (normalizado === 'flexibilidad') return isActivo ? 'bg-emerald-500 text-white shadow-md' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
    if (normalizado === 'cierre') return isActivo ? 'bg-slate-500 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
    return 'bg-slate-100'
  }

  const imprimirClase = () => { window.print() }

  if (!isBrowser) return null

  return (
    <>
      {notificacion.mostrar && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-[100] print:hidden ${notificacion.tipo === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {notificacion.tipo === 'error' ? <XCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          <span className="font-bold">{notificacion.mensaje}</span>
        </div>
      )}

      <div className="mt-4 md:mt-8 flex flex-col gap-6 print:hidden w-full">
        
        {!cargandoContexto && diagnosticoContexto && (
          <div className="bg-indigo-900 border border-indigo-700 rounded-xl p-5 shadow-lg flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between animate-in fade-in slide-in-from-top-4 w-full">
            <div className="flex items-start gap-4 flex-1">
              <div className="bg-indigo-500/30 p-3 rounded-xl border border-indigo-400/30 hidden sm:block">
                <BrainCircuit className="w-8 h-8 text-indigo-300" />
              </div>
              <div>
                <h3 className="text-white font-black flex flex-wrap items-center gap-2">
                  Diagnóstico IA Integrado 
                  <span className="bg-rose-500 text-white text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3"/> Alerta Técnica
                  </span>
                </h3>
                <p className="text-indigo-200 text-sm mt-1 max-w-4xl leading-relaxed">
                  <strong className="text-white">Coach:</strong> {diagnosticoContexto.mensaje}
                </p>
              </div>
            </div>
            <button 
              onClick={aplicarFiltroShuffleUp}
              className="w-full lg:w-auto shrink-0 bg-white text-indigo-900 hover:bg-indigo-50 px-5 py-3 lg:py-2.5 rounded-xl font-black text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Ver Ejercicios Shuffle Up
            </button>
          </div>
        )}

        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200 w-full">
          
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 border-b border-slate-100 pb-6 gap-6 w-full">
            <div className="w-full xl:w-auto">
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">Constructor de Sesión</h2>
              <div className="flex flex-wrap items-center gap-3 mt-2 mb-2">
                <div className="flex items-center gap-1.5"><CalendarDays className="w-5 h-5 text-indigo-500" /><p className="text-base md:text-lg font-black text-indigo-600 capitalize">{fechaExactaDia || diaActivo}</p></div>
                <div className="flex items-center gap-1 bg-slate-100 px-2 py-1.5 rounded-lg text-slate-600"><Clock className="w-4 h-4" /><p className="text-xs font-bold">{horaDia || 'Horario no definido'}</p></div>
              </div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{semanaActual} • {nivelSeleccionado}</p>
              <p className="text-sm text-slate-500 mt-2 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-100 inline-block w-full sm:w-auto">
                <span className="text-slate-700 font-bold">Enfoque:</span> {enfoqueDia} <span className="mx-2 text-slate-300 hidden sm:inline">|</span> <span className="block sm:inline sm:mt-0 mt-1"><span className="text-slate-700 font-bold">Fase:</span> {objetivoFase}</span>
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full xl:w-auto">
              <input 
                type="text" 
                value={nombreClub} 
                onChange={(e) => setNombreClub(e.target.value)} 
                placeholder="Nombre de tu Club..."
                className="px-4 py-3 sm:py-2.5 rounded-xl text-sm font-bold border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-48 text-slate-700 bg-slate-50"
              />

              <button onClick={imprimirClase} className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition-all bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300">
                <Printer className="w-4 h-4 text-indigo-500" /> Exportar a PDF
              </button>

              <button onClick={guardarSesionEnBaseDeDatos} disabled={guardando || !haySesionParaGuardar} className={`w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${guardando ? 'bg-slate-400 text-white cursor-not-allowed shadow-none' : haySesionParaGuardar ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-md' : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'}`}>
                {guardando ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : <><Save className="w-4 h-4" /> {haySesionParaGuardar ? 'Guardar Cambios' : 'Sesión Guardada'}</>}
              </button>

              <button onClick={autocompletarSesion} disabled={isGenerating} className={`w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all ${isGenerating ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-rose-500 to-purple-600 text-white hover:opacity-90 hover:shadow-lg'}`}>
                {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Calculando...</> : <>✨ Distribuir Cargas</>}
              </button>
            </div>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
              {bloquesDefinicion.map((bloque) => {
                const Icono = bloque.icon
                return (
                  <div key={bloque.id} className={`p-3 rounded-xl border-2 flex flex-col ${bloque.color} min-h-[250px] md:min-h-[300px] lg:min-h-[350px]`}>
                    
                    <div className="flex items-center justify-between mb-3 border-b border-black/5 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Icono className={`w-4 h-4 ${bloque.textColor}`} />
                        <h3 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-tight">{bloque.titulo}</h3>
                      </div>
                      <span className="text-[9px] font-black bg-white/60 px-1.5 py-0.5 rounded shadow-sm text-slate-500">{bloque.tiempo}</span>
                    </div>

                    <div className="flex flex-col gap-3 flex-1">
                      {bloque.subdivisiones.map((sub) => (
                        <div key={sub.id} className="flex flex-col flex-1 border border-black/5 bg-white/30 rounded-lg p-2">
                          <h4 className={`text-[9px] font-black uppercase tracking-widest mb-2 ${bloque.textColor} opacity-80 border-b border-black/5 pb-1`}>
                            {sub.nombre}
                          </h4>
                          
                          <Droppable droppableId={sub.id}>
                            {(provided, snapshot) => (
                              <div ref={provided.innerRef} {...provided.droppableProps} className={`flex-1 rounded-md min-h-[60px] transition-colors ${snapshot.isDraggingOver ? 'bg-black/10' : 'bg-transparent'}`}>
                                
                                {columnas[sub.id]?.length === 0 && !cargandoDia && (
                                  <div className="flex items-center justify-center h-full min-h-[50px] border border-dashed border-black/10 rounded m-1 opacity-40">
                                    <span className="text-[9px] font-bold text-slate-500 text-center px-2">Arrastrar aquí</span>
                                  </div>
                                )}

                                {cargandoDia ? (
                                  <div className="flex justify-center py-4 opacity-50"><Loader2 className="w-4 h-4 animate-spin" /></div>
                                ) : (
                                  columnas[sub.id]?.map((ejercicio, index) => {
                                    const estaCalculando = typeof ejercicio.dosificacion === 'object' && ejercicio.dosificacion?.avanzado?.includes('Calculando');
                                    return (
                                      <Draggable key={ejercicio.id} draggableId={ejercicio.id} index={index}>
                                        {(provided, snapshot) => (
                                          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`group bg-white p-2 mb-1.5 rounded-lg border border-slate-200 shadow-sm text-slate-700 flex flex-col items-start transition-all ${snapshot.isDragging ? 'ring-2 ring-rose-400 rotate-2 scale-105 z-50 shadow-xl' : 'hover:border-indigo-300 hover:shadow-md cursor-pointer'}`} onClick={() => { if(!estaCalculando) { setEjercicioSeleccionado(ejercicio); setGrupoTabActivo('avanzado'); }}}>
                                            <div className="flex items-start gap-1 w-full">
                                              <GripVertical className="w-3 h-3 text-slate-300 mt-0.5 shrink-0" />
                                              <span className="font-bold text-slate-800 leading-snug text-[10px] md:text-xs">{ejercicio.contenido}</span>
                                            </div>
                                            {estaCalculando && (
                                              <span className="mt-1 ml-4 text-[8px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1 text-amber-500 bg-amber-50 border border-amber-200 animate-pulse">
                                                <Loader2 className="w-2 h-2 animate-spin"/> Calc...
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </Draggable>
                                    )
                                  })
                                )}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-8 border-t-2 border-slate-200 border-dashed rounded-xl bg-slate-50">
              <div onClick={() => setBancoAbierto(!bancoAbierto)} className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-2">
                  <Archive className="w-5 h-5 text-slate-600" />
                  <h3 className="text-base md:text-lg font-bold text-slate-800">Biblioteca de Ejercicios</h3>
                  <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full ml-2">{bancoFiltrado.length}</span>
                </div>
                <div>{bancoAbierto ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}</div>
              </div>

              {bancoAbierto && (
                <div className="p-4 pt-0 border-t border-slate-200 bg-white rounded-b-xl">
                  
                  <div className="flex flex-col gap-4 mb-4 mt-4">
                    
                    <div className="flex flex-col sm:flex-row gap-4 w-full">
                      <div className="relative w-full sm:flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input type="text" placeholder="Buscar ejercicio o rutina..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      
                      <div className="relative flex-shrink-0 z-[60] w-full sm:w-auto">
                        <button
                          onClick={() => setMenuAparatosAbierto(!menuAparatosAbierto)}
                          className="flex items-center justify-between gap-2 w-full px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-sm rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all hover:bg-indigo-100 min-w-[200px]"
                        >
                          <div className="flex items-center gap-2">
                            <AparatoIconoActivo className="w-4 h-4" />
                            {filtroAparato}
                          </div>
                          <ChevronDown className={`w-4 h-4 opacity-50 transition-transform ${menuAparatosAbierto ? 'rotate-180' : ''}`} />
                        </button>

                        {menuAparatosAbierto && (
                          <>
                            <div className="fixed inset-0 z-[50]" onClick={() => setMenuAparatosAbierto(false)}></div>
                            <div className="absolute top-full left-0 mt-2 w-full sm:w-56 max-h-60 overflow-y-auto bg-white border border-slate-200 shadow-xl rounded-xl z-[60] flex flex-col py-1 animate-in fade-in slide-in-from-top-2">
                              {aparatosMenu.map((aparato) => {
                                const IconoList = aparato.Icono;
                                return (
                                  <button
                                    key={aparato.nombre}
                                    onClick={() => {
                                      setFiltroAparato(aparato.nombre);
                                      setMenuAparatosAbierto(false);
                                    }}
                                    className={`flex items-center gap-3 px-4 py-2.5 text-sm font-bold transition-all text-left ${filtroAparato === aparato.nombre ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'}`}
                                  >
                                    <IconoList className={`w-4 h-4 ${filtroAparato === aparato.nombre ? 'text-indigo-600' : 'text-slate-400'}`} />
                                    {aparato.nombre}
                                  </button>
                                )
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 w-full custom-scrollbar sm:justify-start">
                      {categoriasFiltro.map(cat => (
                        <button 
                          key={cat} 
                          onClick={() => setFiltroActivo(cat)} 
                          className={`shrink-0 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${getColorFiltro(cat, filtroActivo === cat)}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Droppable droppableId="banco" direction="horizontal">
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className={`min-h-[120px] p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap gap-3 ${snapshot.isDraggingOver ? 'bg-slate-100 ring-2 ring-slate-300 ring-inset' : ''}`}>
                        {bancoFiltrado.length === 0 ? (
                          <p className="text-slate-400 text-sm italic w-full text-center py-6">No se encontraron tarjetas con estos filtros.</p>
                        ) : (
                          bancoFiltrado.map((ejercicio, index) => (
                            <Draggable key={ejercicio.id} draggableId={ejercicio.id} index={index}>
                              {(provided, snapshot) => (
                                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`group bg-white p-3 rounded-xl border border-slate-300 shadow-sm text-sm font-bold text-slate-700 flex flex-col items-start justify-between gap-2 w-full sm:w-64 ${snapshot.isDragging ? 'ring-2 ring-rose-400 z-50' : 'hover:border-slate-400 cursor-pointer'}`} onClick={() => { setEjercicioSeleccionado(ejercicio); setGrupoTabActivo('avanzado'); }}>
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-2 truncate">
                                      <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
                                      <span className="truncate text-xs sm:text-sm">{ejercicio.contenido}</span>
                                    </div>
                                    <button className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-500 transition-opacity shrink-0"><Info className="w-4 h-4" /></button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              )}
            </div>
          </DragDropContext>
        </div>
      </div>

      {/* MODAL EJERCICIO SELECCIONADO */}
      {ejercicioSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Edit3 className="w-5 h-5 text-indigo-500"/> Detalles de la Tarjeta</h2>
              <button onClick={() => setEjercicioSeleccionado(null)} className="text-slate-400 hover:text-rose-500 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <h3 className="text-lg md:text-xl font-black text-slate-800 leading-tight">{ejercicioSeleccionado.contenido}</h3>
                
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                    {ejercicioSeleccionado.categoria}
                  </span>
                  
                  {ejercicioSeleccionado.video_url && (
                    <a 
                      href={ejercicioSeleccionado.video_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-colors border border-rose-100 shadow-sm"
                    >
                      <PlayCircle className="w-3 h-3" /> Ver Técnica / Rutina
                    </a>
                  )}
                </div>
              </div>

              {(ejercicioSeleccionado.descripcion || ejercicioSeleccionado.descripcion_corta) && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 relative">
                  <span className="absolute -top-2 left-3 bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Descripción</span>
                  <p className="text-xs font-medium text-slate-600 leading-relaxed mt-1">
                    {ejercicioSeleccionado.descripcion_corta || ejercicioSeleccionado.descripcion}
                  </p>
                </div>
              )}

              {ejercicioSeleccionado.dosificacion && (
                <div className="mt-2">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2"><Users className="w-4 h-4 text-indigo-500"/> Cargas por Grupos</span>
                    <span className="text-[9px] text-slate-400 font-medium">Edita para cambiar</span>
                  </h4>
                  {typeof ejercicioSeleccionado.dosificacion === 'string' ? (
                    <p className="text-sm font-bold text-indigo-700 bg-indigo-50 p-4 rounded-xl border border-indigo-100">{ejercicioSeleccionado.dosificacion}</p>
                  ) : (
                    <div className="flex flex-col">
                      <div className="flex rounded-lg bg-slate-100 p-1 mb-3">
                        <button onClick={() => setGrupoTabActivo('avanzado')} className={`flex-1 py-2 px-2 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${grupoTabActivo === 'avanzado' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Avanzado</button>
                        <button onClick={() => setGrupoTabActivo('base')} className={`flex-1 py-2 px-2 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${grupoTabActivo === 'base' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Base</button>
                        <button onClick={() => setGrupoTabActivo('desarrollo')} className={`flex-1 py-2 px-2 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${grupoTabActivo === 'desarrollo' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Desarrollo</button>
                      </div>
                      <div className={`flex flex-col bg-white rounded-xl border shadow-sm overflow-hidden focus-within:ring-2 transition-all ${grupoTabActivo === 'avanzado' ? 'border-indigo-100 focus-within:ring-indigo-500' : grupoTabActivo === 'base' ? 'border-emerald-100 focus-within:ring-emerald-500' : 'border-amber-100 focus-within:ring-amber-500'}`}>
                        <textarea rows={5} placeholder="Escribe la dosificación aquí..." value={ejercicioSeleccionado.dosificacion?.[grupoTabActivo] || ''} onChange={(e) => actualizarDosificacionManual(grupoTabActivo, e.target.value)} className={`p-4 text-sm font-black bg-transparent outline-none w-full resize-none leading-relaxed ${grupoTabActivo === 'avanzado' ? 'text-indigo-800' : grupoTabActivo === 'base' ? 'text-emerald-800' : 'text-amber-800'}`} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VERSIÓN PARA IMPRESIÓN (PDF) */}
      <div className="hidden print:block print:absolute print:inset-0 print:bg-white print:z-[9999] print:w-full print:h-full print:m-0 print:p-8 text-black font-sans">
        
        <div className="border-b-4 border-slate-900 pb-4 mb-6 flex justify-between items-end">
          <div className="flex items-center gap-4">
            {logoUrl && logoUrl !== '/default-club-logo.png' ? (
               <img src={logoUrl} alt="Logo Club" className="w-16 h-16 object-contain" />
            ) : (
               <div className="w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center text-white"><Dumbbell size={32} /></div>
            )}
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Plan de Clase • {nombreClub}</h1>
              <p className="text-lg font-bold text-slate-600 mt-1">{nivelSeleccionado}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{semanaActual}</p>
            <p className="text-xl font-black text-slate-800 capitalize">{fechaExactaDia || diaActivo}</p>
          </div>
        </div>

        <div className="flex gap-4 mb-8 bg-slate-100 p-4 rounded-xl border border-slate-200">
          <div className="flex-1">
            <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Enfoque del Día</span>
            <span className="text-sm font-bold text-slate-800">{enfoqueDia}</span>
          </div>
          <div className="flex-1 border-l-2 border-slate-300 pl-4">
            <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Fase / Mesociclo</span>
            <span className="text-sm font-bold text-slate-800">{objetivoFase}</span>
          </div>
          <div className="flex-1 border-l-2 border-slate-300 pl-4">
            <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Horario</span>
            <span className="text-sm font-bold text-slate-800">{horaDia || 'No especificado'}</span>
          </div>
        </div>

        <div className="space-y-6">
          {bloquesDefinicion.map(bloque => {
            const tieneEjercicios = bloque.subdivisiones.some(sub => (columnas[sub.id] || []).length > 0);
            if (!tieneEjercicios) return null;

            return (
              <div key={bloque.id} className="break-inside-avoid">
                <h2 className="text-sm font-black text-white bg-slate-800 px-4 py-2 uppercase flex justify-between items-center rounded-t-lg print:!bg-slate-800 print:!text-white">
                  <span>{bloque.titulo}</span>
                  <span className="text-[10px] text-slate-300 tracking-widest">{bloque.tiempo}</span>
                </h2>
                
                <div className="border-x-2 border-b-2 border-slate-800 rounded-b-lg overflow-hidden flex flex-col">
                  <div className="flex bg-slate-200 text-slate-700 text-[10px] uppercase font-black print:!bg-slate-200">
                    <div className="p-3 border-r border-slate-300 w-1/4">Estación / Ejercicio</div>
                    <div className="p-3 border-r border-slate-300 flex-1">Grupo A (Avanzado)</div>
                    <div className="p-3 border-r border-slate-300 flex-1">Grupo B (Base)</div>
                    <div className="p-3 flex-1">Grupo C (Desarrollo)</div>
                  </div>
                  
                  {bloque.subdivisiones.map(sub => {
                    const ejerciciosSub = columnas[sub.id] || [];
                    if (ejerciciosSub.length === 0) return null;
                    return (
                      <div key={sub.id} className="flex flex-col border-t border-slate-300">
                        <div className="bg-slate-100 px-3 py-1 text-[9px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-300">
                          {sub.nombre}
                        </div>
                        {ejerciciosSub.map((ej, i) => (
                          <div key={ej.id} className={`flex ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-b border-slate-200 last:border-b-0`}>
                            <div className="p-3 border-r border-slate-300 w-1/4 font-bold text-slate-800 text-[11px]">{ej.contenido}</div>
                            <div className="p-3 border-r border-slate-300 flex-1 font-medium text-slate-700 text-[10px] whitespace-pre-line">{typeof ej.dosificacion === 'string' ? ej.dosificacion : ej.dosificacion?.avanzado || '-'}</div>
                            <div className="p-3 border-r border-slate-300 flex-1 font-medium text-slate-700 text-[10px] whitespace-pre-line">{typeof ej.dosificacion === 'string' ? '-' : ej.dosificacion?.base || '-'}</div>
                            <div className="p-3 flex-1 font-medium text-slate-700 text-[10px] whitespace-pre-line">{typeof ej.dosificacion === 'string' ? '-' : ej.dosificacion?.desarrollo || '-'}</div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-16 pt-8 flex justify-around text-center text-xs font-bold text-slate-500 uppercase tracking-widest break-inside-avoid">
          <div><div className="w-48 border-b border-slate-400 mb-2 mx-auto"></div>Head Coach</div>
          <div><div className="w-48 border-b border-slate-400 mb-2 mx-auto"></div>Entrenador Asistente</div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { margin: 0; size: A4 portrait; }
          body, html { background-color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
          aside, nav, [class*="w-64"], header, button { display: none !important; width: 0 !important; visibility: hidden !important; }
          main, body > div, #__next { display: block !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 1.5cm !important; flex: none !important; }
          .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }
      `}} />
    </>
  )
}

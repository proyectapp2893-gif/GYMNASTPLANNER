"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { ShieldAlert, CheckCircle, XCircle, Loader2, Building2, BookOpen, AlertTriangle, LogOut, Dumbbell, Plus, Trash2, Video, UploadCloud, FileSpreadsheet, CheckSquare, Filter, CalendarDays, BellRing, Edit3, X, Eye, Search, Tag } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BotonGenerarIA from '../../components/ejercicios/BotonGenerarIA';
import type { Club, Ejercicio } from '../../lib/types';

type ClubAdmin = Club & {
  estado?: string | null
  created_at?: string | null
}

type EjercicioGlobal = Ejercicio & {
  etiquetas?: string | null
}

type EjercicioCSV = Omit<EjercicioGlobal, 'id'> & {
  club_id: null
}

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : 'Error desconocido'

export default function SuperAdminPage() {
  const router = useRouter();
  const [clubes, setClubes] = useState<ClubAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  
  const [autorizado, setAutorizado] = useState(false); 
  const [mensajeError, setMensajeError] = useState(''); 
  
  const [pestañaActiva, setPestañaActiva] = useState<'clubes' | 'biblioteca'>('clubes');

  const [ejerciciosGlobales, setEjerciciosGlobales] = useState<EjercicioGlobal[]>([]);
  const [nuevoEjNombre, setNuevoEjNombre] = useState('');
  const [nuevoEjCategoria, setNuevoEjCategoria] = useState('Técnico');
  const [nuevoEjDesc, setNuevoEjDesc] = useState('');
  const [nuevoEjVideo, setNuevoEjVideo] = useState('');
  const [nuevoEjEtiquetas, setNuevoEjEtiquetas] = useState('');
  const [guardandoEj, setGuardandoEj] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cargandoCSV, setCargandoCSV] = useState(false);
  
  const [previewCSV, setPreviewCSV] = useState<EjercicioCSV[]>([]);
  const [guardandoMasivo, setGuardandoMasivo] = useState(false);

  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [borrandoMasivo, setBorrandoMasivo] = useState(false);

  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState('Todos');
  const [filtroAparato, setFiltroAparato] = useState('Todos');
  const [filtroDificultad, setFiltroDificultad] = useState('Todos');
  const [filtroFechaExacta, setFiltroFechaExacta] = useState(''); 
  const [terminoBusqueda, setTerminoBusqueda] = useState('');

  const [toast, setToast] = useState<{ mensaje: string, tipo: 'exito' | 'error' } | null>(null);

  const [ejercicioEditando, setEjercicioEditando] = useState<EjercicioGlobal | null>(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const SUPER_ADMIN_EMAIL = 'Gymnastplanner@gmail.com'; 

  const mostrarAviso = (mensaje: string, tipo: 'exito' | 'error' = 'exito') => {
    setToast({ mensaje, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  const cargarDatos = useCallback(async () => {
    const { data: clubesData } = await supabase.from('clubs').select('*').order('estado', { ascending: false }); 
    if (clubesData) setClubes(clubesData as ClubAdmin[]);

    const { data: ejData } = await supabase.from('ejercicios').select('*').is('club_id', null).order('created_at', { ascending: false });
    if (ejData) setEjerciciosGlobales(ejData as EjercicioGlobal[]);

    setCargando(false);
  }, []);

  const verificarSeguridad = useCallback(async () => {
    setCargando(true);
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (!user || error) {
      setMensajeError('No hay ninguna sesión activa en el navegador.');
      setCargando(false);
      return;
    }

    if (user.email?.trim().toLowerCase() !== SUPER_ADMIN_EMAIL.trim().toLowerCase()) {
      setMensajeError(`Acceso denegado. Estás usando el correo: "${user.email}" y se requiere la llave maestra.`);
      setCargando(false);
      return;
    }

    setAutorizado(true);
    void cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    void verificarSeguridad();
  }, [verificarSeguridad]);

  const cambiarEstadoClub = async (id: string, nuevoEstado: string) => {
    const { error } = await supabase.from('clubs').update({ estado: nuevoEstado }).eq('id', id);
    if (!error) {
      void cargarDatos();
      mostrarAviso(`Club marcado como ${nuevoEstado}.`, 'exito');
    }
  };

  const cambiarAccesoBiblioteca = async (id: string, accesoActual: boolean) => {
    const { error } = await supabase.from('clubs').update({ acceso_biblioteca_elite: !accesoActual }).eq('id', id);
    if (!error) {
      void cargarDatos();
      mostrarAviso(`Acceso Premium ${!accesoActual ? 'activado' : 'desactivado'}.`, 'exito');
    }
  };

  const crearEjercicioGlobal = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoEj(true);
    
    const { error } = await supabase.from('ejercicios').insert([{
      nombre: nuevoEjNombre,
      categoria: nuevoEjCategoria,
      descripcion: nuevoEjDesc,
      video_url: nuevoEjVideo,
      etiquetas: nuevoEjEtiquetas 
    }]);

    if (!error) {
      setNuevoEjNombre('');
      setNuevoEjDesc('');
      setNuevoEjVideo('');
      setNuevoEjEtiquetas('');
      void cargarDatos();
      mostrarAviso('¡Ejercicio Maestro añadido a la colección!');
    } else {
      mostrarAviso('Error al guardar el ejercicio.', 'error');
    }
    setGuardandoEj(false);
  };

  const guardarEdicionGlobal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ejercicioEditando) return;
    setGuardandoEdicion(true);
    
    const { error } = await supabase.from('ejercicios').update({
      nombre: ejercicioEditando.nombre,
      categoria: ejercicioEditando.categoria,
      aparato: ejercicioEditando.aparato,
      dificultad: ejercicioEditando.dificultad,
      descripcion: ejercicioEditando.descripcion,
      descripcion_corta: ejercicioEditando.descripcion_corta,
      video_url: ejercicioEditando.video_url,
      rangos_repeticiones: ejercicioEditando.rangos_repeticiones,
      etiquetas: ejercicioEditando.etiquetas 
    }).eq('id', ejercicioEditando.id);

    if (!error) {
      setEjercicioEditando(null);
      void cargarDatos();
      mostrarAviso('¡Ejercicio actualizado correctamente!', 'exito');
    } else {
      mostrarAviso('Error al actualizar el ejercicio.', 'error');
    }
    setGuardandoEdicion(false);
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const manejarSubidaCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCargandoCSV(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lineas = text.split(/\r\n|\n|\r/).filter(line => line.trim() !== '');
        
        if (lineas.length < 2) {
          mostrarAviso('El archivo parece estar vacío o solo tiene encabezados.', 'error');
          setCargandoCSV(false);
          return;
        }

        const primeraLinea = lineas[0];
        let separador = ',';
        if (primeraLinea.includes(';') && !primeraLinea.includes(',')) {
          separador = ';';
        } else if (primeraLinea.includes('\t')) {
          separador = '\t';
        }

        const headers = primeraLinea.split(separador).map(h => h.trim().toLowerCase());
        
        const idxNombre = headers.indexOf('nombre');
        const idxCategoria = headers.indexOf('categoria');
        const idxAparato = headers.indexOf('aparato');
        const idxDificultad = headers.indexOf('dificultad');
        
        let idxDescripcion = headers.indexOf('descripcion');
        if (idxDescripcion === -1) idxDescripcion = headers.indexOf('descripcion_corta');
        
        const idxVideo = headers.indexOf('video_url');
        const idxRangos = headers.indexOf('rangos_repeticiones');
        const idxEtiquetas = headers.indexOf('etiquetas');

        if (idxNombre === -1) {
          mostrarAviso(`Error: La columna "nombre" no se encontró. Revisa el archivo.`, 'error');
          setCargandoCSV(false);
          return;
        }

        const ejerciciosParseados: EjercicioCSV[] = [];

        const parsearLinea = (linea: string, sep: string) => {
          const resultado = [];
          let entreComillas = false;
          let valorActual = '';
          
          for (let i = 0; i < linea.length; i++) {
            const char = linea[i];
            if (char === '"') {
              if (entreComillas && linea[i+1] === '"') {
                valorActual += '"'; 
                i++;
              } else {
                entreComillas = !entreComillas;
              }
            } else if (char === sep && !entreComillas) {
              resultado.push(valorActual.trim());
              valorActual = '';
            } else {
              valorActual += char;
            }
          }
          resultado.push(valorActual.trim());
          return resultado;
        };

        for (let i = 1; i < lineas.length; i++) {
          const valores = parsearLinea(lineas[i], separador);
          if(valores.length === 0) continue;
          
          const nombreVal = valores[idxNombre]?.trim();
          if(!nombreVal) continue; 
          
          const descVal = idxDescripcion !== -1 ? valores[idxDescripcion] : null;

          ejerciciosParseados.push({
            nombre: nombreVal,
            categoria: idxCategoria !== -1 ? valores[idxCategoria] || 'General' : 'General',
            aparato: idxAparato !== -1 ? valores[idxAparato] || null : null,
            dificultad: idxDificultad !== -1 ? valores[idxDificultad] || null : null,
            descripcion: descVal || null,
            descripcion_corta: descVal || null,
            video_url: idxVideo !== -1 ? valores[idxVideo] || null : null,
            rangos_repeticiones: idxRangos !== -1 ? valores[idxRangos] || null : null,
            etiquetas: idxEtiquetas !== -1 ? valores[idxEtiquetas] || null : null,
            club_id: null
          });
        }

        if (ejerciciosParseados.length > 0) {
          setPreviewCSV(ejerciciosParseados);
        }

      } catch (err) {
         console.error("Error CSV:", err);
         mostrarAviso("Error procesando el archivo: " + getErrorMessage(err), 'error');
      } finally {
        setCargandoCSV(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // 🔥 EL CAMBIO ESTÁ AQUÍ (Pase VIP Upsert) 🔥
  const confirmarSubidaMasiva = async () => {
    if (previewCSV.length === 0) return;
    setGuardandoMasivo(true);
    
    try {
      // Upsert: Si existe el 'nombre', lo actualiza. Si no, lo crea.
      const { error } = await supabase.from('ejercicios').upsert(previewCSV, { onConflict: 'nombre' });
      if (error) throw error;
      
      void cargarDatos();
      setPreviewCSV([]); 
      mostrarAviso(`¡Éxito! ${previewCSV.length} ejercicios procesados (Nuevos agregados, existentes actualizados).`, 'exito');
    } catch (err) {
      mostrarAviso(`Hubo un error al guardar: ${getErrorMessage(err)}`, 'error');
    } finally {
      setGuardandoMasivo(false);
    }
  };

  const aparatosUnicos = useMemo(() => Array.from(new Set(ejerciciosGlobales.map(ej => ej.aparato).filter((value): value is string => Boolean(value)))), [ejerciciosGlobales]);
  const dificultadesUnicas = useMemo(() => Array.from(new Set(ejerciciosGlobales.map(ej => ej.dificultad).filter((value): value is string => Boolean(value)))), [ejerciciosGlobales]);
  const categoriasUnicas = useMemo(() => Array.from(new Set(ejerciciosGlobales.map(ej => ej.categoria).filter((value): value is string => Boolean(value)))), [ejerciciosGlobales]);

  const ejerciciosFiltrados = useMemo(() => ejerciciosGlobales.filter(ej => {
    const cumpleCategoria = filtroCategoria === 'Todos' || ej.categoria === filtroCategoria;
    const cumpleAparato = filtroAparato === 'Todos' || ej.aparato === filtroAparato;
    const cumpleDificultad = filtroDificultad === 'Todos' || ej.dificultad === filtroDificultad;
    
    let cumpleFecha = true;
    if (filtroFechaExacta) {
      const dateObj = new Date(ej.created_at || '');
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const fechaFormateada = `${yyyy}-${mm}-${dd}`;
      cumpleFecha = fechaFormateada === filtroFechaExacta;
    }

    let cumpleBusqueda = true;
    if (terminoBusqueda.trim() !== '') {
      const busqueda = terminoBusqueda.toLowerCase();
      const enNombre = (ej.nombre || '').toLowerCase().includes(busqueda);
      const enEtiquetas = (ej.etiquetas || '').toLowerCase().includes(busqueda);
      cumpleBusqueda = enNombre || enEtiquetas;
    }

    return cumpleCategoria && cumpleAparato && cumpleDificultad && cumpleFecha && cumpleBusqueda;
  }).sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()), [ejerciciosGlobales, filtroAparato, filtroCategoria, filtroDificultad, filtroFechaExacta, terminoBusqueda]); 

  const toggleSeleccion = (id: string) => {
    setSeleccionados(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  };

  const seleccionarTodos = () => {
    const idsFiltrados = ejerciciosFiltrados.map(ej => ej.id);
    const todosSeleccionados = idsFiltrados.length > 0 && idsFiltrados.every(id => seleccionados.includes(id));
    
    if (todosSeleccionados) {
      setSeleccionados(prev => prev.filter(id => !idsFiltrados.includes(id)));
    } else {
      setSeleccionados(prev => Array.from(new Set([...prev, ...idsFiltrados])));
    }
  };

  const eliminarSeleccionadosMasivo = async () => {
    if (seleccionados.length === 0) return;
    if (!confirm(`⚠️ CUIDADO: Estás a punto de eliminar ${seleccionados.length} ejercicios de la base de datos. ¿Continuar?`)) return;

    setBorrandoMasivo(true);
    
    const { error } = await supabase.from('ejercicios').delete().in('id', seleccionados);

    if (error) {
      mostrarAviso("Hubo un error al eliminar los ejercicios.", 'error');
    } else {
      setSeleccionados([]); 
      void cargarDatos(); 
      mostrarAviso(`${seleccionados.length} ejercicios eliminados correctamente.`, 'exito');
    }
    
    setBorrandoMasivo(false);
  };


  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-amber-500 mb-4" />
        <p className="text-slate-400 font-bold tracking-widest uppercase text-sm">Cargando Panel Maestro...</p>
      </div>
    );
  }

  if (!autorizado) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-rose-500/20 p-6 rounded-full mb-6 border border-rose-500/30"><AlertTriangle className="w-16 h-16 text-rose-500" /></div>
        <h2 className="text-3xl font-black text-white mb-4">Área Restringida</h2>
        <p className="text-slate-400 font-medium max-w-lg mb-8 bg-slate-800 p-4 rounded-xl border border-slate-700">{mensajeError}</p>
        <Link href={mensajeError.includes('No hay ninguna sesión') ? '/login' : '/'} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-colors">
          {mensajeError.includes('No hay ninguna sesión') ? 'Ir a Iniciar Sesión' : 'Volver al Inicio'}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-8 font-sans relative">
      
      {toast && (
        <div className={`fixed bottom-8 right-8 z-50 px-6 py-4 rounded-xl font-bold shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 ${toast.tipo === 'exito' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-rose-500/20'}`}>
          {toast.tipo === 'exito' ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          {toast.mensaje}
        </div>
      )}

      {/* MODAL DE VISTA PREVIA (STAGING AREA) */}
      {previewCSV.length > 0 && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-700 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-slate-900/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg"><Eye className="w-6 h-6" /></div>
                <div>
                  <h2 className="text-xl font-bold text-white">Vista Previa de Carga Masiva</h2>
                  <p className="text-xs text-slate-400 font-medium mt-1">Revisa que los datos estén correctos antes de insertarlos.</p>
                </div>
              </div>
              <span className="bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-lg text-sm font-bold border border-indigo-500/30">
                {previewCSV.length} Ejercicios detectados
              </span>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-900/30">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {previewCSV.map((ej, index) => (
                  <div key={index} className="bg-slate-800 border border-slate-700 p-4 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded-md">{ej.categoria}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-2 leading-tight">{ej.nombre}</h3>
                    {ej.etiquetas && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {ej.etiquetas.split(',').map((tag:string, i:number) => (
                          <span key={i} className="text-[8px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded uppercase font-bold">#{tag.trim()}</span>
                        ))}
                      </div>
                    )}
                    {ej.descripcion && <p className="text-[10px] text-slate-400 line-clamp-2 mb-2">{ej.descripcion}</p>}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
                      <span className="text-[9px] text-slate-500 uppercase font-bold">{ej.aparato || 'Sin aparato'}</span>
                      {ej.video_url && <Video className="w-3 h-3 text-emerald-400" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-700 bg-slate-900/50 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
              <p className="text-xs text-slate-400 font-medium text-center sm:text-left">
                Si todo se ve bien, procede a guardar. Si el nombre ya existe, se actualizará su información automáticamente.
              </p>
              <div className="flex gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => setPreviewCSV([])} 
                  disabled={guardandoMasivo}
                  className="flex-1 sm:flex-none px-6 py-3 bg-slate-700 text-white hover:bg-slate-600 rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmarSubidaMasiva}
                  disabled={guardandoMasivo}
                  className="flex-1 sm:flex-none px-6 py-3 bg-emerald-600 text-white hover:bg-emerald-500 rounded-xl font-black transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  {guardandoMasivo ? <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</> : <><UploadCloud className="w-5 h-5" /> Confirmar Subida</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN FLOTANTE */}
      {ejercicioEditando && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-700 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-slate-900/50 shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-400" /> Editar Ejercicio Global
              </h2>
              <button onClick={() => setEjercicioEditando(null)} className="text-slate-400 hover:text-rose-400 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 flex-col gap-4 overflow-y-auto custom-scrollbar flex-1">
              <form id="form-editar" onSubmit={guardarEdicionGlobal} className="flex flex-col gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nombre</label>
                  <input type="text" value={ejercicioEditando.nombre || ''} onChange={(e) => setEjercicioEditando({...ejercicioEditando, nombre: e.target.value})} className="w-full p-3 bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Categoría</label>
                    <select value={ejercicioEditando.categoria || ''} onChange={(e) => setEjercicioEditando({...ejercicioEditando, categoria: e.target.value})} className="w-full p-3 bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold">
                      <option value="Técnico">Técnico</option>
                      <option value="Prep. Física - General">Prep. Física - General</option>
                      <option value="Prep. Física - Tarjeta Roja">Prep. Física - Tarjeta Roja</option>
                      <option value="Flexibilidad">Flexibilidad</option>
                      <option value="Calentamiento">Calentamiento</option>
                      <option value="Calma / Cierre">Calma / Cierre</option>
                      <option value="Rutina Completa">Rutina Completa</option>
                      <option value="Secuencia / Conexión">Secuencia / Conexión</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Aparato</label>
                    <select value={ejercicioEditando.aparato || ''} onChange={(e) => setEjercicioEditando({...ejercicioEditando, aparato: e.target.value})} className="w-full p-3 bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold">
                      <option value="General">General</option>
                      <option value="Barras Asimétricas">Barras Asimétricas</option>
                      <option value="Viga de Equilibrio">Viga de Equilibrio</option>
                      <option value="Suelo">Suelo</option>
                      <option value="Salto">Salto</option>
                      <option value="Trampolín">Trampolín</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Etiquetas (Separadas por comas)</label>
                  <input type="text" value={ejercicioEditando.etiquetas || ''} onChange={(e) => setEjercicioEditando({...ejercicioEditando, etiquetas: e.target.value})} placeholder="Ej: Kip, Fuerza, Core" className="w-full p-3 bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Link de Video</label>
                  <input type="url" value={ejercicioEditando.video_url || ''} onChange={(e) => setEjercicioEditando({...ejercicioEditando, video_url: e.target.value})} className="w-full p-3 bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Descripción Larga</label>
                  <textarea rows={3} value={ejercicioEditando.descripcion || ''} onChange={(e) => setEjercicioEditando({...ejercicioEditando, descripcion: e.target.value})} className="w-full p-3 bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm resize-none" />
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-700 bg-slate-900/50 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setEjercicioEditando(null)} className="px-6 py-3 bg-slate-800 text-slate-300 hover:text-white rounded-xl font-bold transition-colors">
                Cancelar
              </button>
              <button type="submit" form="form-editar" disabled={guardandoEdicion} className="px-6 py-3 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl font-black transition-colors flex items-center gap-2">
                {guardandoEdicion ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/20 text-amber-500 rounded-xl">
              <ShieldAlert size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">Panel Maestro GymnastPlanner</h1>
              <p className="text-slate-400">Control total del ecosistema multiclub</p>
            </div>
          </div>
          <button onClick={cerrarSesion} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-sm font-bold transition-all border border-slate-700 hover:border-slate-600 shadow-sm">
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>

        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => setPestañaActiva('clubes')} 
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${pestañaActiva === 'clubes' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
          >
            <Building2 className="w-4 h-4" /> Gestión de Clubes
          </button>
          <button 
            onClick={() => setPestañaActiva('biblioteca')} 
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${pestañaActiva === 'biblioteca' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
          >
            <BookOpen className="w-4 h-4" /> Biblioteca Premium ({ejerciciosGlobales.length})
          </button>
        </div>

        {pestañaActiva === 'clubes' && (
           <div className="bg-slate-800 rounded-3xl overflow-hidden border border-slate-700 shadow-xl animate-in fade-in duration-300">
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse min-w-[800px]">
               <thead>
                 <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-widest font-black">
                   <th className="p-4">Club</th>
                   <th className="p-4">Fecha Registro</th>
                   <th className="p-4 text-center">Estado</th>
                   <th className="p-4 text-center bg-indigo-900/20">Acceso Premium</th>
                   <th className="p-4 text-right">Acceso Sistema</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-700">
                 {clubes.map((club) => (
                   <tr key={club.id} className="hover:bg-slate-800/50 transition-colors">
                     <td className="p-4 flex items-center gap-3"><Building2 className="text-slate-500 w-5 h-5" /><span className="font-bold text-white">{club.nombre}</span></td>
                     <td className="p-4 text-sm text-slate-400">{club.created_at ? new Date(club.created_at).toLocaleDateString() : '-'}</td>
                     <td className="p-4 text-center"><span className={`inline-block px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${club.estado === 'pendiente' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>{club.estado}</span></td>
                     <td className="p-4 text-center bg-indigo-900/10">
                       {club.estado === 'aprobado' ? (
                         <div className="flex flex-col items-center justify-center gap-1">
                           <button onClick={() => cambiarAccesoBiblioteca(club.id, Boolean(club.acceso_biblioteca_elite))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${club.acceso_biblioteca_elite ? 'bg-indigo-500' : 'bg-slate-600'}`}>
                             <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${club.acceso_biblioteca_elite ? 'translate-x-6' : 'translate-x-1'}`} />
                           </button>
                           <span className={`text-[10px] font-bold uppercase tracking-wider ${club.acceso_biblioteca_elite ? 'text-indigo-400' : 'text-slate-500'}`}>{club.acceso_biblioteca_elite ? 'Activado' : 'Apagado'}</span>
                         </div>
                       ) : (<span className="text-[10px] text-slate-500 uppercase font-bold">Requiere Aprobación</span>)}
                     </td>
                     <td className="p-4 flex justify-end gap-2">
                       {club.estado === 'pendiente' ? (
                         <button onClick={() => cambiarEstadoClub(club.id, 'aprobado')} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-sm font-bold"><CheckCircle className="w-4 h-4" /> Aprobar</button>
                       ) : (
                         <button onClick={() => cambiarEstadoClub(club.id, 'pendiente')} className="flex items-center gap-1 bg-rose-600 hover:bg-rose-500 text-white px-3 py-2 rounded-lg text-sm font-bold"><XCircle className="w-4 h-4" /> Suspender</button>
                       )}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         </div>
        )}

        {pestañaActiva === 'biblioteca' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
            <div className="lg:col-span-1 flex flex-col gap-6">
              
              <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl h-fit">
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg"><Plus className="w-5 h-5" /></div>
                    <h2 className="text-xl font-bold text-white">Nuevo Ejercicio</h2>
                  </div>
                  <BotonGenerarIA />
                </div>
                <form onSubmit={crearEjercicioGlobal} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nombre del Ejercicio</label>
                    <input required type="text" value={nuevoEjNombre} onChange={e => setNuevoEjNombre(e.target.value)} placeholder="Ej. Mortal Extendido" className="w-full p-3 bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Categoría</label>
                    <select value={nuevoEjCategoria} onChange={e => setNuevoEjCategoria(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold">
                      <option value="Técnico">Técnico</option>
                      <option value="Prep. Física - General">Prep. Física - General</option>
                      <option value="Prep. Física - Tarjeta Roja">Prep. Física - Tarjeta Roja</option>
                      <option value="Flexibilidad">Flexibilidad</option>
                      <option value="Calentamiento">Calentamiento</option>
                      <option value="Calma / Cierre">Calma / Cierre</option>
                      <option value="Rutina Completa">Rutina Completa</option>
                      <option value="Secuencia / Conexión">Secuencia / Conexión</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Etiquetas (Opcional)</label>
                    <input type="text" value={nuevoEjEtiquetas} onChange={e => setNuevoEjEtiquetas(e.target.value)} placeholder="Ej: Kip, Barras, Fuerza" className="w-full p-3 bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Link de Video (Opcional)</label>
                    <input type="url" value={nuevoEjVideo} onChange={e => setNuevoEjVideo(e.target.value)} placeholder="https://youtube.com/..." className="w-full p-3 bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Descripción (Opcional)</label>
                    <textarea rows={3} value={nuevoEjDesc} onChange={e => setNuevoEjDesc(e.target.value)} placeholder="Detalles técnicos..." className="w-full p-3 bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm resize-none" />
                  </div>
                  <button type="submit" disabled={guardandoEj} className="mt-4 w-full py-3 bg-indigo-600 text-white rounded-xl font-black hover:bg-indigo-500 transition-colors flex justify-center items-center gap-2">
                    {guardandoEj ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Publicar Individual'}
                  </button>
                </form>
              </div>

              <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl h-fit border-t-4 border-t-emerald-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg"><FileSpreadsheet className="w-5 h-5" /></div>
                  <h2 className="text-xl font-bold text-white">Carga Masiva (CSV)</h2>
                </div>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Sube un archivo de Excel guardado como <strong>CSV UTF-8 (delimitado por comas)</strong> para mantener los acentos y evitar errores de lectura.
                </p>
                <input 
                  type="file" 
                  accept=".csv" 
                  ref={fileInputRef}
                  className="hidden"
                  onChange={manejarSubidaCSV}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={cargandoCSV}
                  className={`w-full py-4 border-2 border-dashed rounded-xl font-black flex flex-col justify-center items-center gap-3 transition-colors ${cargandoCSV ? 'border-slate-600 bg-slate-900 text-slate-500 cursor-not-allowed' : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500'}`}
                >
                  {cargandoCSV ? (
                    <><Loader2 className="w-6 h-6 animate-spin" /> Procesando Archivo...</>
                  ) : (
                    <><UploadCloud className="w-8 h-8" /> Seleccionar Archivo CSV</>
                  )}
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 bg-slate-800 rounded-3xl overflow-hidden border border-slate-700 shadow-xl flex flex-col h-[85vh]">
              
              <div className="p-6 border-b border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/50 shrink-0">
                <div className="flex items-center gap-3">
                  <Dumbbell className="w-6 h-6 text-indigo-400" />
                  <div>
                    <h2 className="text-xl font-bold text-white leading-tight">Colección Premium</h2>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{ejerciciosFiltrados.length} Mostrando de {ejerciciosGlobales.length}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Buscar por nombre o etiqueta..." 
                      value={terminoBusqueda}
                      onChange={(e) => setTerminoBusqueda(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-xs font-bold text-white outline-none focus:border-indigo-500 w-64"
                    />
                  </div>

                  {ejerciciosFiltrados.length > 0 && (
                    <button 
                      onClick={seleccionarTodos}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold border border-slate-600 transition-colors flex items-center gap-2"
                    >
                      <CheckSquare className="w-4 h-4" /> 
                      {ejerciciosFiltrados.every(ej => seleccionados.includes(ej.id)) ? 'Desmarcar Visibles' : 'Seleccionar Visibles'}
                    </button>
                  )}

                  {seleccionados.length > 0 && (
                    <button 
                      onClick={eliminarSeleccionadosMasivo}
                      disabled={borrandoMasivo}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-lg shadow-rose-500/20"
                    >
                      {borrandoMasivo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      Borrar ({seleccionados.length})
                    </button>
                  )}
                </div>
              </div>
              
              <div className="p-4 bg-slate-800/50 border-b border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1"><Filter className="w-3 h-3"/> Categoría</label>
                  <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold rounded-lg p-2 outline-none focus:border-indigo-500">
                    <option value="Todos">Todas las Categorías</option>
                    {categoriasUnicas.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1"><Filter className="w-3 h-3"/> Aparato</label>
                  <select value={filtroAparato} onChange={(e) => setFiltroAparato(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold rounded-lg p-2 outline-none focus:border-indigo-500">
                    <option value="Todos">Todos los Aparatos</option>
                    {aparatosUnicos.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1"><Filter className="w-3 h-3"/> Dificultad</label>
                  <select value={filtroDificultad} onChange={(e) => setFiltroDificultad(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold rounded-lg p-2 outline-none focus:border-indigo-500">
                    <option value="Todos">Todas las Dificultades</option>
                    {dificultadesUnicas.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1"><CalendarDays className="w-3 h-3"/> Fecha Exacta</label>
                    {filtroFechaExacta && (
                       <button onClick={() => setFiltroFechaExacta('')} className="text-[9px] text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider">Limpiar</button>
                    )}
                  </div>
                  <input 
                    type="date" 
                    value={filtroFechaExacta} 
                    onChange={(e) => setFiltroFechaExacta(e.target.value)} 
                    className="w-full bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold rounded-lg p-2 outline-none focus:border-indigo-500 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 overflow-y-auto custom-scrollbar relative">
                {ejerciciosFiltrados.length === 0 ? (
                  <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-500">
                     <BellRing className="w-12 h-12 mb-3 opacity-20" />
                     <p className="font-bold">No hay ejercicios que coincidan con los filtros.</p>
                  </div>
                ) : (
                  ejerciciosFiltrados.map((ej) => {
                    const estaSeleccionado = seleccionados.includes(ej.id);

                    return (
                      <div 
                        key={ej.id} 
                        onClick={() => setEjercicioEditando(ej)}
                        className={`p-4 rounded-2xl border flex flex-col justify-between group transition-all cursor-pointer relative overflow-hidden min-h-[120px] ${
                          estaSeleccionado 
                            ? 'bg-rose-500/10 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.1)]' 
                            : 'bg-slate-900 border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800'
                        }`}
                      >
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); 
                            toggleSeleccion(ej.id);
                          }}
                          className={`absolute top-4 right-4 w-6 h-6 rounded flex items-center justify-center transition-colors z-10 border ${
                            estaSeleccionado 
                              ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/40' 
                              : 'border-slate-500 hover:border-slate-300 bg-slate-800/50'
                          }`}
                        >
                          {estaSeleccionado && <CheckCircle className="w-4 h-4" />}
                        </button>

                        <div className="flex-1">
                          <div className="flex flex-wrap gap-2 mb-2 pr-8">
                            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded-md">{ej.categoria}</span>
                            {ej.aparato && <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-800 px-2 py-1 rounded-md">{ej.aparato}</span>}
                          </div>
                          
                          <h3 className={`text-base font-bold leading-tight mb-2 break-words pr-8 ${estaSeleccionado ? 'text-rose-100' : 'text-white'}`}>
                            {ej.nombre || <span className="text-rose-400">Sin Nombre (Error de CSV)</span>}
                          </h3>

                          {ej.etiquetas && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {ej.etiquetas.split(',').map((tag:string, i:number) => (
                                <span key={i} className="flex items-center gap-0.5 text-[8px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase font-bold border border-slate-700">
                                  <Tag className="w-2 h-2" /> {tag.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {ej.descripcion && <p className="text-xs text-slate-400 line-clamp-2">{ej.descripcion}</p>}
                          {ej.descripcion_corta && !ej.descripcion && <p className="text-xs text-slate-400 line-clamp-2">{ej.descripcion_corta}</p>}
                        </div>
                        
                        <div className="mt-4 flex justify-between items-end shrink-0 border-t border-slate-800 pt-3">
                          {ej.video_url ? (
                            <a 
                              href={ej.video_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              onClick={(e) => e.stopPropagation()} 
                              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 w-fit"
                            >
                              <Video className="w-3 h-3" /> Ver Video
                            </a>
                          ) : <div/>}
                          
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                             {ej.created_at ? new Date(ej.created_at).toLocaleDateString() : '-'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        )}

      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #334155;
          border-radius: 20px;
        }
      `}} />
    </div>
  );
}

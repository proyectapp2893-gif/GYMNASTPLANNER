"use client"

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Dumbbell, Trophy, Tent, Coffee, Calendar as CalendarIcon, X, Clock, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useClubStore } from '../../../store/useClubStore';
import type { Competencia, Sesion } from '../../lib/types';

type EventoCalendario = {
  id: string
  fecha: Date
  tipo: 'entrenamiento' | 'competencia' | 'campamento' | 'descanso'
  titulo: string
  nivel: string
}

type DiaSeleccionado = {
  fecha: Date
  eventos: EventoCalendario[]
}

const formatearFechaLocal = (d: Date) => {
  const z = (n: number) => (n < 10 ? '0' : '') + n
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

const parsearFechaLocal = (fecha: string) => new Date(`${fecha}T12:00:00`)

export default function CalendarioPage() {
  const { clubId, nombreClub } = useClubStore();
  const [fechaActual, setFechaActual] = useState(new Date());
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [, setCargando] = useState(true);
  const [diaSeleccionado, setDiaSeleccionado] = useState<DiaSeleccionado | null>(null);

  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  useEffect(() => {
    if (!clubId) return;
    cargarEventosDelMes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaActual, clubId]);

  const cargarEventosDelMes = async () => {
    setCargando(true);
    
    // Aquí buscaremos las sesiones usando la nueva columna fecha_calendario
    const { data: sesiones } = await supabase
      .from('sesiones')
      .select('id, nivel, objetivo, fecha_calendario')
      .eq('club_id', clubId)
      .gte('fecha_calendario', formatearFechaLocal(new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1)))
      .lte('fecha_calendario', formatearFechaLocal(new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0)));

    const { data: competencias } = await supabase
      .from('competencias')
      .select('id, nombre, fecha, tipo')
      .eq('club_id', clubId)
      .gte('fecha', formatearFechaLocal(new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1)))
      .lte('fecha', formatearFechaLocal(new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0)));

    const eventosSesiones: EventoCalendario[] = ((sesiones || []) as Sesion[])
      .filter(sesion => Boolean(sesion.fecha_calendario))
      .map(sesion => ({
        id: `sesion-${sesion.id}`,
        fecha: parsearFechaLocal(sesion.fecha_calendario || ''),
        tipo: 'entrenamiento',
        titulo: sesion.objetivo || 'Entrenamiento',
        nivel: sesion.nivel || 'General',
      }));

    const eventosCompetencias: EventoCalendario[] = ((competencias || []) as Competencia[])
      .filter(comp => Boolean(comp.fecha))
      .map(comp => ({
        id: `competencia-${comp.id}`,
        fecha: parsearFechaLocal(comp.fecha),
        tipo: 'competencia',
        titulo: comp.nombre,
        nivel: comp.tipo || 'Competencia',
      }));

    setEventos([...eventosSesiones, ...eventosCompetencias]);
    setCargando(false);
  };

  const mesAnterior = () => setFechaActual(new Date(fechaActual.getFullYear(), fechaActual.getMonth() - 1, 1));
  const mesSiguiente = () => setFechaActual(new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 1));
  const irAHoy = () => setFechaActual(new Date());

  // Lógica para construir la cuadrícula del calendario
  const getDiasDelMes = () => {
    const año = fechaActual.getFullYear();
    const mes = fechaActual.getMonth();
    const primerDia = new Date(año, mes, 1).getDay();
    const diasEnMes = new Date(año, mes + 1, 0).getDate();
    
    const dias = [];
    // Espacios vacíos al principio
    for (let i = 0; i < primerDia; i++) {
      dias.push(null);
    }
    // Días reales
    for (let i = 1; i <= diasEnMes; i++) {
      dias.push(new Date(año, mes, i));
    }
    return dias;
  };

  const obtenerEventosDelDia = (fecha: Date) => {
    return eventos.filter(e => 
      e.fecha.getDate() === fecha.getDate() && 
      e.fecha.getMonth() === fecha.getMonth() && 
      e.fecha.getFullYear() === fecha.getFullYear()
    );
  };

  const getEstiloEvento = (tipo: string) => {
    switch(tipo) {
      case 'entrenamiento': return { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', icon: Dumbbell };
      case 'competencia': return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: Trophy };
      case 'campamento': return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: Tent };
      case 'descanso': return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', icon: Coffee };
      default: return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: CalendarIcon };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* CABECERA */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Calendario Anual</h1>
            <p className="text-sm font-bold text-slate-500 mt-1">{nombreClub || 'Cargando club...'}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={irAHoy} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
              Hoy
            </button>
            <div className="flex items-center gap-4 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-md">
              <button onClick={mesAnterior} className="p-1 hover:bg-slate-700 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5" /></button>
              <span className="w-40 text-center font-black uppercase tracking-widest text-sm">
                {meses[fechaActual.getMonth()]} {fechaActual.getFullYear()}
              </span>
              <button onClick={mesSiguiente} className="p-1 hover:bg-slate-700 rounded-lg transition-colors"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
        </div>

        {/* LEYENDA */}
        <div className="flex flex-wrap gap-4 mb-6 px-2">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500"></div><span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Entrenamiento</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Competencia</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Campamento</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-400"></div><span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Descanso</span></div>
        </div>

        {/* CUADRÍCULA DEL CALENDARIO */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Días de la semana */}
          <div className="grid grid-cols-7 bg-slate-900 border-b border-slate-200">
            {diasSemana.map(dia => (
              <div key={dia} className="py-4 text-center text-xs font-black text-slate-300 uppercase tracking-widest">
                {dia}
              </div>
            ))}
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7 auto-rows-fr bg-slate-100 gap-px">
            {getDiasDelMes().map((fecha, index) => {
              if (!fecha) return <div key={`empty-${index}`} className="bg-slate-50 min-h-[140px]"></div>;

              const esHoy = fecha.toDateString() === new Date().toDateString();
              const eventosDelDia = obtenerEventosDelDia(fecha);

              return (
                <div 
                  key={fecha.toISOString()} 
                  onClick={() => eventosDelDia.length > 0 && setDiaSeleccionado({ fecha, eventos: eventosDelDia })}
                  className={`bg-white min-h-[140px] p-2 transition-colors relative group ${eventosDelDia.length > 0 ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full ${esHoy ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-700'}`}>
                      {fecha.getDate()}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 mt-1">
                    {eventosDelDia.map(evento => {
                      const estilo = getEstiloEvento(evento.tipo);
                      const Icono = estilo.icon;
                      return (
                        <div key={evento.id} className={`${estilo.bg} ${estilo.border} border px-2 py-1.5 rounded-lg flex items-center gap-1.5 transition-transform hover:scale-[1.02]`}>
                          <Icono className={`w-3 h-3 ${estilo.text} shrink-0`} />
                          <span className={`text-[10px] font-bold ${estilo.text} truncate`}>{evento.titulo}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL DE DETALLE DEL DÍA */}
      {diaSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
              <div>
                <h2 className="text-xl font-black text-slate-800 capitalize">
                  {diaSeleccionado.fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Detalle de Actividades</p>
              </div>
              <button onClick={() => setDiaSeleccionado(null)} className="p-2 bg-slate-200 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 flex flex-col gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {diaSeleccionado.eventos.map((evento) => {
                const estilo = getEstiloEvento(evento.tipo);
                const Icono = estilo.icon;
                return (
                  <div key={evento.id} className={`p-4 rounded-2xl border ${estilo.border} ${estilo.bg} bg-opacity-30 flex flex-col gap-3`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl bg-white shadow-sm ${estilo.text}`}><Icono className="w-6 h-6" /></div>
                      <div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${estilo.text}`}>{evento.tipo}</span>
                        <h3 className="text-lg font-bold text-slate-800 leading-tight">{evento.titulo}</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 pt-3 border-t border-black/5">
                      <div className="flex items-center gap-1 text-slate-600 text-xs font-bold"><Users className="w-4 h-4" /> {evento.nivel}</div>
                      <div className="flex items-center gap-1 text-slate-600 text-xs font-bold"><Clock className="w-4 h-4" /> 4:00 PM</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setDiaSeleccionado(null)} className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

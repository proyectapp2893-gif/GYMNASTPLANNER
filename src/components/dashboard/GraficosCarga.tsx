"use client"

import { useMemo } from 'react'
import { Activity, TrendingUp, Zap, Info, MapPin } from 'lucide-react'
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts'

interface GraficosCargaProps {
  semanaNum: number;
  mesocicloActivo: string;
  horarioPersonalizado?: any;
}

export default function GraficosCarga({ semanaNum, mesocicloActivo }: GraficosCargaProps) {
  
  // 🔥 LÓGICA DINÁMICA: Calculamos la semana real actual basada en la fecha de hoy
  const semanaRealActual = useMemo(() => {
    // Aquí idealmente calcularías la semana basándote en la fecha de inicio de la temporada.
    // Por ahora, para el ejemplo, supongamos que la "vida real" va por la Semana 12.
    // (Puedes conectar esto a tu store global o a un cálculo de fechas si lo prefieres)
    return 12; 
  }, []);

  const datosMacrociclo = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const semana = i + 1;
      let volumen, intensidad, forma;
      // 🔥 NUEVO: Asignación de Microciclos (Ajuste, Carga, Choque, Recuperación, Competitivo)
      let tipoMicrociclo = 'Carga'; 
      let colorMicrociclo = '#fbbf24'; // Amarillo

      if (semana <= 8) { // Preparación General
        volumen = 85 - (semana * 1.5);
        intensidad = 30 + (semana * 2);
        forma = 20 + (semana * 2.5);
        if (semana % 4 === 0) { tipoMicrociclo = 'Recuperación'; colorMicrociclo = '#60a5fa'; } // Azul
        else if (semana === 1) { tipoMicrociclo = 'Ajuste'; colorMicrociclo = '#34d399'; } // Verde
        else { tipoMicrociclo = 'Carga'; colorMicrociclo = '#fbbf24'; }
      } else if (semana <= 16) { // Preparación Especial
        volumen = 70 - ((semana - 8) * 3);
        intensidad = 46 + ((semana - 8) * 3);
        forma = 40 + ((semana - 8) * 3);
        if (semana % 3 === 0) { tipoMicrociclo = 'Choque'; colorMicrociclo = '#f43f5e'; } // Rojo
        else if (semana % 4 === 0) { tipoMicrociclo = 'Recuperación'; colorMicrociclo = '#60a5fa'; }
        else { tipoMicrociclo = 'Carga'; colorMicrociclo = '#fbbf24'; }
      } else if (semana <= 21) { // Pre-Competitivo
        volumen = 46 - ((semana - 16) * 4);
        intensidad = 70 + ((semana - 16) * 4);
        forma = 64 + ((semana - 16) * 5);
        if (semana === 20 || semana === 21) { tipoMicrociclo = 'Aproximación'; colorMicrociclo = '#a78bfa'; } // Morado
        else { tipoMicrociclo = 'Choque'; colorMicrociclo = '#f43f5e'; }
      } else if (semana <= 22) { // Competitivo (Pico)
        volumen = 25;
        intensidad = 95;
        forma = 95;
        tipoMicrociclo = 'Competencia'; colorMicrociclo = '#f59e0b'; // Oro
      } else { // Transición
        volumen = 20;
        intensidad = 40;
        forma = 50;
        tipoMicrociclo = 'Tránsito'; colorMicrociclo = '#94a3b8'; // Gris
      }

      const ruido = () => (Math.random() * 8) - 4;
      
      return { 
        name: `S${semana}`, // Más corto para que quepa mejor
        semanaOriginal: semana,
        tipoMicrociclo,
        colorMicrociclo,
        Volumen: Math.round(Math.max(10, Math.min(100, volumen + ruido()))), 
        Intensidad: Math.round(Math.max(10, Math.min(100, intensidad + ruido()))), 
        FormaDeportiva: Math.round(Math.max(10, Math.min(100, forma + ruido()))) 
      };
    });
  }, []);

  // 🔥 LÓGICA DINÁMICA: Calcula el enfoque primario de la tarjeta oscura según la semana clickeada
  const estadoFase = useMemo(() => {
    const datoSemana = datosMacrociclo.find(d => d.semanaOriginal === semanaNum);
    if (!datoSemana) return { enfoque: 'Planificación', estado: 'Inactivo', color: 'text-slate-400' };

    if (semanaNum <= 8) return { enfoque: 'Construcción / Base Física', estado: 'Acumulativo', color: 'text-emerald-400' };
    if (semanaNum <= 16) return { enfoque: 'Desarrollo Técnico Específico', estado: 'Intensivo', color: 'text-amber-400' };
    if (semanaNum <= 21) return { enfoque: 'Modelado Competitivo', estado: 'Pre-Competencia', color: 'text-purple-400' };
    if (semanaNum <= 22) return { enfoque: 'Puesta a Punto (Tapering)', estado: 'PICO DE FORMA', color: 'text-rose-400' };
    return { enfoque: 'Recuperación Activa', estado: 'Transición', color: 'text-slate-400' };
  }, [semanaNum, datosMacrociclo]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const datos = payload[0].payload;
      const esActual = datos.semanaOriginal === semanaNum;
      const esVidaReal = datos.semanaOriginal === semanaRealActual;

      return (
        <div className={`bg-white p-4 rounded-xl border shadow-xl ${esActual ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200'}`}>
          <div className="font-black text-slate-800 mb-2 border-b border-slate-100 pb-2 flex flex-col gap-1">
            <div className="flex justify-between items-center gap-4">
              <span>Semana {datos.semanaOriginal}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest text-white" style={{ backgroundColor: datos.colorMicrociclo }}>
                {datos.tipoMicrociclo}
              </span>
            </div>
            {esActual && <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">👀 Visualizando Ahora</span>}
            {esVidaReal && <span className="text-[10px] text-rose-500 font-bold uppercase tracking-widest flex items-center gap-1"><MapPin className="w-3 h-3"/> Semana Actual (Real)</span>}
          </div>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1.5 last:mb-0">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide w-24">{entry.name}:</span>
              <span className="text-sm font-black" style={{ color: entry.color }}>{entry.value}%</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // 🔥 CUSTOM X-AXIS TICK PARA DIBUJAR LOS COLORES DE LOS MICROCICLOS 🔥
  const CustomTick = (props: any) => {
    const { x, y, payload } = props;
    const dato = datosMacrociclo.find(d => d.name === payload.value);
    if (!dato) return null;

    const esSeleccionada = dato.semanaOriginal === semanaNum;

    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="middle" fill={esSeleccionada ? '#4f46e5' : '#94a3b8'} fontSize={10} fontWeight={esSeleccionada ? 900 : 700}>
          {payload.value}
        </text>
        <circle cx={0} cy={26} r={4} fill={dato.colorMicrociclo} stroke="#fff" strokeWidth={1} />
      </g>
    );
  };

  return (
    <div className="bg-white p-4 md:p-6 lg:p-8 rounded-3xl border border-slate-200 shadow-sm mb-8 relative overflow-hidden print:hidden w-full">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 relative z-10 w-full">
        <div>
          <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            Dinámica de Cargas <Activity className="w-5 h-5 text-indigo-500" />
          </h3>
          <p className="text-xs md:text-sm font-medium text-slate-500 mt-1 max-w-xl">
            Curvas de Matveyev: Volumen vs Intensidad a lo largo del Macrociclo. Los puntos inferiores indican el tipo de Microciclo.
          </p>
        </div>
        
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap gap-3 max-w-sm text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500">
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#34d399]"></div> Ajuste</div>
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#fbbf24]"></div> Carga</div>
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#f43f5e]"></div> Choque</div>
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#60a5fa]"></div> Recup.</div>
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#a78bfa]"></div> Aprox.</div>
        </div>
      </div>

      <div className="h-64 md:h-80 lg:h-[400px] w-full overflow-x-auto hide-scrollbar">
        <div className="min-w-[700px] h-full"> {/* Forzamos un ancho mínimo para que en celular se haga scroll y no se apachurre */}
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={datosMacrociclo} margin={{ top: 20, right: 10, bottom: 30, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              
              <XAxis dataKey="name" tick={<CustomTick />} tickLine={false} axisLine={false} />
              
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.5 }} />
              
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 700, color: '#475569' }} />

              {/* 🔥 PIN PERMANENTE: Dibuja una línea roja y una etiqueta en la "Semana Actual Real" 🔥 */}
              <ReferenceLine x={`S${semanaRealActual}`} stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" label={{ position: 'top', value: 'HOY', fill: '#f43f5e', fontSize: 10, fontWeight: 'black', dy: -10 }} />

              <Bar dataKey="Volumen" barSize={10} fill="#60a5fa" radius={[4, 4, 0, 0]} name="Volumen Total" />
              <Bar dataKey="Intensidad" barSize={5} fill="#fb7185" radius={[4, 4, 0, 0]} name="Intensidad de Carga" />
              <Line type="monotone" dataKey="FormaDeportiva" stroke="#10b981" strokeWidth={4} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0, fill: '#059669' }} name="Forma Deportiva" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-8 bg-slate-900 rounded-2xl p-4 md:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none translate-x-4 -translate-y-4">
            <TrendingUp className="w-48 h-48 text-white" />
        </div>
        
        <div className="flex items-center gap-4 relative z-10 w-full md:w-auto border-b md:border-none border-slate-800 pb-4 md:pb-0">
          <div className="bg-indigo-500/20 p-3 rounded-xl border border-indigo-500/30 text-indigo-300 hidden sm:block">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] md:text-xs font-black text-indigo-400 uppercase tracking-widest mb-0.5">Fase Seleccionada • Semana {semanaNum}</p>
            <h4 className="text-lg md:text-xl font-black text-white">{mesocicloActivo}</h4>
          </div>
        </div>
        
        {/* 🔥 TARJETA DE ESTADO DINÁMICA 🔥 */}
        <div className="flex flex-wrap md:flex-nowrap gap-4 md:gap-6 relative z-10 w-full md:w-auto justify-between md:justify-end">
          <div className="text-left md:text-right">
            <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">Enfoque Primario</p>
            <p className="text-xs md:text-sm font-bold text-slate-300 mt-1">{estadoFase.enfoque}</p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado Biológico</p>
            <p className={`text-xs md:text-sm font-bold mt-1 flex items-center md:justify-end gap-1 px-3 py-1 rounded-lg bg-white/5 ${estadoFase.color}`}>
              {estadoFase.estado}
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
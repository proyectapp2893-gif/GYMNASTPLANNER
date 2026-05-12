"use client"

import { useState, useEffect } from 'react'
import { PlayCircle, X, Save, Loader2, Link as LinkIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import { useClubStore } from '../../../store/useClubStore'
import { normalizeExerciseInput, normalizeVideoUrl } from '../../lib/exercise-normalization'
import type { Ejercicio } from '../../lib/types'

export default function TarjetaEjercicio({ ejercicio }: { ejercicio: Ejercicio }) {
  const { clubId } = useClubStore()
  const router = useRouter()
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  
  const [minuto, setMinuto] = useState('')
  const [segundo, setSegundo] = useState('')
  const [urlBase, setUrlBase] = useState(ejercicio.video_url || '')

  useEffect(() => {
    if (ejercicio.video_url) {
      try {
        const urlObj = new URL(ejercicio.video_url);
        const params = new URLSearchParams(urlObj.search);
        const tiempo = params.get('t');
        
        if (tiempo) {
          let mins = 0;
          let secs = 0;
          if (tiempo.includes('m')) {
             mins = parseInt(tiempo.split('m')[0]) || 0;
             secs = parseInt(tiempo.split('m')[1].replace('s','')) || 0;
          } else {
             const totalSegundos = parseInt(tiempo.replace('s','')) || 0;
             mins = Math.floor(totalSegundos / 60);
             secs = totalSegundos % 60;
          }
          setMinuto(mins.toString());
          setSegundo(secs.toString());
          params.delete('t');
          urlObj.search = params.toString();
          setUrlBase(urlObj.toString());
        } else {
          setUrlBase(ejercicio.video_url);
        }
      } catch {
        setUrlBase(ejercicio.video_url);
      }
    }
  }, [ejercicio.video_url]);

  const [formData, setFormData] = useState({
    nombre: ejercicio.nombre || '',
    categoria: ejercicio.categoria || '',
    dificultad: ejercicio.dificultad || '',
    aparato: ejercicio.aparato || '',
    descripcion: ejercicio.descripcion || '',
    descripcion_corta: ejercicio.descripcion_corta || '', 
    rangos_repeticiones: ejercicio.rangos_repeticiones || '', 
  })

  const guardarCambios = async () => {
    setGuardando(true)
    try {
      let finalVideoUrl = urlBase.trim();
      if (finalVideoUrl && (minuto || segundo)) {
        if (!finalVideoUrl.startsWith('http')) {
           finalVideoUrl = 'https://' + finalVideoUrl;
        }
        try {
          const urlObj = new URL(finalVideoUrl);
          const m = parseInt(minuto) || 0;
          const s = parseInt(segundo) || 0;
          if (m > 0 || s > 0) {
            const params = new URLSearchParams(urlObj.search);
            params.set('t', `${m}m${s}s`);
            urlObj.search = params.toString();
            finalVideoUrl = urlObj.toString();
          }
        } catch {
          console.warn("URL inválida introducida por el usuario.");
        }
      }
      finalVideoUrl = normalizeVideoUrl(finalVideoUrl)

      const datosAEnviar = normalizeExerciseInput({
        ...formData,
        video_url: finalVideoUrl
      })

      const { error } = await supabase
        .from('ejercicios')
        .update(datosAEnviar)
        .eq('id', ejercicio.id)
        .eq('club_id', clubId)

      if (error) throw error
      
      setModalAbierto(false)
      router.refresh()
    } catch (error) {
      console.error("Error al actualizar:", error)
      alert("Hubo un error al guardar los cambios.")
    } finally {
      setGuardando(false)
    }
  }

  const categoria = ejercicio.categoria || ''
  const esTarjeta = categoria.includes("Tarjeta")
  let colorBadge = "bg-slate-100 text-slate-600 border-slate-200"
  if (esTarjeta) {
    if (categoria.includes("Roja")) colorBadge = "bg-red-100 text-red-700 border-red-200"
    if (categoria.includes("Verde")) colorBadge = "bg-green-100 text-green-700 border-green-200"
    if (categoria.includes("Amarilla")) colorBadge = "bg-yellow-100 text-yellow-700 border-yellow-200"
    if (categoria.includes("Azul")) colorBadge = "bg-blue-100 text-blue-700 border-blue-200"
    if (categoria.includes("Naranja")) colorBadge = "bg-orange-100 text-orange-700 border-orange-200"
  }

  let colorDificultad = 'bg-rose-100 text-rose-700'
  if (ejercicio.dificultad?.includes('Básico')) colorDificultad = 'bg-emerald-100 text-emerald-700'
  if (ejercicio.dificultad?.includes('Intermedio')) colorDificultad = 'bg-amber-100 text-amber-700'
  if (ejercicio.dificultad?.includes('Nivel')) colorDificultad = 'bg-indigo-100 text-indigo-700' 

  return (
    <>
      <div className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between ${esTarjeta ? 'border-slate-300' : 'border-slate-200'}`}>
        <div>
          <div className="flex justify-between items-start mb-4 gap-2">
            <span className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border ${esTarjeta ? colorBadge : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              {ejercicio.categoria || 'Sin Categoría'}
            </span>
            <span className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap ${colorDificultad}`}>
              {ejercicio.dificultad || 'Básico'}
            </span>
          </div>

          {/* 🔥 REPRODUCTOR SEGURO Y ESTABLE DE GOOGLE DRIVE 🔥 */}
          {ejercicio.video_url && (
            <div className="w-full aspect-video rounded-xl overflow-hidden mb-4 bg-slate-100 border border-slate-200 relative">
              <iframe 
                src={ejercicio.video_url} 
                className="absolute top-0 left-0 w-full h-full border-none"
                allow="autoplay" 
                allowFullScreen
                loading="lazy"
              ></iframe>
            </div>
          )}

          <h3 className="text-lg font-bold text-slate-800 mb-2 leading-tight">{ejercicio.nombre}</h3>
          
          <p className="text-sm text-slate-500 mb-4 line-clamp-3 flex-1">
            {ejercicio.descripcion_corta || ejercicio.descripcion || "Sin descripción."}
          </p>
          
          {ejercicio.rangos_repeticiones && (
            <div className="bg-slate-50 p-2.5 rounded-xl mb-4 text-xs font-bold text-slate-600 text-center border border-slate-200">
              ⏱ Rangos: {ejercicio.rangos_repeticiones}
            </div>
          )}

          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Aparato:</span>
            <span className="text-sm font-bold text-slate-700">{ejercicio.aparato || 'N/A'}</span>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-100 mt-auto">
          {ejercicio.video_url ? (
            <a 
              href={ejercicio.video_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-sm font-bold transition-colors"
            >
              <PlayCircle className="w-4 h-4" /> Pantalla Completa
            </a>
          ) : (
            <button disabled className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-50 text-slate-400 rounded-xl text-sm font-bold cursor-not-allowed" title="Edita el ejercicio para agregar un link">
              <PlayCircle className="w-4 h-4 opacity-50" /> Sin Video
            </button>
          )}

          <button 
            onClick={() => setModalAbierto(true)}
            className="px-4 py-2 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-200 rounded-xl text-sm font-bold transition-colors"
          >
            Editar
          </button>
        </div>
      </div>

      {/* MODAL DE EDICIÓN */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50 shrink-0">
              <h2 className="text-lg font-bold text-slate-800">Editar Ejercicio</h2>
              <button onClick={() => setModalAbierto(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 flex flex-col gap-4 overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nombre del Ejercicio</label>
                <input 
                  type="text" 
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 bg-white placeholder-slate-400 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" /> Link de Video / YouTube / Drive
                  </label>
                  <input 
                    type="url" 
                    placeholder="Ej: https://youtube.com/watch?v=... o Link de Drive"
                    value={urlBase}
                    onChange={(e) => setUrlBase(e.target.value)}
                    className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 bg-white placeholder-slate-400 focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Categoría</label>
                  <select 
                    value={formData.categoria}
                    onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                    className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 bg-white focus:ring-2 focus:ring-rose-500 outline-none cursor-pointer"
                  >
                    {formData.categoria && !["Técnico", "Prep. Física - General", "Prep. Física - Tarjeta Roja", "Prep. Física - Tarjeta Azul", "Prep. Física - Tarjeta Amarilla", "Prep. Física - Tarjeta Verde", "Prep. Física - Tarjeta Naranja", "Flexibilidad", "Calentamiento", "Calma / Cierre"].includes(formData.categoria) && (
                      <option value={formData.categoria}>{formData.categoria}</option>
                    )}
                    <option value="Técnico">Técnico</option>
                    <option value="Prep. Física - General">Prep. Física - General</option>
                    <option value="Prep. Física - Tarjeta Roja">Prep. Física - Tarjeta Roja</option>
                    <option value="Prep. Física - Tarjeta Azul">Prep. Física - Tarjeta Azul</option>
                    <option value="Prep. Física - Tarjeta Amarilla">Prep. Física - Tarjeta Amarilla</option>
                    <option value="Prep. Física - Tarjeta Verde">Prep. Física - Tarjeta Verde</option>
                    <option value="Prep. Física - Tarjeta Naranja">Prep. Física - Tarjeta Naranja</option>
                    <option value="Flexibilidad">Flexibilidad</option>
                    <option value="Calentamiento">Calentamiento</option>
                    <option value="Calma / Cierre">Calma / Cierre</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Aparato</label>
                  <select 
                    value={formData.aparato}
                    onChange={(e) => setFormData({...formData, aparato: e.target.value})}
                    className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 bg-white focus:ring-2 focus:ring-rose-500 outline-none cursor-pointer"
                  >
                    {formData.aparato && !["Suelo", "Salto", "Barras Asimétricas", "Viga de Equilibrio", "Barra Fija", "Anillas", "Caballo con Arzones", "Barras Paralelas", "Trampolín / Tumbling", "General / Ninguno"].includes(formData.aparato) && (
                      <option value={formData.aparato}>{formData.aparato}</option>
                    )}
                    <option value="Suelo">Suelo</option>
                    <option value="Salto">Salto</option>
                    <option value="Barras Asimétricas">Barras Asimétricas</option>
                    <option value="Viga de Equilibrio">Viga de Equilibrio</option>
                    <option value="Barra Fija">Barra Fija</option>
                    <option value="Anillas">Anillas</option>
                    <option value="Caballo con Arzones">Caballo con Arzones</option>
                    <option value="Barras Paralelas">Barras Paralelas</option>
                    <option value="Trampolín / Tumbling">Trampolín / Tumbling</option>
                    <option value="General / Ninguno">General / Ninguno</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Dificultad</label>
                  <select 
                    value={formData.dificultad}
                    onChange={(e) => setFormData({...formData, dificultad: e.target.value})}
                    className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 bg-white focus:ring-2 focus:ring-rose-500 outline-none cursor-pointer"
                  >
                    {formData.dificultad && !["Básico", "Intermedio", "Avanzado", "Élite", "Niveles 1-3", "Niveles 4-6", "Niveles 7-9", "Nivel 10"].includes(formData.dificultad) && (
                      <option value={formData.dificultad}>{formData.dificultad}</option>
                    )}
                    <option value="Básico">Básico</option>
                    <option value="Intermedio">Intermedio</option>
                    <option value="Avanzado">Avanzado</option>
                    <option value="Élite">Élite</option>
                    <option value="Niveles 1-3">Niveles 1-3 (USAG)</option>
                    <option value="Niveles 4-6">Niveles 4-6 (USAG)</option>
                    <option value="Niveles 7-9">Niveles 7-9 (USAG)</option>
                    <option value="Nivel 10">Nivel 10 (USAG)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Rangos (Opcional)</label>
                  <select 
                    value={formData.rangos_repeticiones}
                    onChange={(e) => setFormData({...formData, rangos_repeticiones: e.target.value})}
                    className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 bg-white focus:ring-2 focus:ring-rose-500 outline-none cursor-pointer"
                  >
                    {formData.rangos_repeticiones && !["", "5-10 reps", "10-20 reps", "20-30 reps", "Al fallo", "10-30 seg", "30-60 seg", "1-2 min", "Personalizado"].includes(formData.rangos_repeticiones) && (
                      <option value={formData.rangos_repeticiones}>{formData.rangos_repeticiones}</option>
                    )}
                    <option value="">Sin rango</option>
                    <option value="5-10 reps">5-10 reps</option>
                    <option value="10-20 reps">10-20 reps</option>
                    <option value="20-30 reps">20-30 reps</option>
                    <option value="Al fallo">Al fallo</option>
                    <option value="10-30 seg">10-30 seg</option>
                    <option value="30-60 seg">30-60 seg</option>
                    <option value="1-2 min">1-2 min</option>
                    <option value="Personalizado">Personalizado (Detallar desc.)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Descripción Técnica</label>
                <textarea 
                  rows={3}
                  value={formData.descripcion_corta || formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion_corta: e.target.value})}
                  className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 bg-white placeholder-slate-400 focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 shrink-0">
              <button 
                onClick={() => setModalAbierto(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl text-sm font-bold transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={guardarCambios}
                disabled={guardando}
                className="px-5 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md"
              >
                {guardando ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : <><Save className="w-4 h-4" /> Guardar Cambios</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

"use client"

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Box, CheckSquare, Square, Loader2, Dumbbell, MoveDiagonal, Activity, Layers, Plus, X, Search, CloudLightning, Edit2, Check, Trash2 } from 'lucide-react'

type ClubInventoryUpdate = {
  inventario: string[]
  catalogo_extra?: string[]
}

const CATEGORIAS_BASE = [
  { categoria: 'Suelo y Acrobacia', icono: MoveDiagonal, items: ['Pedana con Resortes', 'Pista de Tumbling', 'AirTrack', 'Colchonetón de Caída'] },
  { categoria: 'Aparatos de Viga', icono: Activity, items: ['Viga Alta Oficial', 'Viga Baja', 'Viga a ras de piso', 'Líneas trazadas en suelo'] },
  { categoria: 'Aparatos de Barras', icono: Layers, items: ['Barras Asimétricas', 'Barra Simple (Fija)', 'Paralelas', 'Hongo / Arzones'] },
  { categoria: 'Salto y Vuelo', icono: Box, items: ['Mesa de Salto', 'Minitramp', 'Trampolín (Cama Elástica)', 'Foso de Espuma'] },
  { categoria: 'Prep. Física', icono: Dumbbell, items: ['Espalderas', 'Pesas / Discos', 'Cajas Pliométricas', 'Ligas de Resistencia'] }
]

export default function GestorInventario({ grupoId: clubId }: { grupoId: string }) {
  const [inventario, setInventario] = useState<string[]>([])
  const [catalogoExtra, setCatalogoExtra] = useState<string[]>([]) // 🔥 LA NUEVA MEMORIA
  const [cargando, setCargando] = useState(false)
  const [estadoGuardado, setEstadoGuardado] = useState<'sincronizado' | 'guardando'>('sincronizado')
  
  const [inputsManuales, setInputsManuales] = useState<Record<string, string>>({})
  const [itemEnEdicion, setItemEnEdicion] = useState<string | null>(null)
  const [valorEdicion, setValorEdicion] = useState<string>('')

  useEffect(() => {
    if (!clubId) return
    const cargarDatos = async () => {
      setCargando(true)
      const { data } = await supabase.from('clubs').select('inventario, catalogo_extra').eq('id', clubId).single()
      if (data) {
        if (data.inventario) setInventario(data.inventario)
        if (data.catalogo_extra) setCatalogoExtra(data.catalogo_extra)
      }
      setCargando(false)
    }
    cargarDatos()
  }, [clubId])

  // 🔥 GUARDA EN AMBAS COLUMNAS
  const actualizarEnNube = async (nuevoInventario: string[], nuevoCatalogo?: string[]) => {
    setInventario(nuevoInventario)
    if (nuevoCatalogo) setCatalogoExtra(nuevoCatalogo)
    setEstadoGuardado('guardando')
    
    try {
      const updates: ClubInventoryUpdate = { inventario: nuevoInventario }
      if (nuevoCatalogo) updates.catalogo_extra = nuevoCatalogo
      await supabase.from('clubs').update(updates).eq('id', clubId)
    } catch (error) {
      console.error("Error al auto-guardar:", error)
    } finally {
      setTimeout(() => setEstadoGuardado('sincronizado'), 800)
    }
  }

  const toggleItem = (item: string) => {
    const nuevoInventario = inventario.includes(item) 
      ? inventario.filter(i => i !== item) 
      : [...inventario, item]
    actualizarEnNube(nuevoInventario)
  }

  const manejarInput = (categoria: string, valor: string) => {
    setInputsManuales(prev => ({ ...prev, [categoria]: valor }))
  }

  const agregarItemManualAtachado = (categoria: string) => {
    const valor = inputsManuales[categoria]?.trim()
    if (!valor) return
    
    const itemFormateado = `${categoria} - ${valor}`
    const nuevoCatalogo = catalogoExtra.includes(itemFormateado) ? catalogoExtra : [...catalogoExtra, itemFormateado]
    const nuevoInventario = inventario.includes(itemFormateado) ? inventario : [...inventario, itemFormateado]
    
    actualizarEnNube(nuevoInventario, nuevoCatalogo)
    setInputsManuales(prev => ({ ...prev, [categoria]: '' }))
  }

  const iniciarEdicion = (itemFormateado: string, categoria: string) => {
    setItemEnEdicion(itemFormateado)
    setValorEdicion(itemFormateado.replace(`${categoria} - `, ''))
  }

  const guardarEdicion = (categoria: string) => {
    if (!itemEnEdicion || !valorEdicion.trim()) return
    const nuevoItemFormateado = `${categoria} - ${valorEdicion.trim()}`
    
    const nuevoCatalogo = catalogoExtra.map(item => item === itemEnEdicion ? nuevoItemFormateado : item)
    const nuevoInventario = inventario.map(item => item === itemEnEdicion ? nuevoItemFormateado : item)
    
    actualizarEnNube(nuevoInventario, nuevoCatalogo)
    setItemEnEdicion(null)
    setValorEdicion('')
  }

  const eliminarDelCatalogo = (itemFormateado: string) => {
    const nuevoCatalogo = catalogoExtra.filter(i => i !== itemFormateado)
    const nuevoInventario = inventario.filter(i => i !== itemFormateado)
    actualizarEnNube(nuevoInventario, nuevoCatalogo)
  }

  // Fusionamos el catálogo con cualquier implemento antiguo que tuvieras guardado
  const todosLosCustom = Array.from(new Set([
    ...catalogoExtra,
    ...inventario.filter(i => !CATEGORIAS_BASE.some(cat => cat.items.includes(i)))
  ]))

  if (!clubId) return null

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 mt-8 animate-in fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Box className="w-6 h-6 text-indigo-500" /> Inventario de Implementos
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Checkea o añade el material disponible en tu club. Se guarda automáticamente.</p>
        </div>
        
        <div className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-xs transition-all border ${estadoGuardado === 'guardando' ? 'bg-amber-50 text-amber-600 border-amber-200 shadow-sm' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
          {estadoGuardado === 'guardando' ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : <><CloudLightning className="w-4 h-4" /> Sincronizado</>}
        </div>
      </div>

      {cargando ? (
        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {CATEGORIAS_BASE.map((cat, index) => {
            const Icono = cat.icono
            const itemsManualesDeEstaCategoria = todosLosCustom.filter(i => i.startsWith(`${cat.categoria} - `))

            return (
              <div key={index} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col h-full">
                
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                  <Icono className="w-4 h-4 text-indigo-500" /> {cat.categoria}
                </h3>
                
                <div className="flex-1 flex flex-col gap-2.5">
                  {/* ITEMS BASE (Fijos) */}
                  {cat.items.map(item => {
                    const seleccionado = inventario.includes(item)
                    return (
                      <div key={item} onClick={() => toggleItem(item)} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border ${seleccionado ? 'bg-white border-indigo-200 shadow-sm' : 'border-transparent hover:bg-slate-100'}`}>
                        {seleccionado ? <CheckSquare className="w-5 h-5 text-indigo-600 shrink-0" /> : <Square className="w-5 h-5 text-slate-400 shrink-0" />}
                        <span className={`text-sm font-bold leading-tight ${seleccionado ? 'text-indigo-900' : 'text-slate-600'}`}>{item}</span>
                      </div>
                    )
                  })}

                  {/* 🔥 ITEMS MANUALES (Integrados, editables y con memoria) */}
                  {itemsManualesDeEstaCategoria.map(itemFormateado => {
                    const seleccionado = inventario.includes(itemFormateado)
                    const nombreLimpio = itemFormateado.replace(`${cat.categoria} - `, '')
                    const isEditing = itemEnEdicion === itemFormateado

                    if (isEditing) {
                      return (
                        <div key={itemFormateado} className="flex items-center gap-2 p-2 rounded-xl border bg-white border-indigo-300 shadow-sm w-full animate-in zoom-in-95 duration-200">
                          <input 
                            type="text" 
                            value={valorEdicion} 
                            onChange={(e) => setValorEdicion(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && guardarEdicion(cat.categoria)}
                            className="w-full text-sm font-bold bg-transparent outline-none text-indigo-900 pl-2"
                            autoFocus
                          />
                          <button onClick={() => guardarEdicion(cat.categoria)} className="text-emerald-500 hover:text-emerald-600 p-1 bg-emerald-50 rounded-lg"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setItemEnEdicion(null)} className="text-slate-400 hover:text-rose-500 p-1 bg-rose-50 rounded-lg"><X className="w-4 h-4" /></button>
                        </div>
                      )
                    }

                    return (
                      <div key={itemFormateado} className={`group flex items-center justify-between gap-3 p-2.5 rounded-xl transition-all border ${seleccionado ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
                        <div onClick={() => toggleItem(itemFormateado)} className="flex items-center gap-3 cursor-pointer flex-1">
                            {seleccionado ? <CheckSquare className="w-5 h-5 text-indigo-600 shrink-0" /> : <Square className="w-5 h-5 text-slate-400 shrink-0" />}
                            <span className={`text-sm font-bold leading-tight ${seleccionado ? 'text-indigo-900' : 'text-slate-600'}`}>{nombreLimpio}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => iniciarEdicion(itemFormateado, cat.categoria)} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 p-1.5 rounded-md" title="Editar"><Edit2 className="w-4 h-4"/></button>
                          <button onClick={() => eliminarDelCatalogo(itemFormateado)} className="text-slate-400 hover:text-rose-600 hover:bg-rose-100 p-1.5 rounded-md" title="Eliminar"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* AGREGAR NUEVO */}
                <div className="mt-6 pt-4 border-t border-slate-200/60">
                  <div className="flex items-center gap-2 relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400"/>
                    <input 
                      type="text" 
                      placeholder="Añadir material extra..." 
                      value={inputsManuales[cat.categoria] || ''}
                      onChange={(e) => manejarInput(cat.categoria, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && agregarItemManualAtachado(cat.categoria)}
                      className="w-full text-xs font-bold p-2.5 pl-9 pr-10 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 placeholder:text-slate-400 shadow-sm transition-all"
                    />
                    {inputsManuales[cat.categoria]?.trim().length > 0 && (
                      <button onClick={() => agregarItemManualAtachado(cat.categoria)} className="absolute right-1.5 top-1.5 p-1 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

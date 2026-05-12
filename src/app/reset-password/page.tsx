"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { AlertCircle, CheckCircle2, Loader2, Lock } from 'lucide-react'

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : 'Error desconocido'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [cargando, setCargando] = useState(false)
  const [preparando, setPreparando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)

  useEffect(() => {
    const prepararSesion = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
        }
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setPreparando(false)
      }
    }

    void prepararSesion()
  }, [])

  const guardarNuevaClave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMensajeExito(null)

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (password !== confirmacion) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setCargando(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      setMensajeExito('Contraseña actualizada correctamente. Ya puedes iniciar sesión.')
      setPassword('')
      setConfirmacion('')
      window.setTimeout(() => router.replace('/login'), 1800)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 font-sans p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-rose-500/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-slate-50 p-8 text-center border-b border-slate-100">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg mx-auto mb-4">
            <Lock size={30} />
          </div>
          <h1 className="text-2xl font-black tracking-wide text-slate-800">
            Restablecer Contraseña
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-2">
            Crea una nueva clave para tu cuenta.
          </p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl flex items-start gap-3 text-sm font-medium">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {mensajeExito && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-start gap-3 text-sm font-medium">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{mensajeExito}</p>
            </div>
          )}

          {preparando ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : (
            <form onSubmit={guardarNuevaClave} className="space-y-4">
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nueva contraseña</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none" />
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Confirmar contraseña</label>
                <input type="password" required value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none" />
              </div>

              <button type="submit" disabled={cargando} className={`w-full mt-2 py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-lg ${cargando ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/25'}`}>
                {cargando ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar nueva contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

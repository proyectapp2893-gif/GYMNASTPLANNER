"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useClubStore } from '../../../store/useClubStore'; // 🔥 Ruta corregida (le quité un '../')
import { Mail, Lock, Loader2, Dumbbell, AlertCircle, Building2, User, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombreClub, setNombreClub] = useState('');
  const [nombreEntrenador, setNombreEntrenador] = useState('');
  
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  
  const router = useRouter();
  const { setClubData } = useClubStore();

  // 🔥 TU LLAVE MAESTRA
  const SUPER_ADMIN_EMAIL = 'Gymnastplanner@gmail.com';

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError(null);
    setMensajeExito(null);

    try {
      if (isLogin) {
        // FLUJO 1: INICIAR SESIÓN
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw new Error('Correo o contraseña incorrectos.');

        if (authData.user) {
          
          // 🔥 MAGIA: ENRUTAMIENTO INTELIGENTE POR ROLES
          if (authData.user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
            // Es el dueño de la app. Lo mandamos directo a su bóveda secreta.
            router.push('/superadmin');
            return; // Detenemos la ejecución aquí, no necesita cargar datos de club.
          }

          // Si NO es el dueño, sigue el flujo normal para entrenadores de clubes
          const { data: perfilData, error: perfilError } = await supabase
            .from('perfiles')
            .select('club_id')
            .eq('id', authData.user.id)
            .single();

          if (perfilError || !perfilData) throw new Error('Perfil no encontrado.');

          const { data: clubData } = await supabase
            .from('clubs')
            .select('nombre, logo_url, estado')
            .eq('id', perfilData.club_id)
            .single();

          if (clubData?.estado === 'pendiente') {
            await supabase.auth.signOut();
            throw new Error('Tu club está en revisión. El administrador debe aprobar tu acceso.');
          }

          if (clubData) {
            setClubData({
              clubId: perfilData.club_id,
              nombreClub: clubData.nombre,
              logoUrl: clubData.logo_url || '/default-club-logo.png'
            });
          }
          router.push('/');
        }
      } else {
        // FLUJO 2: SOLICITAR ACCESO (REGISTRO)
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw new Error(authError.message);

        if (authData.user) {
          const { data: nuevoClub, error: clubError } = await supabase
            .from('clubs')
            .insert([{ nombre: nombreClub, estado: 'pendiente' }])
            .select()
            .single();

          if (clubError) throw new Error('Error al registrar el club.');

          const { error: perfilError } = await supabase
            .from('perfiles')
            .insert([{
              id: authData.user.id,
              email: email,
              nombre: nombreEntrenador,
              club_id: nuevoClub.id
            }]);

          if (perfilError) throw new Error('Error al crear el perfil.');

          setMensajeExito('¡Solicitud enviada! Nos contactaremos contigo cuando tu acceso sea aprobado.');
          setIsLogin(true);
          setEmail('');
          setPassword('');
          await supabase.auth.signOut(); 
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 font-sans p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-rose-500/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="bg-slate-50 p-8 text-center border-b border-slate-100 relative">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg mx-auto mb-4 rotate-3">
            <Dumbbell size={32} />
          </div>
          <h1 className="text-2xl font-black tracking-wide text-slate-800">
            Gymnast<span className="text-indigo-600">Planner</span>
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-2">
            {isLogin ? 'Plataforma de gestión deportiva' : 'Solicitud de acceso para clubes'}
          </p>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6">
            {isLogin ? 'Iniciar Sesión' : 'Crear Perfil de Club'}
          </h2>

          {error && (
            <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl flex items-start gap-3 text-sm font-medium animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {mensajeExito && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-start gap-3 text-sm font-medium animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{mensajeExito}</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nombre del Club</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Building2 className="h-5 w-5 text-slate-400" /></div>
                    <input type="text" required value={nombreClub} onChange={(e) => setNombreClub(e.target.value)} placeholder="Ej. G.A. Estrella" className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Tu Nombre (Head Coach)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><User className="h-5 w-5 text-slate-400" /></div>
                    <input type="text" required value={nombreEntrenador} onChange={(e) => setNombreEntrenador(e.target.value)} placeholder="Tu nombre completo" className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none" />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-slate-400" /></div>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="coach@club.com" className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-slate-400" /></div>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none" />
              </div>
            </div>

            <button type="submit" disabled={cargando} className={`w-full mt-2 py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-lg ${cargando ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/25'}`}>
              {cargando ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Entrar al Sistema' : 'Enviar Solicitud')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button type="button" onClick={() => { setIsLogin(!isLogin); setError(null); setMensajeExito(null); }} className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">
              {isLogin ? '¿No tienes cuenta? Solicita acceso aquí' : '¿Ya tienes acceso? Inicia sesión'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
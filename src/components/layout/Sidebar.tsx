'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useClubStore } from '../../../store/useClubStore';
import { supabase } from '../../lib/supabase';
import { Home, LayoutDashboard, Users, Dumbbell, ClipboardList, Award, Trophy, Settings, LogOut, BrainCircuit } from 'lucide-react';
import Image from 'next/image';

const MENU_ITEMS = [
  { name: 'Inicio', href: '/inicio', icon: Home },
  { name: 'Dashboard Anual', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Gimnastas', href: '/gimnastas', icon: Users },
  { name: 'Ejercicios', href: '/ejercicios', icon: Dumbbell },
  { name: 'Test Físicos', href: '/evaluaciones', icon: ClipboardList },
  { name: 'Jueceo Oficial', href: '/puntuacion', icon: Award },
  { name: 'Resultados', href: '/ranking', icon: Trophy },
  { name: 'Análisis IA', href: '/analisis', icon: BrainCircuit },
  { name: 'Catálogos', href: '/configuracion/catalogos-individuales', icon: Settings },
];

export default function Sidebar() {
  const { nombreClub, logoUrl, clearClubData } = useClubStore();
  const pathname = usePathname();
  const router = useRouter();

  const handleCerrarSesion = async () => {
    await supabase.auth.signOut();
    if (clearClubData) clearClubData();
    window.location.replace('/');
  };

  useEffect(() => {
    MENU_ITEMS.forEach((item) => router.prefetch(item.href));
    router.prefetch('/configuracion');
  }, [router]);

  if (pathname === '/' || pathname === '/login' || pathname === '/superadmin' || /^\/gimnastas\/[^/]+/.test(pathname)) return null;

  return (
    // 🔥 1. Cambiamos de aside a div y usamos h-full para evitar la franja negra
    <div className="flex h-full w-20 flex-col border-r border-slate-800/50 bg-[#0f172a] font-sans text-slate-300 shadow-2xl md:w-64">
      
      {/* 2. Logo principal de GymnastPlanner más compacto */}
      <div className="flex items-center justify-center py-5 border-b border-slate-800/50 shrink-0">
        <Image src="/logo.png" alt="Logo GymnastPlanner" width={384} height={345} priority className="h-auto w-full max-w-[64px] object-contain drop-shadow-2xl transition-transform duration-300 hover:scale-105 md:max-w-[150px]" />
      </div>

      {/* 3. Tarjeta de Club COMPACTA Y HORIZONTAL */}
      <div className="shrink-0 border-b border-slate-800/50 p-2 md:p-4">
        <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/40 p-2 transition-colors hover:bg-slate-800/60 md:justify-start md:p-2.5">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-600 bg-slate-900 shadow-inner md:h-10 md:w-10">
            {logoUrl && logoUrl !== '/default-club-logo.png' && logoUrl.trim() !== '' ? (
               <Image src={logoUrl} alt="Logo del club" fill unoptimized className="object-cover" />
            ) : (
               <span className="text-[9px] text-slate-500 font-bold">Logo</span>
            )}
          </div>
          <div className="hidden min-w-0 flex-col md:flex">
            <h2 className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Club Activo</h2>
            <p className="text-sm font-bold text-white truncate">{nombreClub || 'Cargando...'}</p>
          </div>
        </div>
      </div>

      {/* 4. Menú de Navegación Ajustado */}
      <nav className="hide-scrollbar flex-1 space-y-1 overflow-y-auto px-2 py-4 md:px-3">
        {MENU_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;
          
          return (
            <button 
              key={item.name} 
              onClick={() => router.push(item.href)} 
              title={item.name}
              className={`flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-200 md:justify-start ${
                isActive 
                  ? 'bg-indigo-500/10 text-indigo-400' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-indigo-400' : 'text-slate-500'} />
              <span className="hidden md:inline">{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* 5. Botones de Configuración y Cerrar Sesión compactos */}
      <div className="flex shrink-0 flex-col gap-2 border-t border-slate-800/50 p-2 md:p-4">
        <button 
          onClick={() => router.push('/configuracion')}
          title="Configuración"
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold shadow-sm transition-colors ${
            pathname?.startsWith('/configuracion')
              ? 'bg-indigo-600 text-white shadow-indigo-500/25' 
              : 'bg-slate-800 text-slate-300 hover:bg-indigo-600 hover:text-white'
          }`}
        >
          <Settings size={18} />
          <span className="hidden md:inline">Configuración</span>
        </button>
        
        <button 
          onClick={handleCerrarSesion}
          title="Salir"
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-500"
        >
          <LogOut size={18} />
          <span className="hidden md:inline">Salir</span>
        </button>
      </div>

      {/* Estilo para ocultar la barra de scroll fea en el menú si hay muchos items */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}

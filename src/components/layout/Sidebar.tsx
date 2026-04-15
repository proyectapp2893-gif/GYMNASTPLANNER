'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useClubStore } from '../../../store/useClubStore';
import { supabase } from '../../lib/supabase';
import { Home, LayoutDashboard, Users, Dumbbell, ClipboardList, Award, Trophy, Settings, LogOut, BrainCircuit } from 'lucide-react';

export default function Sidebar() {
  const { nombreClub, logoUrl, clearClubData } = useClubStore();
  const pathname = usePathname();
  const router = useRouter();

  const handleCerrarSesion = async () => {
    await supabase.auth.signOut();
    if (clearClubData) clearClubData();
    router.replace('/');
  };

  if (pathname === '/' || pathname === '/login' || pathname === '/superadmin') return null;

  const menuItems = [
    { name: 'Inicio', href: '/inicio', icon: Home },
    { name: 'Dashboard Anual', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Gimnastas', href: '/atletas', icon: Users },
    { name: 'Ejercicios', href: '/ejercicios', icon: Dumbbell },
    { name: 'Test Físicos', href: '/evaluaciones', icon: ClipboardList },
    { name: 'Jueceo Oficial', href: '/puntuacion', icon: Award },
    { name: 'Resultados', href: '/ranking', icon: Trophy },
    { name: 'Análisis IA', href: '/analisis', icon: BrainCircuit }, 
  ];

  return (
    // 🔥 1. Cambiamos de aside a div y usamos h-full para evitar la franja negra
    <div className="w-64 h-full bg-[#0f172a] text-slate-300 flex flex-col font-sans border-r border-slate-800/50 shadow-2xl">
      
      {/* 2. Logo principal de GymnastPlanner más compacto */}
      <div className="flex items-center justify-center py-5 border-b border-slate-800/50 shrink-0">
        <img 
          src="/logo.png" 
          alt="Logo GymnastPlanner" 
          className="w-full max-w-[150px] object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* 3. Tarjeta de Club COMPACTA Y HORIZONTAL */}
      <div className="p-4 shrink-0 border-b border-slate-800/50">
        <div className="flex items-center gap-3 bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/50 hover:bg-slate-800/60 transition-colors">
          <div className="w-10 h-10 relative rounded-lg border border-slate-600 overflow-hidden bg-slate-900 flex items-center justify-center shrink-0 shadow-inner">
            {logoUrl && logoUrl !== '/default-club-logo.png' && logoUrl.trim() !== '' ? (
               <img src={logoUrl} alt="Logo Club" className="w-full h-full object-cover" />
            ) : (
               <span className="text-[9px] text-slate-500 font-bold">Logo</span>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <h2 className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Club Activo</h2>
            <p className="text-sm font-bold text-white truncate">{nombreClub || 'Cargando...'}</p>
          </div>
        </div>
      </div>

      {/* 4. Menú de Navegación Ajustado */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto hide-scrollbar">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;
          
          return (
            <button 
              key={item.name} 
              onClick={() => router.push(item.href)} 
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-bold ${
                isActive 
                  ? 'bg-indigo-500/10 text-indigo-400' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-indigo-400' : 'text-slate-500'} />
              {item.name}
            </button>
          );
        })}
      </nav>

      {/* 5. Botones de Configuración y Cerrar Sesión compactos */}
      <div className="p-4 border-t border-slate-800/50 flex flex-col gap-2 shrink-0">
        <button 
          onClick={() => router.push('/configuracion')}
          className={`flex items-center justify-center gap-2 w-full text-sm font-bold py-2.5 rounded-xl transition-colors shadow-sm ${
            pathname === '/configuracion' 
              ? 'bg-indigo-600 text-white shadow-indigo-500/25' 
              : 'bg-slate-800 text-slate-300 hover:bg-indigo-600 hover:text-white'
          }`}
        >
          <Settings size={18} />
          Configuración
        </button>
        
        <button 
          onClick={handleCerrarSesion}
          className="flex items-center justify-center gap-2 w-full text-slate-400 text-sm font-bold py-2.5 rounded-xl hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
        >
          <LogOut size={18} />
          Salir
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
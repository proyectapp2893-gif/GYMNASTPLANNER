'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  BrainCircuit,
  ClipboardList,
  Dumbbell,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  SlidersHorizontal,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useClubStore } from '../../../store/useClubStore'

const items = [
  { name: 'Inicio', href: '/inicio', icon: Home },
  { name: 'Dashboard Anual', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Gimnastas', href: '/gimnastas', icon: Users },
  { name: 'Ejercicios', href: '/ejercicios', icon: Dumbbell },
  { name: 'Test Físicos', href: '/evaluaciones', icon: ClipboardList },
  { name: 'Jueceo Oficial', href: '/puntuacion', icon: ClipboardList },
  { name: 'Resultados', href: '/ranking', icon: Trophy },
  { name: 'Análisis IA', href: '/analisis', icon: BrainCircuit },
  { name: 'Catálogos', href: '/configuracion/catalogos-individuales', icon: SlidersHorizontal },
  { name: 'Configuración', href: '/configuracion', icon: Settings },
]

export default function MobileNavigation() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { nombreClub, clearClubData } = useClubStore()

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/reset-password' ||
    pathname.startsWith('/superadmin')
  ) return null

  const active = (href: string) => href === '/configuracion'
    ? pathname === href || (pathname.startsWith('/configuracion/') && !pathname.startsWith('/configuracion/catalogos-individuales'))
    : pathname === href || pathname.startsWith(`${href}/`)

  const signOut = async () => {
    await supabase.auth.signOut()
    clearClubData?.()
    window.location.replace('/')
  }

  return <>
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur md:hidden">
      <Link href="/inicio" className="flex min-w-0 items-center gap-2">
        <span className="relative h-10 w-12 shrink-0 overflow-hidden rounded-lg bg-white">
          <Image src="/logo.png" alt="GymnastPlanner" fill loading="eager" sizes="48px" className="object-cover object-[center_45%]" />
        </span>
        <span className="truncate text-sm font-black text-slate-800">{nombreClub || 'GymnastPlanner'}</span>
      </Link>
      <button type="button" onClick={() => setOpen(true)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white" aria-label="Abrir menú" aria-expanded={open} aria-controls="mobile-navigation-drawer">
        <Menu />
      </button>
    </header>

    {open && <div className="fixed inset-0 z-[200] md:hidden">
      <button type="button" aria-label="Cerrar menú" onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
      <aside id="mobile-navigation-drawer" role="dialog" aria-modal="true" aria-label="Navegación principal" className="absolute inset-y-0 right-0 flex w-[min(88vw,360px)] flex-col bg-slate-950 p-4 text-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-indigo-400">Club activo</p>
            <p className="mt-1 truncate font-black">{nombreClub || 'GymnastPlanner'}</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800" aria-label="Cerrar">
            <X />
          </button>
        </div>
        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto overscroll-contain">
          {items.map(item => {
            const Icon = item.icon
            const selected = active(item.href)
            return <Link key={item.href} href={item.href} prefetch={false} onClick={() => setOpen(false)} aria-current={selected ? 'page' : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold ${selected ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
              <Icon className="h-5 w-5 shrink-0" />{item.name}
            </Link>
          })}
        </nav>
        <button type="button" onClick={signOut} className="mt-3 flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 font-bold text-rose-300 hover:bg-rose-500/10">
          <LogOut className="h-5 w-5" />Salir
        </button>
      </aside>
    </div>}
  </>
}

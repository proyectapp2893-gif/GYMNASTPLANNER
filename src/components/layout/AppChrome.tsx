'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import MobileNavigation from './MobileNavigation'

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname.startsWith('/plan-compartido/')) {
    return <main id="contenido-principal" className="min-w-0 flex-1">{children}</main>
  }
  return <>
    <MobileNavigation />
    <aside className="sticky top-0 z-40 hidden h-screen shrink-0 md:block"><Sidebar /></aside>
    <main id="contenido-principal" className="flex min-w-0 flex-1 flex-col overflow-x-clip">{children}</main>
  </>
}

import type { Metadata } from "next";
import "./globals.css";
// Importamos nuestro nuevo componente
import Sidebar from "../components/layout/Sidebar"; 
import MobileNavigation from "../components/layout/MobileNavigation";
import ClubSessionProvider from "../components/auth/ClubSessionProvider";
import RecoveryLinkRedirect from "../components/auth/RecoveryLinkRedirect";

export const metadata: Metadata = {
  title: "GymnastPlanner",
  description: "Sistema integral de gestión para gimnasia artística",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      {/* 1. Devolvemos el scroll nativo a la página (min-h-screen).
        ¡Esto revive el autoscroll del Drag & Drop para que suba la pantalla sola!
      */}
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased md:flex">
        <ClubSessionProvider>
          <RecoveryLinkRedirect />
          <MobileNavigation />
          
          {/* 2. WRAPPER DEL SIDEBAR: 
              'shrink-0' -> Prohíbe que el contenido principal lo aplaste (recupera su tamaño).
              'sticky top-0' -> Se queda clavado en la pantalla aunque hagas scroll hacia abajo.
              'h-screen' -> Mantiene siempre la altura completa de tu monitor.
          */}
          <aside className="sticky top-0 z-40 hidden h-screen shrink-0 md:block">
            <Sidebar />
          </aside>
          
          {/* 3. EL CONTENIDO PRINCIPAL: 
              'flex-1' -> Toma todo el espacio sobrante.
              'min-w-0' -> Evita que los gráficos rompan la pantalla hacia los lados.
          */}
          <main id="contenido-principal" className="flex min-w-0 flex-1 flex-col overflow-x-clip">
            {children}
          </main>
        </ClubSessionProvider>
        
      </body>
    </html>
  );
}

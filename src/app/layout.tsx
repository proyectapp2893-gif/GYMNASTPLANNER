import type { Metadata } from "next";
import "./globals.css";
import AppChrome from "../components/layout/AppChrome";
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
          <AppChrome>{children}</AppChrome>
        </ClubSessionProvider>
        
      </body>
    </html>
  );
}

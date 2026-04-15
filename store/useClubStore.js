import { create } from 'zustand';

export const useClubStore = create((set) => ({
  // Estado inicial vacío
  clubId: null,
  nombreClub: 'Cargando...',
  logoUrl: '/default-club-logo.png', // Logo por defecto si el club no ha subido uno
  colorPrincipal: '#0F172A',
  
  // Acción para actualizar los datos (se usará en el Login y en Configuración)
  setClubData: (data) => set((state) => ({ ...state, ...data })),
  
  // Acción para limpiar al cerrar sesión
  clearClubData: () => set({ 
    clubId: null, 
    nombreClub: '', 
    logoUrl: '/default-club-logo.png', 
    colorPrincipal: '#0F172A' 
  })
}));
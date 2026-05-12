export type JsonObject = Record<string, unknown>

export interface Club {
  id: string
  nombre?: string | null
  logo_url?: string | null
  acceso_biblioteca_elite?: boolean | null
  inventario?: string[] | null
  catalogo_extra?: string[] | null
}

export interface Grupo {
  id: string
  nombre: string
  nivel?: string | null
  club_id?: string | null
}

export interface Atleta {
  id: string
  nombre: string
  fecha_nacimiento?: string | null
  grupo_id?: string | null
  club_id?: string | null
}

export interface Ejercicio {
  id: string
  nombre: string
  categoria?: string | null
  dificultad?: string | null
  aparato?: string | null
  descripcion?: string | null
  descripcion_corta?: string | null
  rangos_repeticiones?: string | null
  video_url?: string | null
  club_id?: string | null
  created_at?: string | null
}

export interface EvaluacionFisica {
  id: string
  atleta_id: string
  grupo_id?: string | null
  club_id?: string | null
  fecha?: string | null
  resultados?: JsonObject | null
  observaciones?: string | null
}

export interface Competencia {
  id: string
  nombre: string
  fecha: string
  tipo?: string | null
  club_id?: string | null
}

export interface Puntuacion {
  id?: string
  competencia_id: string
  atleta_id: string
  aparato: string
  nota_d?: number | null
  nota_e?: number | null
  nota_final?: number | null
}

export interface Sesion {
  id: string
  club_id?: string | null
  nivel?: string | null
  objetivo?: string | null
  ejercicios?: JsonObject | null
  fecha_calendario?: string | null
  created_at?: string | null
}

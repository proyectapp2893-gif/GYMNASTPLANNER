export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ajustes_plan_individual: {
        Row: {
          club_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          entidad_origen_id: string | null
          entidad_tipo: string
          estado_sincronizacion: string
          id: string
          motivo: string | null
          origen: string
          plan_individual_id: string
          reemplazo_id: string | null
          resuelto_at: string | null
          resuelto_por: string | null
          ruta_campo: string | null
          updated_at: string
          updated_by: string | null
          valor: Json | null
          version_base: number
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          entidad_origen_id?: string | null
          entidad_tipo: string
          estado_sincronizacion?: string
          id?: string
          motivo?: string | null
          origen: string
          plan_individual_id: string
          reemplazo_id?: string | null
          resuelto_at?: string | null
          resuelto_por?: string | null
          ruta_campo?: string | null
          updated_at?: string
          updated_by?: string | null
          valor?: Json | null
          version_base: number
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          entidad_origen_id?: string | null
          entidad_tipo?: string
          estado_sincronizacion?: string
          id?: string
          motivo?: string | null
          origen?: string
          plan_individual_id?: string
          reemplazo_id?: string | null
          resuelto_at?: string | null
          resuelto_por?: string | null
          ruta_campo?: string | null
          updated_at?: string
          updated_by?: string | null
          valor?: Json | null
          version_base?: number
        }
        Relationships: [
          {
            foreignKeyName: "ajustes_plan_individual_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajustes_plan_individual_plan_individual_id_fkey"
            columns: ["plan_individual_id"]
            isOneToOne: false
            referencedRelation: "planes_individuales"
            referencedColumns: ["id"]
          },
        ]
      }
      asistencia: {
        Row: {
          atleta_id: string
          club_id: string
          created_at: string
          estado: string
          fecha: string
          id: string
          motivo: string | null
          porcentaje_participacion: number | null
          registrado_por: string | null
          sesion_id: string | null
          updated_at: string
        }
        Insert: {
          atleta_id: string
          club_id: string
          created_at?: string
          estado: string
          fecha: string
          id?: string
          motivo?: string | null
          porcentaje_participacion?: number | null
          registrado_por?: string | null
          sesion_id?: string | null
          updated_at?: string
        }
        Update: {
          atleta_id?: string
          club_id?: string
          created_at?: string
          estado?: string
          fecha?: string
          id?: string
          motivo?: string | null
          porcentaje_participacion?: number | null
          registrado_por?: string | null
          sesion_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asistencia_atleta_id_fkey"
            columns: ["atleta_id"]
            isOneToOne: false
            referencedRelation: "atletas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencia_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencia_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "sesiones"
            referencedColumns: ["id"]
          },
        ]
      }
      atleta_entrenadores: {
        Row: {
          atleta_id: string
          club_id: string
          created_at: string
          created_by: string | null
          entrenador_id: string
          es_principal: boolean
          fecha_fin: string | null
          fecha_inicio: string
          id: string
        }
        Insert: {
          atleta_id: string
          club_id: string
          created_at?: string
          created_by?: string | null
          entrenador_id: string
          es_principal?: boolean
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
        }
        Update: {
          atleta_id?: string
          club_id?: string
          created_at?: string
          created_by?: string | null
          entrenador_id?: string
          es_principal?: boolean
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atleta_entrenadores_atleta_id_fkey"
            columns: ["atleta_id"]
            isOneToOne: false
            referencedRelation: "atletas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atleta_entrenadores_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atleta_entrenadores_entrenador_id_fkey"
            columns: ["entrenador_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      atletas: {
        Row: {
          avatar_path: string | null
          categoria_competitiva: string | null
          club_id: string | null
          created_at: string | null
          deleted_at: string | null
          disponibilidad_semanal: Json
          duracion_sesion_habitual_min: number | null
          fecha_ingreso: string | null
          fecha_nacimiento: string | null
          grupo_id: string | null
          id: string
          lateralidad: string | null
          nombre: string
          objetivo_temporada: string | null
          observaciones: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          avatar_path?: string | null
          categoria_competitiva?: string | null
          club_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          disponibilidad_semanal?: Json
          duracion_sesion_habitual_min?: number | null
          fecha_ingreso?: string | null
          fecha_nacimiento?: string | null
          grupo_id?: string | null
          id?: string
          lateralidad?: string | null
          nombre: string
          objetivo_temporada?: string | null
          observaciones?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          avatar_path?: string | null
          categoria_competitiva?: string | null
          club_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          disponibilidad_semanal?: Json
          duracion_sesion_habitual_min?: number | null
          fecha_ingreso?: string | null
          fecha_nacimiento?: string | null
          grupo_id?: string | null
          id?: string
          lateralidad?: string | null
          nombre?: string
          objetivo_temporada?: string | null
          observaciones?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atletas_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria: {
        Row: {
          accion: string
          club_id: string | null
          contexto: Json
          created_at: string
          entidad: string
          entidad_id: string | null
          id: number
          motivo: string | null
          usuario_id: string | null
          valor_anterior: Json | null
          valor_nuevo: Json | null
        }
        Insert: {
          accion: string
          club_id?: string | null
          contexto?: Json
          created_at?: string
          entidad: string
          entidad_id?: string | null
          id?: never
          motivo?: string | null
          usuario_id?: string | null
          valor_anterior?: Json | null
          valor_nuevo?: Json | null
        }
        Update: {
          accion?: string
          club_id?: string | null
          contexto?: Json
          created_at?: string
          entidad?: string
          entidad_id?: string | null
          id?: never
          motivo?: string | null
          usuario_id?: string | null
          valor_anterior?: Json | null
          valor_nuevo?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      bateria_pruebas_items: {
        Row: {
          bateria_id: string
          orden: number
          prueba_id: string
          requerida: boolean
        }
        Insert: {
          bateria_id: string
          orden?: number
          prueba_id: string
          requerida?: boolean
        }
        Update: {
          bateria_id?: string
          orden?: number
          prueba_id?: string
          requerida?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "bateria_pruebas_items_bateria_id_fkey"
            columns: ["bateria_id"]
            isOneToOne: false
            referencedRelation: "baterias_pruebas_fisicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bateria_pruebas_items_prueba_id_fkey"
            columns: ["prueba_id"]
            isOneToOne: false
            referencedRelation: "catalogo_pruebas_fisicas"
            referencedColumns: ["id"]
          },
        ]
      }
      baterias_pruebas_fisicas: {
        Row: {
          activa: boolean
          club_id: string
          created_at: string
          created_by: string | null
          descripcion: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          club_id: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          club_id?: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "baterias_pruebas_fisicas_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      bloques_sesion: {
        Row: {
          club_id: string
          completado: boolean
          contenido: Json
          created_at: string
          duracion_prevista_min: number
          duracion_real_min: number | null
          fase_item_id: string
          id: string
          objetivo: string | null
          orden: number
          origen: string
          sesion_id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          club_id: string
          completado?: boolean
          contenido?: Json
          created_at?: string
          duracion_prevista_min?: number
          duracion_real_min?: number | null
          fase_item_id: string
          id?: string
          objetivo?: string | null
          orden: number
          origen?: string
          sesion_id: string
          titulo: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          completado?: boolean
          contenido?: Json
          created_at?: string
          duracion_prevista_min?: number
          duracion_real_min?: number | null
          fase_item_id?: string
          id?: string
          objetivo?: string | null
          orden?: number
          origen?: string
          sesion_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bloques_sesion_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bloques_sesion_fase_item_id_fkey"
            columns: ["fase_item_id"]
            isOneToOne: false
            referencedRelation: "catalogo_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bloques_sesion_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "sesiones"
            referencedColumns: ["id"]
          },
        ]
      }
      cargas_entrenamiento: {
        Row: {
          aterrizajes: number | null
          atleta_id: string
          carga_interna: number | null
          club_id: string
          created_at: string
          distribucion_aparatos: Json
          distribucion_capacidades: Json
          duracion_prevista_min: number | null
          duracion_real_min: number | null
          fecha: string
          id: string
          intensidad_planificada: number | null
          intensidad_real: number | null
          intentos: number | null
          registrado_por: string | null
          rpe_sesion: number | null
          sesion_id: string | null
          updated_at: string
          volumen_tecnico: number | null
        }
        Insert: {
          aterrizajes?: number | null
          atleta_id: string
          carga_interna?: number | null
          club_id: string
          created_at?: string
          distribucion_aparatos?: Json
          distribucion_capacidades?: Json
          duracion_prevista_min?: number | null
          duracion_real_min?: number | null
          fecha: string
          id?: string
          intensidad_planificada?: number | null
          intensidad_real?: number | null
          intentos?: number | null
          registrado_por?: string | null
          rpe_sesion?: number | null
          sesion_id?: string | null
          updated_at?: string
          volumen_tecnico?: number | null
        }
        Update: {
          aterrizajes?: number | null
          atleta_id?: string
          carga_interna?: number | null
          club_id?: string
          created_at?: string
          distribucion_aparatos?: Json
          distribucion_capacidades?: Json
          duracion_prevista_min?: number | null
          duracion_real_min?: number | null
          fecha?: string
          id?: string
          intensidad_planificada?: number | null
          intensidad_real?: number | null
          intentos?: number | null
          registrado_por?: string | null
          rpe_sesion?: number | null
          sesion_id?: string | null
          updated_at?: string
          volumen_tecnico?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cargas_entrenamiento_atleta_id_fkey"
            columns: ["atleta_id"]
            isOneToOne: false
            referencedRelation: "atletas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_entrenamiento_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_entrenamiento_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "sesiones"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_items: {
        Row: {
          activo: boolean
          catalogo_id: string
          club_id: string | null
          codigo: string
          created_at: string
          created_by: string | null
          descripcion: string | null
          id: string
          metadatos: Json
          nombre: string
          orden: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          catalogo_id: string
          club_id?: string | null
          codigo: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          id?: string
          metadatos?: Json
          nombre: string
          orden?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          catalogo_id?: string
          club_id?: string | null
          codigo?: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          id?: string
          metadatos?: Json
          nombre?: string
          orden?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_items_catalogo_id_fkey"
            columns: ["catalogo_id"]
            isOneToOne: false
            referencedRelation: "catalogos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_items_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_pruebas_fisicas: {
        Row: {
          activo: boolean
          capacidad_item_id: string | null
          club_id: string | null
          codigo: string
          created_at: string
          created_by: string | null
          id: string
          instrucciones: string | null
          mayor_es_mejor: boolean
          metadatos: Json
          nombre: string
          unidad: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          capacidad_item_id?: string | null
          club_id?: string | null
          codigo: string
          created_at?: string
          created_by?: string | null
          id?: string
          instrucciones?: string | null
          mayor_es_mejor?: boolean
          metadatos?: Json
          nombre: string
          unidad: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          capacidad_item_id?: string | null
          club_id?: string | null
          codigo?: string
          created_at?: string
          created_by?: string | null
          id?: string
          instrucciones?: string | null
          mayor_es_mejor?: boolean
          metadatos?: Json
          nombre?: string
          unidad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_pruebas_fisicas_capacidad_item_id_fkey"
            columns: ["capacidad_item_id"]
            isOneToOne: false
            referencedRelation: "catalogo_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_pruebas_fisicas_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogos: {
        Row: {
          club_id: string | null
          codigo: string
          created_at: string
          descripcion: string | null
          editable: boolean
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          club_id?: string | null
          codigo: string
          created_at?: string
          descripcion?: string | null
          editable?: boolean
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          club_id?: string | null
          codigo?: string
          created_at?: string
          descripcion?: string | null
          editable?: boolean
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogos_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          acceso_biblioteca_elite: boolean | null
          catalogo_extra: Json | null
          color_principal: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          estado: string | null
          id: string
          inventario: Json | null
          logo_url: string | null
          nombre: string
        }
        Insert: {
          acceso_biblioteca_elite?: boolean | null
          catalogo_extra?: Json | null
          color_principal?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          estado?: string | null
          id?: string
          inventario?: Json | null
          logo_url?: string | null
          nombre: string
        }
        Update: {
          acceso_biblioteca_elite?: boolean | null
          catalogo_extra?: Json | null
          color_principal?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          estado?: string | null
          id?: string
          inventario?: Json | null
          logo_url?: string | null
          nombre?: string
        }
        Relationships: []
      }
      competencias: {
        Row: {
          aparatos: Json
          categoria: string | null
          ciudad: string | null
          club_id: string | null
          created_at: string | null
          deleted_at: string | null
          fecha: string
          fecha_fin: string | null
          fecha_limite_preparacion: string | null
          id: string
          nivel: string | null
          nombre: string
          reglamento: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          aparatos?: Json
          categoria?: string | null
          ciudad?: string | null
          club_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          fecha: string
          fecha_fin?: string | null
          fecha_limite_preparacion?: string | null
          id?: string
          nivel?: string | null
          nombre: string
          reglamento?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          aparatos?: Json
          categoria?: string | null
          ciudad?: string | null
          club_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          fecha?: string
          fecha_fin?: string | null
          fecha_limite_preparacion?: string | null
          id?: string
          nivel?: string | null
          nombre?: string
          reglamento?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      competencias_atleta: {
        Row: {
          atleta_id: string
          club_id: string
          competencia_id: string
          created_at: string
          created_by: string | null
          elementos_opcionales: Json
          elementos_requeridos: Json
          id: string
          objetivo_ejecucion: string | null
          objetivo_resultado: string | null
          prioridades: Json
          rutinas: Json
          updated_at: string
        }
        Insert: {
          atleta_id: string
          club_id: string
          competencia_id: string
          created_at?: string
          created_by?: string | null
          elementos_opcionales?: Json
          elementos_requeridos?: Json
          id?: string
          objetivo_ejecucion?: string | null
          objetivo_resultado?: string | null
          prioridades?: Json
          rutinas?: Json
          updated_at?: string
        }
        Update: {
          atleta_id?: string
          club_id?: string
          competencia_id?: string
          created_at?: string
          created_by?: string | null
          elementos_opcionales?: Json
          elementos_requeridos?: Json
          id?: string
          objetivo_ejecucion?: string | null
          objetivo_resultado?: string | null
          prioridades?: Json
          rutinas?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competencias_atleta_atleta_id_fkey"
            columns: ["atleta_id"]
            isOneToOne: false
            referencedRelation: "atletas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competencias_atleta_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competencias_atleta_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "competencias"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion_carga: {
        Row: {
          aumento_semanal_aviso_pct: number
          club_id: string
          fatiga_alta: number
          rpe_alto: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          aumento_semanal_aviso_pct?: number
          club_id: string
          fatiga_alta?: number
          rpe_alto?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          aumento_semanal_aviso_pct?: number
          club_id?: string
          fatiga_alta?: number
          rpe_alto?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracion_carga_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion_evidencias: {
        Row: {
          club_id: string
          tamano_maximo_mb: number
          tipos_mime_permitidos: string[]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          club_id: string
          tamano_maximo_mb?: number
          tipos_mime_permitidos?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          club_id?: string
          tamano_maximo_mb?: number
          tipos_mime_permitidos?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracion_evidencias_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion_grupos: {
        Row: {
          competencias_secundarias: Json | null
          created_at: string | null
          fecha_competencia: string | null
          fecha_inicio: string | null
          grupo_id: string | null
          horario_semanal: Json | null
          id: string
          inventario: Json | null
          semanas_competitivo: number | null
          semanas_preparatorio: number | null
          semanas_totales: number | null
        }
        Insert: {
          competencias_secundarias?: Json | null
          created_at?: string | null
          fecha_competencia?: string | null
          fecha_inicio?: string | null
          grupo_id?: string | null
          horario_semanal?: Json | null
          id?: string
          inventario?: Json | null
          semanas_competitivo?: number | null
          semanas_preparatorio?: number | null
          semanas_totales?: number | null
        }
        Update: {
          competencias_secundarias?: Json | null
          created_at?: string | null
          fecha_competencia?: string | null
          fecha_inicio?: string | null
          grupo_id?: string | null
          horario_semanal?: Json | null
          id?: string
          inventario?: Json | null
          semanas_competitivo?: number | null
          semanas_preparatorio?: number | null
          semanas_totales?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracion_grupos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: true
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      ejercicios: {
        Row: {
          aparato: string | null
          categoria: string
          club_id: string | null
          created_at: string | null
          descripcion: string | null
          descripcion_corta: string | null
          dificultad: string | null
          etiquetas: string | null
          id: string
          nombre: string
          rangos_repeticiones: string | null
          video_url: string | null
        }
        Insert: {
          aparato?: string | null
          categoria: string
          club_id?: string | null
          created_at?: string | null
          descripcion?: string | null
          descripcion_corta?: string | null
          dificultad?: string | null
          etiquetas?: string | null
          id?: string
          nombre: string
          rangos_repeticiones?: string | null
          video_url?: string | null
        }
        Update: {
          aparato?: string | null
          categoria?: string
          club_id?: string | null
          created_at?: string | null
          descripcion?: string | null
          descripcion_corta?: string | null
          dificultad?: string | null
          etiquetas?: string | null
          id?: string
          nombre?: string
          rangos_repeticiones?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      ejercicios_sesion: {
        Row: {
          bloque_id: string
          capacidad_dominante: string | null
          carga: number | null
          club_id: string
          created_at: string
          dificultad: string | null
          distancia_metros: number | null
          ejercicio_id: string | null
          elemento_tecnico_id: string | null
          errores_comunes: string | null
          id: string
          instrucciones: string | null
          intentos_reales: number | null
          observaciones_ejecucion: string | null
          orden: number
          origen: string
          patron_movimiento: string | null
          pausa_segundos: number | null
          plano_movimiento: string | null
          progresion: string | null
          regresion: string | null
          repeticiones: number | null
          repeticiones_reales: number | null
          rpe_esperado: number | null
          segmento_corporal: string | null
          series: number | null
          sistema_energetico: string | null
          tempo: string | null
          tiempo_segundos: number | null
          transferencia_aparato: string | null
          unidad_carga: string | null
          updated_at: string
        }
        Insert: {
          bloque_id: string
          capacidad_dominante?: string | null
          carga?: number | null
          club_id: string
          created_at?: string
          dificultad?: string | null
          distancia_metros?: number | null
          ejercicio_id?: string | null
          elemento_tecnico_id?: string | null
          errores_comunes?: string | null
          id?: string
          instrucciones?: string | null
          intentos_reales?: number | null
          observaciones_ejecucion?: string | null
          orden: number
          origen?: string
          patron_movimiento?: string | null
          pausa_segundos?: number | null
          plano_movimiento?: string | null
          progresion?: string | null
          regresion?: string | null
          repeticiones?: number | null
          repeticiones_reales?: number | null
          rpe_esperado?: number | null
          segmento_corporal?: string | null
          series?: number | null
          sistema_energetico?: string | null
          tempo?: string | null
          tiempo_segundos?: number | null
          transferencia_aparato?: string | null
          unidad_carga?: string | null
          updated_at?: string
        }
        Update: {
          bloque_id?: string
          capacidad_dominante?: string | null
          carga?: number | null
          club_id?: string
          created_at?: string
          dificultad?: string | null
          distancia_metros?: number | null
          ejercicio_id?: string | null
          elemento_tecnico_id?: string | null
          errores_comunes?: string | null
          id?: string
          instrucciones?: string | null
          intentos_reales?: number | null
          observaciones_ejecucion?: string | null
          orden?: number
          origen?: string
          patron_movimiento?: string | null
          pausa_segundos?: number | null
          plano_movimiento?: string | null
          progresion?: string | null
          regresion?: string | null
          repeticiones?: number | null
          repeticiones_reales?: number | null
          rpe_esperado?: number | null
          segmento_corporal?: string | null
          series?: number | null
          sistema_energetico?: string | null
          tempo?: string | null
          tiempo_segundos?: number | null
          transferencia_aparato?: string | null
          unidad_carga?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ejercicios_sesion_bloque_id_fkey"
            columns: ["bloque_id"]
            isOneToOne: false
            referencedRelation: "bloques_sesion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ejercicios_sesion_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ejercicios_sesion_ejercicio_id_fkey"
            columns: ["ejercicio_id"]
            isOneToOne: false
            referencedRelation: "ejercicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ejercicios_sesion_elemento_tecnico_id_fkey"
            columns: ["elemento_tecnico_id"]
            isOneToOne: false
            referencedRelation: "elementos_tecnicos"
            referencedColumns: ["id"]
          },
        ]
      }
      elementos_tecnicos: {
        Row: {
          activo: boolean
          aparato_item_id: string
          club_id: string | null
          codigo: string
          created_at: string
          created_by: string | null
          criterios_dominio: Json
          criterios_seguridad: Json
          descripcion_biomecanica: Json
          dificultad: string | null
          familia_tecnica: string | null
          id: string
          nivel: string | null
          nombre: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          aparato_item_id: string
          club_id?: string | null
          codigo: string
          created_at?: string
          created_by?: string | null
          criterios_dominio?: Json
          criterios_seguridad?: Json
          descripcion_biomecanica?: Json
          dificultad?: string | null
          familia_tecnica?: string | null
          id?: string
          nivel?: string | null
          nombre: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          aparato_item_id?: string
          club_id?: string | null
          codigo?: string
          created_at?: string
          created_by?: string | null
          criterios_dominio?: Json
          criterios_seguridad?: Json
          descripcion_biomecanica?: Json
          dificultad?: string | null
          familia_tecnica?: string | null
          id?: string
          nivel?: string | null
          nombre?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elementos_tecnicos_aparato_item_id_fkey"
            columns: ["aparato_item_id"]
            isOneToOne: false
            referencedRelation: "catalogo_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elementos_tecnicos_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      errores_tecnicos_atleta: {
        Row: {
          atleta_id: string
          club_id: string
          correccion_aplicada: string | null
          created_at: string
          deleted_at: string | null
          ejercicio_correctivo_id: string | null
          elemento_id: string
          error_item_id: string
          fase_movimiento: string | null
          fecha: string
          frecuencia: string | null
          id: string
          indicacion_verbal: string | null
          posible_causa: string | null
          registrado_por: string | null
          resultado_posterior: string | null
          sesion_id: string | null
          severidad: number | null
          tendencia: string
          updated_at: string
        }
        Insert: {
          atleta_id: string
          club_id: string
          correccion_aplicada?: string | null
          created_at?: string
          deleted_at?: string | null
          ejercicio_correctivo_id?: string | null
          elemento_id: string
          error_item_id: string
          fase_movimiento?: string | null
          fecha: string
          frecuencia?: string | null
          id?: string
          indicacion_verbal?: string | null
          posible_causa?: string | null
          registrado_por?: string | null
          resultado_posterior?: string | null
          sesion_id?: string | null
          severidad?: number | null
          tendencia?: string
          updated_at?: string
        }
        Update: {
          atleta_id?: string
          club_id?: string
          correccion_aplicada?: string | null
          created_at?: string
          deleted_at?: string | null
          ejercicio_correctivo_id?: string | null
          elemento_id?: string
          error_item_id?: string
          fase_movimiento?: string | null
          fecha?: string
          frecuencia?: string | null
          id?: string
          indicacion_verbal?: string | null
          posible_causa?: string | null
          registrado_por?: string | null
          resultado_posterior?: string | null
          sesion_id?: string | null
          severidad?: number | null
          tendencia?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "errores_tecnicos_atleta_atleta_id_fkey"
            columns: ["atleta_id"]
            isOneToOne: false
            referencedRelation: "atletas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "errores_tecnicos_atleta_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "errores_tecnicos_atleta_ejercicio_correctivo_id_fkey"
            columns: ["ejercicio_correctivo_id"]
            isOneToOne: false
            referencedRelation: "ejercicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "errores_tecnicos_atleta_elemento_id_fkey"
            columns: ["elemento_id"]
            isOneToOne: false
            referencedRelation: "elementos_tecnicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "errores_tecnicos_atleta_error_item_id_fkey"
            columns: ["error_item_id"]
            isOneToOne: false
            referencedRelation: "catalogo_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "errores_tecnicos_atleta_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "sesiones"
            referencedColumns: ["id"]
          },
        ]
      }
      estado_elemento_atleta: {
        Row: {
          atleta_id: string
          club_id: string
          created_at: string
          ejecuciones_con_ayuda: number
          ejecuciones_correctas: number
          elemento_id: string
          errores_recurrentes: string | null
          estado_item_id: string
          evaluador_id: string | null
          fecha_inicio: string | null
          id: string
          indicaciones_principales: string | null
          intentos: number
          nivel_ayuda_item_id: string | null
          observaciones: string | null
          porcentaje_dominio: number
          ultima_evaluacion: string | null
          ultima_practica: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          atleta_id: string
          club_id: string
          created_at?: string
          ejecuciones_con_ayuda?: number
          ejecuciones_correctas?: number
          elemento_id: string
          errores_recurrentes?: string | null
          estado_item_id: string
          evaluador_id?: string | null
          fecha_inicio?: string | null
          id?: string
          indicaciones_principales?: string | null
          intentos?: number
          nivel_ayuda_item_id?: string | null
          observaciones?: string | null
          porcentaje_dominio?: number
          ultima_evaluacion?: string | null
          ultima_practica?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          atleta_id?: string
          club_id?: string
          created_at?: string
          ejecuciones_con_ayuda?: number
          ejecuciones_correctas?: number
          elemento_id?: string
          errores_recurrentes?: string | null
          estado_item_id?: string
          evaluador_id?: string | null
          fecha_inicio?: string | null
          id?: string
          indicaciones_principales?: string | null
          intentos?: number
          nivel_ayuda_item_id?: string | null
          observaciones?: string | null
          porcentaje_dominio?: number
          ultima_evaluacion?: string | null
          ultima_practica?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estado_elemento_atleta_atleta_id_fkey"
            columns: ["atleta_id"]
            isOneToOne: false
            referencedRelation: "atletas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estado_elemento_atleta_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estado_elemento_atleta_elemento_id_fkey"
            columns: ["elemento_id"]
            isOneToOne: false
            referencedRelation: "elementos_tecnicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estado_elemento_atleta_estado_item_id_fkey"
            columns: ["estado_item_id"]
            isOneToOne: false
            referencedRelation: "catalogo_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estado_elemento_atleta_evaluador_id_fkey"
            columns: ["evaluador_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estado_elemento_atleta_nivel_ayuda_item_id_fkey"
            columns: ["nivel_ayuda_item_id"]
            isOneToOne: false
            referencedRelation: "catalogo_items"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluaciones_fisicas: {
        Row: {
          atleta_id: string | null
          club_id: string | null
          created_at: string | null
          deleted_at: string | null
          evaluador_id: string | null
          fecha: string
          grupo_id: string | null
          id: string
          resultados: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          atleta_id?: string | null
          club_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          evaluador_id?: string | null
          fecha: string
          grupo_id?: string | null
          id?: string
          resultados: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          atleta_id?: string | null
          club_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          evaluador_id?: string | null
          fecha?: string
          grupo_id?: string | null
          id?: string
          resultados?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluaciones_fisicas_atleta_id_fkey"
            columns: ["atleta_id"]
            isOneToOne: false
            referencedRelation: "atletas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_fisicas_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      evidencias_multimedia: {
        Row: {
          atleta_id: string
          club_id: string
          comentario: string | null
          created_at: string
          deleted_at: string | null
          elemento_id: string | null
          feedback_id: string | null
          frame_representativo_segundos: number | null
          id: string
          mime_type: string
          momento: string | null
          privacidad: string
          sesion_id: string | null
          size_bytes: number
          storage_bucket: string
          storage_path: string
          tipo_item_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          atleta_id: string
          club_id: string
          comentario?: string | null
          created_at?: string
          deleted_at?: string | null
          elemento_id?: string | null
          feedback_id?: string | null
          frame_representativo_segundos?: number | null
          id?: string
          mime_type: string
          momento?: string | null
          privacidad?: string
          sesion_id?: string | null
          size_bytes: number
          storage_bucket?: string
          storage_path: string
          tipo_item_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          atleta_id?: string
          club_id?: string
          comentario?: string | null
          created_at?: string
          deleted_at?: string | null
          elemento_id?: string | null
          feedback_id?: string | null
          frame_representativo_segundos?: number | null
          id?: string
          mime_type?: string
          momento?: string | null
          privacidad?: string
          sesion_id?: string | null
          size_bytes?: number
          storage_bucket?: string
          storage_path?: string
          tipo_item_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidencias_multimedia_atleta_id_fkey"
            columns: ["atleta_id"]
            isOneToOne: false
            referencedRelation: "atletas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidencias_multimedia_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidencias_multimedia_elemento_id_fkey"
            columns: ["elemento_id"]
            isOneToOne: false
            referencedRelation: "elementos_tecnicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidencias_multimedia_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "retroalimentaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidencias_multimedia_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "sesiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidencias_multimedia_tipo_item_id_fkey"
            columns: ["tipo_item_id"]
            isOneToOne: false
            referencedRelation: "catalogo_items"
            referencedColumns: ["id"]
          },
        ]
      }
      gimnastas: {
        Row: {
          categoria: string | null
          club_id: string
          created_at: string | null
          fecha_nacimiento: string | null
          id: string
          nombre: string
        }
        Insert: {
          categoria?: string | null
          club_id: string
          created_at?: string | null
          fecha_nacimiento?: string | null
          id?: string
          nombre: string
        }
        Update: {
          categoria?: string | null
          club_id?: string
          created_at?: string | null
          fecha_nacimiento?: string | null
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "gimnastas_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos: {
        Row: {
          club_id: string | null
          created_at: string | null
          id: string
          nivel: string
          nombre: string
        }
        Insert: {
          club_id?: string | null
          created_at?: string | null
          id?: string
          nivel: string
          nombre: string
        }
        Update: {
          club_id?: string | null
          created_at?: string | null
          id?: string
          nivel?: string
          nombre?: string
        }
        Relationships: []
      }
      macrociclos: {
        Row: {
          anio_temporada: number
          club_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          estado: string
          fecha_fin: string
          fecha_inicio: string
          grupo_id: string | null
          id: string
          nombre: string | null
          objetivo: string | null
          temporada_id: string | null
          updated_at: string
          updated_by: string | null
          version_actual: number
        }
        Insert: {
          anio_temporada: number
          club_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          estado?: string
          fecha_fin: string
          fecha_inicio: string
          grupo_id?: string | null
          id?: string
          nombre?: string | null
          objetivo?: string | null
          temporada_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version_actual?: number
        }
        Update: {
          anio_temporada?: number
          club_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          estado?: string
          fecha_fin?: string
          fecha_inicio?: string
          grupo_id?: string | null
          id?: string
          nombre?: string | null
          objetivo?: string | null
          temporada_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version_actual?: number
        }
        Relationships: [
          {
            foreignKeyName: "macrociclos_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "macrociclos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "macrociclos_temporada_id_fkey"
            columns: ["temporada_id"]
            isOneToOne: false
            referencedRelation: "temporadas"
            referencedColumns: ["id"]
          },
        ]
      }
      mesociclos: {
        Row: {
          club_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          intensidad: number | null
          macrociclo_id: string | null
          nombre: string
          objetivo: string | null
          periodo: string
          prioridad_fisica: string | null
          prioridad_tecnica: string | null
          semana_fin: number
          semana_inicio: number
          updated_at: string
          updated_by: string | null
          volumen: number | null
        }
        Insert: {
          club_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          intensidad?: number | null
          macrociclo_id?: string | null
          nombre: string
          objetivo?: string | null
          periodo: string
          prioridad_fisica?: string | null
          prioridad_tecnica?: string | null
          semana_fin: number
          semana_inicio: number
          updated_at?: string
          updated_by?: string | null
          volumen?: number | null
        }
        Update: {
          club_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          intensidad?: number | null
          macrociclo_id?: string | null
          nombre?: string
          objetivo?: string | null
          periodo?: string
          prioridad_fisica?: string | null
          prioridad_tecnica?: string | null
          semana_fin?: number
          semana_inicio?: number
          updated_at?: string
          updated_by?: string | null
          volumen?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mesociclos_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mesociclos_macrociclo_id_fkey"
            columns: ["macrociclo_id"]
            isOneToOne: false
            referencedRelation: "macrociclos"
            referencedColumns: ["id"]
          },
        ]
      }
      microciclos: {
        Row: {
          club_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          es_descarga: boolean
          estado: string
          fecha_fin: string
          fecha_inicio: string
          id: string
          intensidad: number | null
          mesociclo_id: string
          numero_semana: number
          objetivo: string | null
          tipo: string | null
          updated_at: string
          updated_by: string | null
          volumen: number | null
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          es_descarga?: boolean
          estado?: string
          fecha_fin: string
          fecha_inicio: string
          id?: string
          intensidad?: number | null
          mesociclo_id: string
          numero_semana: number
          objetivo?: string | null
          tipo?: string | null
          updated_at?: string
          updated_by?: string | null
          volumen?: number | null
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          es_descarga?: boolean
          estado?: string
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          intensidad?: number | null
          mesociclo_id?: string
          numero_semana?: number
          objetivo?: string | null
          tipo?: string | null
          updated_at?: string
          updated_by?: string | null
          volumen?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "microciclos_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "microciclos_mesociclo_id_fkey"
            columns: ["mesociclo_id"]
            isOneToOne: false
            referencedRelation: "mesociclos"
            referencedColumns: ["id"]
          },
        ]
      }
      objetivos_atleta: {
        Row: {
          atleta_id: string
          club_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          descripcion: string
          estado: string
          fecha_inicio: string
          fecha_objetivo: string
          id: string
          indicador: string | null
          observaciones: string | null
          porcentaje_avance: number
          prioridad: number
          responsable_id: string | null
          tipo_item_id: string | null
          updated_at: string
          updated_by: string | null
          valor_esperado: number | null
          valor_inicial: number | null
        }
        Insert: {
          atleta_id: string
          club_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descripcion: string
          estado?: string
          fecha_inicio: string
          fecha_objetivo: string
          id?: string
          indicador?: string | null
          observaciones?: string | null
          porcentaje_avance?: number
          prioridad?: number
          responsable_id?: string | null
          tipo_item_id?: string | null
          updated_at?: string
          updated_by?: string | null
          valor_esperado?: number | null
          valor_inicial?: number | null
        }
        Update: {
          atleta_id?: string
          club_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descripcion?: string
          estado?: string
          fecha_inicio?: string
          fecha_objetivo?: string
          id?: string
          indicador?: string | null
          observaciones?: string | null
          porcentaje_avance?: number
          prioridad?: number
          responsable_id?: string | null
          tipo_item_id?: string | null
          updated_at?: string
          updated_by?: string | null
          valor_esperado?: number | null
          valor_inicial?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "objetivos_atleta_atleta_id_fkey"
            columns: ["atleta_id"]
            isOneToOne: false
            referencedRelation: "atletas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objetivos_atleta_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objetivos_atleta_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objetivos_atleta_tipo_item_id_fkey"
            columns: ["tipo_item_id"]
            isOneToOne: false
            referencedRelation: "catalogo_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pasos_progresion_elemento: {
        Row: {
          club_id: string | null
          created_at: string
          criterio_avance: string
          descripcion: string | null
          elemento_id: string
          errores_bloqueantes: Json
          id: string
          minimo_ejecuciones_correctas: number | null
          nivel_ayuda_item_id: string | null
          nombre: string
          orden: number
          requiere_aprobacion: boolean
          riesgos: string | null
          superficie_aparato: string | null
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          criterio_avance: string
          descripcion?: string | null
          elemento_id: string
          errores_bloqueantes?: Json
          id?: string
          minimo_ejecuciones_correctas?: number | null
          nivel_ayuda_item_id?: string | null
          nombre: string
          orden: number
          requiere_aprobacion?: boolean
          riesgos?: string | null
          superficie_aparato?: string | null
        }
        Update: {
          club_id?: string | null
          created_at?: string
          criterio_avance?: string
          descripcion?: string | null
          elemento_id?: string
          errores_bloqueantes?: Json
          id?: string
          minimo_ejecuciones_correctas?: number | null
          nivel_ayuda_item_id?: string | null
          nombre?: string
          orden?: number
          requiere_aprobacion?: boolean
          riesgos?: string | null
          superficie_aparato?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pasos_progresion_elemento_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pasos_progresion_elemento_elemento_id_fkey"
            columns: ["elemento_id"]
            isOneToOne: false
            referencedRelation: "elementos_tecnicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pasos_progresion_elemento_nivel_ayuda_item_id_fkey"
            columns: ["nivel_ayuda_item_id"]
            isOneToOne: false
            referencedRelation: "catalogo_items"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          club_id: string
          created_at: string | null
          email: string
          id: string
          nombre: string | null
          rol: string | null
        }
        Insert: {
          club_id: string
          created_at?: string | null
          email: string
          id: string
          nombre?: string | null
          rol?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string | null
          email?: string
          id?: string
          nombre?: string | null
          rol?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      planes_individuales: {
        Row: {
          atleta_id: string
          club_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          estado: string
          fecha_fin: string
          fecha_inicio: string
          id: string
          macrociclo_id: string
          objetivo_principal: string | null
          updated_at: string
          updated_by: string | null
          version_base_id: string | null
        }
        Insert: {
          atleta_id: string
          club_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          estado?: string
          fecha_fin: string
          fecha_inicio: string
          id?: string
          macrociclo_id: string
          objetivo_principal?: string | null
          updated_at?: string
          updated_by?: string | null
          version_base_id?: string | null
        }
        Update: {
          atleta_id?: string
          club_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          estado?: string
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          macrociclo_id?: string
          objetivo_principal?: string | null
          updated_at?: string
          updated_by?: string | null
          version_base_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planes_individuales_atleta_id_fkey"
            columns: ["atleta_id"]
            isOneToOne: false
            referencedRelation: "atletas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planes_individuales_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planes_individuales_macrociclo_id_fkey"
            columns: ["macrociclo_id"]
            isOneToOne: false
            referencedRelation: "macrociclos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planes_individuales_version_base_id_fkey"
            columns: ["version_base_id"]
            isOneToOne: false
            referencedRelation: "versiones_plan_general"
            referencedColumns: ["id"]
          },
        ]
      }
      plantillas_sesion: {
        Row: {
          activa: boolean
          atleta_id: string | null
          club_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          descripcion: string | null
          id: string
          nombre: string
          snapshot: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activa?: boolean
          atleta_id?: string | null
          club_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          snapshot: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activa?: boolean
          atleta_id?: string | null
          club_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          snapshot?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plantillas_sesion_atleta_id_fkey"
            columns: ["atleta_id"]
            isOneToOne: false
            referencedRelation: "atletas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantillas_sesion_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      prerrequisitos_elemento: {
        Row: {
          elemento_id: string
          obligatorio: boolean
          observaciones: string | null
          prerrequisito_id: string
        }
        Insert: {
          elemento_id: string
          obligatorio?: boolean
          observaciones?: string | null
          prerrequisito_id: string
        }
        Update: {
          elemento_id?: string
          obligatorio?: boolean
          observaciones?: string | null
          prerrequisito_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prerrequisitos_elemento_elemento_id_fkey"
            columns: ["elemento_id"]
            isOneToOne: false
            referencedRelation: "elementos_tecnicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prerrequisitos_elemento_prerrequisito_id_fkey"
            columns: ["prerrequisito_id"]
            isOneToOne: false
            referencedRelation: "elementos_tecnicos"
            referencedColumns: ["id"]
          },
        ]
      }
      progreso_paso_atleta: {
        Row: {
          aprobado_at: string | null
          aprobado_por: string | null
          atleta_id: string
          calidad_tecnica: number | null
          club_id: string
          comprension: number | null
          consistencia: number | null
          control_corporal: number | null
          created_at: string
          created_by: string | null
          ejecuciones_correctas: number
          estado: string
          fecha_dominio: string | null
          fecha_inicio: string | null
          id: string
          observaciones: string | null
          paso_id: string
          seguridad: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          aprobado_at?: string | null
          aprobado_por?: string | null
          atleta_id: string
          calidad_tecnica?: number | null
          club_id: string
          comprension?: number | null
          consistencia?: number | null
          control_corporal?: number | null
          created_at?: string
          created_by?: string | null
          ejecuciones_correctas?: number
          estado?: string
          fecha_dominio?: string | null
          fecha_inicio?: string | null
          id?: string
          observaciones?: string | null
          paso_id: string
          seguridad?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          aprobado_at?: string | null
          aprobado_por?: string | null
          atleta_id?: string
          calidad_tecnica?: number | null
          club_id?: string
          comprension?: number | null
          consistencia?: number | null
          control_corporal?: number | null
          created_at?: string
          created_by?: string | null
          ejecuciones_correctas?: number
          estado?: string
          fecha_dominio?: string | null
          fecha_inicio?: string | null
          id?: string
          observaciones?: string | null
          paso_id?: string
          seguridad?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progreso_paso_atleta_aprobado_por_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progreso_paso_atleta_atleta_id_fkey"
            columns: ["atleta_id"]
            isOneToOne: false
            referencedRelation: "atletas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progreso_paso_atleta_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progreso_paso_atleta_paso_id_fkey"
            columns: ["paso_id"]
            isOneToOne: false
            referencedRelation: "pasos_progresion_elemento"
            referencedColumns: ["id"]
          },
        ]
      }
      puntuaciones: {
        Row: {
          aparato: string
          atleta_id: string | null
          club_id: string | null
          competencia_id: string | null
          created_at: string | null
          id: string
          nota_d: number | null
          nota_e: number | null
          nota_final: number
        }
        Insert: {
          aparato: string
          atleta_id?: string | null
          club_id?: string | null
          competencia_id?: string | null
          created_at?: string | null
          id?: string
          nota_d?: number | null
          nota_e?: number | null
          nota_final: number
        }
        Update: {
          aparato?: string
          atleta_id?: string | null
          club_id?: string | null
          competencia_id?: string | null
          created_at?: string | null
          id?: string
          nota_d?: number | null
          nota_e?: number | null
          nota_final?: number
        }
        Relationships: [
          {
            foreignKeyName: "puntuaciones_atleta_id_fkey"
            columns: ["atleta_id"]
            isOneToOne: false
            referencedRelation: "atletas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "puntuaciones_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "puntuaciones_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "competencias"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_bienestar: {
        Row: {
          atleta_id: string
          calidad_sueno: number | null
          club_id: string
          created_at: string
          disposicion_entrenar: number | null
          dolor_molestia: boolean
          energia: number | null
          fatiga: number | null
          fecha: string
          id: string
          observaciones: string | null
          registrado_por: string | null
        }
        Insert: {
          atleta_id: string
          calidad_sueno?: number | null
          club_id: string
          created_at?: string
          disposicion_entrenar?: number | null
          dolor_molestia?: boolean
          energia?: number | null
          fatiga?: number | null
          fecha: string
          id?: string
          observaciones?: string | null
          registrado_por?: string | null
        }
        Update: {
          atleta_id?: string
          calidad_sueno?: number | null
          club_id?: string
          created_at?: string
          disposicion_entrenar?: number | null
          dolor_molestia?: boolean
          energia?: number | null
          fatiga?: number | null
          fecha?: string
          id?: string
          observaciones?: string | null
          registrado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_bienestar_atleta_id_fkey"
            columns: ["atleta_id"]
            isOneToOne: false
            referencedRelation: "atletas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_bienestar_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      restricciones_atleta: {
        Row: {
          adaptaciones_temporales: string | null
          aparatos_restringidos: string[]
          atleta_id: string
          autorizado_at: string | null
          autorizado_por: string | null
          autorizado_por_usuario: string | null
          club_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          ejercicios_restringidos: string[]
          estado: string
          fecha_fin: string | null
          fecha_inicio: string
          id: string
          intensidad_reportada: number | null
          observaciones: string | null
          retorno_autorizado: boolean
          tipo_item_id: string | null
          updated_at: string
          updated_by: string | null
          zona_corporal: string | null
        }
        Insert: {
          adaptaciones_temporales?: string | null
          aparatos_restringidos?: string[]
          atleta_id: string
          autorizado_at?: string | null
          autorizado_por?: string | null
          autorizado_por_usuario?: string | null
          club_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          ejercicios_restringidos?: string[]
          estado?: string
          fecha_fin?: string | null
          fecha_inicio: string
          id?: string
          intensidad_reportada?: number | null
          observaciones?: string | null
          retorno_autorizado?: boolean
          tipo_item_id?: string | null
          updated_at?: string
          updated_by?: string | null
          zona_corporal?: string | null
        }
        Update: {
          adaptaciones_temporales?: string | null
          aparatos_restringidos?: string[]
          atleta_id?: string
          autorizado_at?: string | null
          autorizado_por?: string | null
          autorizado_por_usuario?: string | null
          club_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          ejercicios_restringidos?: string[]
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          intensidad_reportada?: number | null
          observaciones?: string | null
          retorno_autorizado?: boolean
          tipo_item_id?: string | null
          updated_at?: string
          updated_by?: string | null
          zona_corporal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restricciones_atleta_atleta_id_fkey"
            columns: ["atleta_id"]
            isOneToOne: false
            referencedRelation: "atletas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restricciones_atleta_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restricciones_atleta_tipo_item_id_fkey"
            columns: ["tipo_item_id"]
            isOneToOne: false
            referencedRelation: "catalogo_items"
            referencedColumns: ["id"]
          },
        ]
      }
      resultados_pruebas_fisicas: {
        Row: {
          club_id: string
          created_at: string
          id: string
          observaciones: string | null
          prueba_id: string
          sesion_prueba_id: string
          unidad: string
          valor: number
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          observaciones?: string | null
          prueba_id: string
          sesion_prueba_id: string
          unidad: string
          valor: number
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          observaciones?: string | null
          prueba_id?: string
          sesion_prueba_id?: string
          unidad?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "resultados_pruebas_fisicas_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resultados_pruebas_fisicas_prueba_id_fkey"
            columns: ["prueba_id"]
            isOneToOne: false
            referencedRelation: "catalogo_pruebas_fisicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resultados_pruebas_fisicas_sesion_prueba_id_fkey"
            columns: ["sesion_prueba_id"]
            isOneToOne: false
            referencedRelation: "sesiones_pruebas_fisicas"
            referencedColumns: ["id"]
          },
        ]
      }
      retroalimentaciones: {
        Row: {
          atleta_id: string
          club_id: string
          comentario_entrenador: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          elemento_id: string | null
          explicacion: string | null
          id: string
          indicacion_tecnica: string | null
          nivel_comprension: number | null
          percepcion_gimnasta: string | null
          proximo_foco: string | null
          sesion_id: string | null
          updated_at: string
          visible_familia: boolean
        }
        Insert: {
          atleta_id: string
          club_id: string
          comentario_entrenador?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          elemento_id?: string | null
          explicacion?: string | null
          id?: string
          indicacion_tecnica?: string | null
          nivel_comprension?: number | null
          percepcion_gimnasta?: string | null
          proximo_foco?: string | null
          sesion_id?: string | null
          updated_at?: string
          visible_familia?: boolean
        }
        Update: {
          atleta_id?: string
          club_id?: string
          comentario_entrenador?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          elemento_id?: string | null
          explicacion?: string | null
          id?: string
          indicacion_tecnica?: string | null
          nivel_comprension?: number | null
          percepcion_gimnasta?: string | null
          proximo_foco?: string | null
          sesion_id?: string | null
          updated_at?: string
          visible_familia?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "retroalimentaciones_atleta_id_fkey"
            columns: ["atleta_id"]
            isOneToOne: false
            referencedRelation: "atletas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retroalimentaciones_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retroalimentaciones_elemento_id_fkey"
            columns: ["elemento_id"]
            isOneToOne: false
            referencedRelation: "elementos_tecnicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retroalimentaciones_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "sesiones"
            referencedColumns: ["id"]
          },
        ]
      }
      sesiones: {
        Row: {
          atleta_id: string | null
          club_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          duracion_disponible_min: number | null
          duracion_prevista_min: number | null
          duracion_real_min: number | null
          ejercicios: Json
          estado: string
          fecha_calendario: string | null
          grupo_id: string | null
          hora_inicio: string | null
          id: string
          intensidad_planificada: number | null
          microciclo_id: string | null
          nivel: string
          objetivo: string
          observaciones: string | null
          plan_individual_id: string | null
          prioridad: string | null
          published_at: string | null
          published_by: string | null
          restricciones_resumen: string | null
          sesion_general_id: string | null
          updated_at: string
          updated_by: string | null
          volumen_planificado: number | null
        }
        Insert: {
          atleta_id?: string | null
          club_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          duracion_disponible_min?: number | null
          duracion_prevista_min?: number | null
          duracion_real_min?: number | null
          ejercicios: Json
          estado?: string
          fecha_calendario?: string | null
          grupo_id?: string | null
          hora_inicio?: string | null
          id?: string
          intensidad_planificada?: number | null
          microciclo_id?: string | null
          nivel: string
          objetivo: string
          observaciones?: string | null
          plan_individual_id?: string | null
          prioridad?: string | null
          published_at?: string | null
          published_by?: string | null
          restricciones_resumen?: string | null
          sesion_general_id?: string | null
          updated_at?: string
          updated_by?: string | null
          volumen_planificado?: number | null
        }
        Update: {
          atleta_id?: string | null
          club_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          duracion_disponible_min?: number | null
          duracion_prevista_min?: number | null
          duracion_real_min?: number | null
          ejercicios?: Json
          estado?: string
          fecha_calendario?: string | null
          grupo_id?: string | null
          hora_inicio?: string | null
          id?: string
          intensidad_planificada?: number | null
          microciclo_id?: string | null
          nivel?: string
          objetivo?: string
          observaciones?: string | null
          plan_individual_id?: string | null
          prioridad?: string | null
          published_at?: string | null
          published_by?: string | null
          restricciones_resumen?: string | null
          sesion_general_id?: string | null
          updated_at?: string
          updated_by?: string | null
          volumen_planificado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sesiones_atleta_id_fkey"
            columns: ["atleta_id"]
            isOneToOne: false
            referencedRelation: "atletas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesiones_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesiones_microciclo_id_fkey"
            columns: ["microciclo_id"]
            isOneToOne: false
            referencedRelation: "microciclos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesiones_plan_individual_id_fkey"
            columns: ["plan_individual_id"]
            isOneToOne: false
            referencedRelation: "planes_individuales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesiones_sesion_general_id_fkey"
            columns: ["sesion_general_id"]
            isOneToOne: false
            referencedRelation: "sesiones"
            referencedColumns: ["id"]
          },
        ]
      }
      sesiones_pruebas_fisicas: {
        Row: {
          atleta_id: string
          bateria_id: string | null
          club_id: string
          created_at: string
          deleted_at: string | null
          evaluador_id: string
          fecha: string
          id: string
          observaciones: string | null
          updated_at: string
        }
        Insert: {
          atleta_id: string
          bateria_id?: string | null
          club_id: string
          created_at?: string
          deleted_at?: string | null
          evaluador_id: string
          fecha: string
          id?: string
          observaciones?: string | null
          updated_at?: string
        }
        Update: {
          atleta_id?: string
          bateria_id?: string | null
          club_id?: string
          created_at?: string
          deleted_at?: string | null
          evaluador_id?: string
          fecha?: string
          id?: string
          observaciones?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sesiones_pruebas_fisicas_atleta_id_fkey"
            columns: ["atleta_id"]
            isOneToOne: false
            referencedRelation: "atletas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesiones_pruebas_fisicas_bateria_id_fkey"
            columns: ["bateria_id"]
            isOneToOne: false
            referencedRelation: "baterias_pruebas_fisicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesiones_pruebas_fisicas_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesiones_pruebas_fisicas_evaluador_id_fkey"
            columns: ["evaluador_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sugerencias_ia: {
        Row: {
          aplicada_at: string | null
          aprobado_at: string | null
          aprobado_por: string | null
          atleta_id: string | null
          club_id: string
          created_at: string
          decision_motivo: string | null
          entidad_id: string | null
          entidad_tipo: string | null
          entrada_contexto: Json
          estado: string
          fundamento: string
          generado_por: string | null
          id: string
          modelo: string | null
          propuesta_editada: Json | null
          propuesta_original: Json
          tipo: string
          updated_at: string
        }
        Insert: {
          aplicada_at?: string | null
          aprobado_at?: string | null
          aprobado_por?: string | null
          atleta_id?: string | null
          club_id: string
          created_at?: string
          decision_motivo?: string | null
          entidad_id?: string | null
          entidad_tipo?: string | null
          entrada_contexto?: Json
          estado?: string
          fundamento: string
          generado_por?: string | null
          id?: string
          modelo?: string | null
          propuesta_editada?: Json | null
          propuesta_original: Json
          tipo: string
          updated_at?: string
        }
        Update: {
          aplicada_at?: string | null
          aprobado_at?: string | null
          aprobado_por?: string | null
          atleta_id?: string | null
          club_id?: string
          created_at?: string
          decision_motivo?: string | null
          entidad_id?: string | null
          entidad_tipo?: string | null
          entrada_contexto?: Json
          estado?: string
          fundamento?: string
          generado_por?: string | null
          id?: string
          modelo?: string | null
          propuesta_editada?: Json | null
          propuesta_original?: Json
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sugerencias_ia_atleta_id_fkey"
            columns: ["atleta_id"]
            isOneToOne: false
            referencedRelation: "atletas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sugerencias_ia_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      temporadas: {
        Row: {
          club_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          estado: string
          fecha_fin: string
          fecha_inicio: string
          id: string
          nombre: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          estado?: string
          fecha_fin: string
          fecha_inicio: string
          id?: string
          nombre: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          estado?: string
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          nombre?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "temporadas_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      versiones_plan_general: {
        Row: {
          club_id: string
          id: string
          macrociclo_id: string
          numero_version: number
          published_at: string
          published_by: string | null
          resumen_cambios: string | null
          snapshot: Json
        }
        Insert: {
          club_id: string
          id?: string
          macrociclo_id: string
          numero_version: number
          published_at?: string
          published_by?: string | null
          resumen_cambios?: string | null
          snapshot?: Json
        }
        Update: {
          club_id?: string
          id?: string
          macrociclo_id?: string
          numero_version?: number
          published_at?: string
          published_by?: string | null
          resumen_cambios?: string | null
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "versiones_plan_general_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "versiones_plan_general_macrociclo_id_fkey"
            columns: ["macrociclo_id"]
            isOneToOne: false
            referencedRelation: "macrociclos"
            referencedColumns: ["id"]
          },
        ]
      }
      versiones_sesion: {
        Row: {
          club_id: string
          created_at: string
          created_by: string | null
          id: string
          motivo: string | null
          numero_version: number
          sesion_id: string
          snapshot: Json
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          motivo?: string | null
          numero_version: number
          sesion_id: string
          snapshot: Json
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          motivo?: string | null
          numero_version?: number
          sesion_id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "versiones_sesion_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "versiones_sesion_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "sesiones"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_athlete: {
        Args: { target_atleta_id: string }
        Returns: boolean
      }
      can_administer_club: {
        Args: { target_club_id: string }
        Returns: boolean
      }
      can_manage_club: { Args: { target_club_id: string }; Returns: boolean }
      can_modify_athlete: {
        Args: { target_atleta_id: string }
        Returns: boolean
      }
      current_club_id: { Args: never; Returns: string }
      current_profile_role: { Args: never; Returns: string }
      is_superadmin: { Args: never; Returns: boolean }
      save_session_pedagogy: {
        Args: {
          change_reason: string
          phase_blocks: Json
          target_athlete_id: string
          target_session_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

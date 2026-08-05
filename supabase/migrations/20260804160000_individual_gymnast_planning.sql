-- Individual gymnast planning: normalized, tenant-safe foundations.
-- Keeps atletas and existing JSON session/evaluation columns for backwards compatibility.

begin;

create extension if not exists pgcrypto;

-- Shared helpers -------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(p.rol, ''))
  from public.perfiles p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function public.can_manage_club(target_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_superadmin()
    or (
      target_club_id = public.current_club_id()
      and public.current_profile_role() in (
        'administrador', 'administrador_organizacion', 'entrenador',
        'entrenador_principal', 'entrenador_asistente'
      )
    )
$$;

grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.can_manage_club(uuid) to authenticated;

-- Existing entities: safe additive changes ---------------------------------

alter table public.atletas
  add column if not exists fecha_ingreso date,
  add column if not exists lateralidad text,
  add column if not exists categoria_competitiva text,
  add column if not exists disponibilidad_semanal jsonb not null default '{}'::jsonb,
  add column if not exists duracion_sesion_habitual_min integer,
  add column if not exists objetivo_temporada text,
  add column if not exists avatar_path text,
  add column if not exists observaciones text,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists deleted_at timestamptz;

alter table public.atletas drop constraint if exists atletas_duracion_sesion_habitual_check;
alter table public.atletas add constraint atletas_duracion_sesion_habitual_check
  check (duracion_sesion_habitual_min is null or duracion_sesion_habitual_min between 1 and 720);

alter table public.sesiones
  add column if not exists grupo_id uuid references public.grupos(id) on delete set null,
  add column if not exists atleta_id uuid references public.atletas(id) on delete set null,
  add column if not exists plan_individual_id uuid,
  add column if not exists sesion_general_id uuid references public.sesiones(id) on delete set null,
  add column if not exists estado text not null default 'borrador',
  add column if not exists hora_inicio time,
  add column if not exists duracion_prevista_min integer,
  add column if not exists duracion_real_min integer,
  add column if not exists intensidad_planificada numeric(5,2),
  add column if not exists volumen_planificado numeric(10,2),
  add column if not exists prioridad text,
  add column if not exists restricciones_resumen text,
  add column if not exists published_at timestamptz,
  add column if not exists published_by uuid references auth.users(id) on delete set null,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

alter table public.sesiones drop constraint if exists sesiones_estado_check;
alter table public.sesiones add constraint sesiones_estado_check check (estado in (
  'borrador', 'programada', 'publicada', 'en_ejecucion', 'completada',
  'completada_con_ajustes', 'cancelada', 'reprogramada'
));
alter table public.sesiones drop constraint if exists sesiones_duraciones_check;
alter table public.sesiones add constraint sesiones_duraciones_check check (
  (duracion_prevista_min is null or duracion_prevista_min >= 0)
  and (duracion_real_min is null or duracion_real_min >= 0)
);

alter table public.evaluaciones_fisicas
  add column if not exists grupo_id uuid references public.grupos(id) on delete set null,
  add column if not exists evaluador_id uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists deleted_at timestamptz;

alter table public.puntuaciones
  add column if not exists club_id uuid references public.clubs(id) on delete cascade;

update public.puntuaciones p
set club_id = c.club_id
from public.competencias c
where p.competencia_id = c.id and p.club_id is null;

-- Seasons and plan inheritance ----------------------------------------------

create table if not exists public.temporadas (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  nombre text not null,
  fecha_inicio date not null,
  fecha_fin date not null,
  estado text not null default 'borrador' check (estado in ('borrador','activa','cerrada','archivada')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint temporadas_fechas_check check (fecha_fin >= fecha_inicio),
  unique (club_id, nombre)
);

alter table public.macrociclos
  add column if not exists club_id uuid references public.clubs(id) on delete cascade,
  add column if not exists temporada_id uuid references public.temporadas(id) on delete set null,
  add column if not exists nombre text,
  add column if not exists objetivo text,
  add column if not exists estado text not null default 'borrador',
  add column if not exists version_actual integer not null default 1,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

update public.macrociclos m
set club_id = g.club_id
from public.grupos g
where m.grupo_id = g.id and m.club_id is null;

alter table public.macrociclos drop constraint if exists macrociclos_fechas_check;
alter table public.macrociclos add constraint macrociclos_fechas_check check (fecha_fin >= fecha_inicio);
alter table public.macrociclos drop constraint if exists macrociclos_estado_check;
alter table public.macrociclos add constraint macrociclos_estado_check check (estado in ('borrador','publicado','cerrado','archivado'));

alter table public.mesociclos
  add column if not exists club_id uuid references public.clubs(id) on delete cascade,
  add column if not exists fecha_inicio date,
  add column if not exists fecha_fin date,
  add column if not exists objetivo text,
  add column if not exists volumen numeric(6,2),
  add column if not exists intensidad numeric(6,2),
  add column if not exists prioridad_tecnica text,
  add column if not exists prioridad_fisica text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

update public.mesociclos me
set club_id = ma.club_id
from public.macrociclos ma
where me.macrociclo_id = ma.id and me.club_id is null;

create table if not exists public.microciclos (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  mesociclo_id uuid not null references public.mesociclos(id) on delete cascade,
  numero_semana integer not null check (numero_semana between 1 and 60),
  tipo text,
  fecha_inicio date not null,
  fecha_fin date not null,
  objetivo text,
  volumen numeric(6,2) check (volumen is null or volumen between 0 and 100),
  intensidad numeric(6,2) check (intensidad is null or intensidad between 0 and 100),
  es_descarga boolean not null default false,
  estado text not null default 'planificado',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint microciclos_fechas_check check (fecha_fin >= fecha_inicio),
  unique (mesociclo_id, numero_semana)
);

create table if not exists public.versiones_plan_general (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  macrociclo_id uuid not null references public.macrociclos(id) on delete cascade,
  numero_version integer not null check (numero_version > 0),
  snapshot jsonb not null default '{}'::jsonb,
  resumen_cambios text,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz not null default now(),
  unique (macrociclo_id, numero_version)
);

create table if not exists public.planes_individuales (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  atleta_id uuid not null references public.atletas(id) on delete restrict,
  macrociclo_id uuid not null references public.macrociclos(id) on delete restrict,
  version_base_id uuid references public.versiones_plan_general(id) on delete set null,
  estado text not null default 'borrador' check (estado in ('borrador','activo','pausado','cerrado','archivado')),
  objetivo_principal text,
  fecha_inicio date not null,
  fecha_fin date not null,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint planes_individuales_fechas_check check (fecha_fin >= fecha_inicio),
  unique (atleta_id, macrociclo_id)
);

alter table public.sesiones drop constraint if exists sesiones_plan_individual_id_fkey;
alter table public.sesiones add constraint sesiones_plan_individual_id_fkey
  foreign key (plan_individual_id) references public.planes_individuales(id) on delete set null;

create table if not exists public.ajustes_plan_individual (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  plan_individual_id uuid not null references public.planes_individuales(id) on delete cascade,
  entidad_tipo text not null,
  entidad_origen_id uuid,
  ruta_campo text,
  origen text not null check (origen in ('heredado','adaptado','individual','suspendido','reemplazado')),
  valor jsonb,
  reemplazo_id uuid,
  version_base integer not null,
  estado_sincronizacion text not null default 'actualizado' check (estado_sincronizacion in ('actualizado','conflicto','requiere_confirmacion','ignorado')),
  motivo text,
  resuelto_por uuid references auth.users(id) on delete set null,
  resuelto_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Coaches and configurable catalogs -----------------------------------------

create table if not exists public.atleta_entrenadores (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  entrenador_id uuid not null references public.perfiles(id) on delete cascade,
  es_principal boolean not null default false,
  fecha_inicio date not null default current_date,
  fecha_fin date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint atleta_entrenadores_fechas_check check (fecha_fin is null or fecha_fin >= fecha_inicio),
  unique (atleta_id, entrenador_id, fecha_inicio)
);

create table if not exists public.catalogos (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade,
  codigo text not null,
  nombre text not null,
  descripcion text,
  editable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (club_id, codigo)
);

create table if not exists public.catalogo_items (
  id uuid primary key default gen_random_uuid(),
  catalogo_id uuid not null references public.catalogos(id) on delete restrict,
  club_id uuid references public.clubs(id) on delete cascade,
  codigo text not null,
  nombre text not null,
  descripcion text,
  orden integer not null default 0,
  metadatos jsonb not null default '{}'::jsonb,
  activo boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (catalogo_id, codigo)
);

insert into public.catalogos (club_id, codigo, nombre, editable) values
  (null, 'aparatos', 'Aparatos', true),
  (null, 'capacidades_fisicas', 'Capacidades físicas', true),
  (null, 'patrones_movimiento', 'Patrones de movimiento', true),
  (null, 'planos_movimiento', 'Planos de movimiento', true),
  (null, 'sistemas_energeticos', 'Sistemas energéticos', true),
  (null, 'estados_tecnicos', 'Estados técnicos', true),
  (null, 'errores_tecnicos', 'Errores técnicos', true),
  (null, 'niveles_ayuda', 'Niveles de ayuda', true),
  (null, 'tipos_evidencia', 'Tipos de evidencia', true),
  (null, 'tipos_objetivo', 'Tipos de objetivo', true),
  (null, 'fases_sesion', 'Fases de sesión', false),
  (null, 'tipos_restriccion', 'Tipos de restricción', true),
  (null, 'criterios_dominio', 'Criterios de dominio', true)
on conflict (club_id, codigo) do nothing;

insert into public.catalogo_items (catalogo_id, codigo, nombre, orden)
select c.id, v.codigo, v.nombre, v.orden
from public.catalogos c
cross join (values
  ('salto','Salto',1), ('barras','Barras asimétricas',2),
  ('viga','Viga de equilibrio',3), ('suelo','Suelo',4),
  ('preparacion_fisica','Preparación física',5), ('flexibilidad','Flexibilidad',6),
  ('expresion_corporal','Expresión corporal',7), ('transversal','Elementos transversales',8)
) as v(codigo,nombre,orden)
where c.club_id is null and c.codigo='aparatos'
on conflict (catalogo_id, codigo) do nothing;

insert into public.catalogo_items (catalogo_id, codigo, nombre, orden)
select c.id, v.codigo, v.nombre, v.orden
from public.catalogos c
cross join (values
  ('encuadre','Encuadre inicial',1), ('calentamiento','Calentamiento general y específico',2),
  ('tecnico','Trabajo técnico',3), ('fisico','Trabajo físico complementario',4),
  ('vuelta_calma','Vuelta a la calma',5)
) as v(codigo,nombre,orden)
where c.club_id is null and c.codigo='fases_sesion'
on conflict (catalogo_id, codigo) do nothing;

insert into public.catalogo_items (catalogo_id, codigo, nombre, orden)
select c.id, v.codigo, v.nombre, v.orden
from public.catalogos c
cross join (values
  ('no_iniciado','No iniciado',1), ('prerrequisitos','Prerrequisitos',2),
  ('exploracion','En exploración',3), ('aprendizaje','En aprendizaje',4),
  ('consolidacion','En consolidación',5), ('dominado_ayuda','Dominado con ayuda',6),
  ('dominado','Dominado',7), ('conexion','Integrado en conexión',8),
  ('rutina','Integrado en rutina',9), ('suspendido','Suspendido',10),
  ('requiere_correccion','Requiere corrección',11), ('requiere_reevaluacion','Requiere reevaluación',12)
) as v(codigo,nombre,orden)
where c.club_id is null and c.codigo='estados_tecnicos'
on conflict (catalogo_id, codigo) do nothing;

insert into public.catalogo_items (catalogo_id, codigo, nombre, orden)
select c.id, v.codigo, v.nombre, v.orden
from public.catalogos c
cross join (values
  ('piernas_separadas','Piernas separadas',1), ('rodillas_flexionadas','Rodillas flexionadas',2),
  ('rodillas_abiertas','Rodillas abiertas',3), ('pies_sin_extension','Pies sin extensión',4),
  ('cabeza_fuera_linea','Cabeza fuera de línea',5), ('perdida_hollow','Pérdida de hollow',6),
  ('arqueo_lumbar','Arqueo lumbar excesivo',7), ('hombros_cerrados','Hombros cerrados',8),
  ('recepcion_inestable','Recepción inestable',9), ('falta_amplitud','Falta de amplitud',10),
  ('desalineacion_apoyo','Desalineación en apoyo',11)
) as v(codigo,nombre,orden)
where c.club_id is null and c.codigo='errores_tecnicos'
on conflict (catalogo_id, codigo) do nothing;

-- Technical development -----------------------------------------------------

create table if not exists public.elementos_tecnicos (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade,
  aparato_item_id uuid not null references public.catalogo_items(id) on delete restrict,
  familia_tecnica text,
  codigo text not null,
  nombre text not null,
  nivel text,
  dificultad text,
  descripcion_biomecanica jsonb not null default '{}'::jsonb,
  criterios_seguridad jsonb not null default '[]'::jsonb,
  criterios_dominio jsonb not null default '[]'::jsonb,
  activo boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (club_id, codigo)
);

create table if not exists public.prerrequisitos_elemento (
  elemento_id uuid not null references public.elementos_tecnicos(id) on delete restrict,
  prerrequisito_id uuid not null references public.elementos_tecnicos(id) on delete restrict,
  obligatorio boolean not null default true,
  observaciones text,
  primary key (elemento_id, prerrequisito_id),
  check (elemento_id <> prerrequisito_id)
);

create table if not exists public.pasos_progresion_elemento (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade,
  elemento_id uuid not null references public.elementos_tecnicos(id) on delete cascade,
  orden integer not null check (orden > 0),
  nombre text not null,
  descripcion text,
  nivel_ayuda_item_id uuid references public.catalogo_items(id) on delete set null,
  superficie_aparato text,
  criterio_avance text not null,
  minimo_ejecuciones_correctas integer check (minimo_ejecuciones_correctas is null or minimo_ejecuciones_correctas >= 0),
  errores_bloqueantes jsonb not null default '[]'::jsonb,
  riesgos text,
  requiere_aprobacion boolean not null default true,
  created_at timestamptz not null default now(),
  unique (elemento_id, orden)
);

create table if not exists public.estado_elemento_atleta (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  elemento_id uuid not null references public.elementos_tecnicos(id) on delete restrict,
  estado_item_id uuid not null references public.catalogo_items(id) on delete restrict,
  porcentaje_dominio numeric(5,2) not null default 0 check (porcentaje_dominio between 0 and 100),
  intentos integer not null default 0 check (intentos >= 0),
  ejecuciones_correctas integer not null default 0 check (ejecuciones_correctas >= 0),
  ejecuciones_con_ayuda integer not null default 0 check (ejecuciones_con_ayuda >= 0),
  nivel_ayuda_item_id uuid references public.catalogo_items(id) on delete set null,
  fecha_inicio date,
  ultima_practica date,
  ultima_evaluacion date,
  errores_recurrentes text,
  indicaciones_principales text,
  observaciones text,
  evaluador_id uuid references public.perfiles(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (atleta_id, elemento_id),
  check (ejecuciones_correctas <= intentos),
  check (ejecuciones_con_ayuda <= intentos)
);

create table if not exists public.errores_tecnicos_atleta (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  elemento_id uuid not null references public.elementos_tecnicos(id) on delete restrict,
  error_item_id uuid not null references public.catalogo_items(id) on delete restrict,
  sesion_id uuid references public.sesiones(id) on delete set null,
  fecha date not null,
  fase_movimiento text,
  frecuencia text,
  severidad smallint check (severidad between 1 and 5),
  posible_causa text,
  correccion_aplicada text,
  indicacion_verbal text,
  ejercicio_correctivo_id uuid references public.ejercicios(id) on delete set null,
  resultado_posterior text,
  tendencia text not null default 'nuevo' check (tendencia in ('nuevo','persistente','disminucion','corregido','reaparecido')),
  registrado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Configurable physical tests ------------------------------------------------

create table if not exists public.catalogo_pruebas_fisicas (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade,
  codigo text not null,
  nombre text not null,
  capacidad_item_id uuid references public.catalogo_items(id) on delete set null,
  unidad text not null,
  mayor_es_mejor boolean not null default true,
  instrucciones text,
  metadatos jsonb not null default '{}'::jsonb,
  activo boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (club_id, codigo)
);

insert into public.catalogo_pruebas_fisicas (club_id,codigo,nombre,unidad,mayor_es_mejor) values
  (null,'abdominales_v','Abdominales en V','repeticiones',true),
  (null,'hollow_hold','Hollow hold','segundos',true),
  (null,'arch_hold','Arch hold','segundos',true),
  (null,'flexiones','Flexiones','repeticiones',true),
  (null,'remo','Remo','repeticiones',true),
  (null,'parada_manos','Parada de manos','segundos',true),
  (null,'sentadillas','Sentadillas','repeticiones',true),
  (null,'pantorrilla_derecha','Elevaciones de pantorrilla derecha','repeticiones',true),
  (null,'pantorrilla_izquierda','Elevaciones de pantorrilla izquierda','repeticiones',true),
  (null,'movilidad_stick','Movilidad y stick','centimetros',false)
on conflict (club_id,codigo) do nothing;

create table if not exists public.baterias_pruebas_fisicas (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  nombre text not null,
  descripcion text,
  activa boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id,nombre)
);

create table if not exists public.bateria_pruebas_items (
  bateria_id uuid not null references public.baterias_pruebas_fisicas(id) on delete cascade,
  prueba_id uuid not null references public.catalogo_pruebas_fisicas(id) on delete restrict,
  orden integer not null default 0,
  requerida boolean not null default true,
  primary key (bateria_id,prueba_id)
);

create table if not exists public.sesiones_pruebas_fisicas (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  bateria_id uuid references public.baterias_pruebas_fisicas(id) on delete set null,
  fecha date not null,
  evaluador_id uuid not null references public.perfiles(id) on delete restrict,
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.resultados_pruebas_fisicas (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  sesion_prueba_id uuid not null references public.sesiones_pruebas_fisicas(id) on delete cascade,
  prueba_id uuid not null references public.catalogo_pruebas_fisicas(id) on delete restrict,
  valor numeric not null check (valor >= 0),
  unidad text not null,
  observaciones text,
  created_at timestamptz not null default now(),
  unique (sesion_prueba_id,prueba_id)
);

-- Normalized sessions, execution and feedback -------------------------------

create table if not exists public.versiones_sesion (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  sesion_id uuid not null references public.sesiones(id) on delete cascade,
  numero_version integer not null check (numero_version > 0),
  snapshot jsonb not null,
  motivo text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (sesion_id,numero_version)
);

create table if not exists public.bloques_sesion (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  sesion_id uuid not null references public.sesiones(id) on delete cascade,
  fase_item_id uuid not null references public.catalogo_items(id) on delete restrict,
  origen text not null default 'heredado' check (origen in ('heredado','adaptado','individual','suspendido','reemplazado')),
  orden integer not null check (orden >= 0),
  titulo text not null,
  objetivo text,
  contenido jsonb not null default '{}'::jsonb,
  duracion_prevista_min integer not null default 0 check (duracion_prevista_min >= 0),
  duracion_real_min integer check (duracion_real_min is null or duracion_real_min >= 0),
  completado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sesion_id,orden)
);

create table if not exists public.ejercicios_sesion (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  bloque_id uuid not null references public.bloques_sesion(id) on delete cascade,
  ejercicio_id uuid references public.ejercicios(id) on delete restrict,
  elemento_tecnico_id uuid references public.elementos_tecnicos(id) on delete restrict,
  origen text not null default 'heredado' check (origen in ('heredado','adaptado','individual','suspendido','reemplazado')),
  orden integer not null check (orden >= 0),
  capacidad_dominante text,
  patron_movimiento text,
  segmento_corporal text,
  plano_movimiento text,
  sistema_energetico text,
  transferencia_aparato text,
  series numeric,
  repeticiones numeric,
  tiempo_segundos numeric,
  distancia_metros numeric,
  carga numeric,
  unidad_carga text,
  pausa_segundos numeric,
  tempo text,
  rpe_esperado numeric(4,1) check (rpe_esperado is null or rpe_esperado between 0 and 10),
  dificultad text,
  instrucciones text,
  errores_comunes text,
  progresion text,
  regresion text,
  intentos_reales integer check (intentos_reales is null or intentos_reales >= 0),
  repeticiones_reales numeric,
  observaciones_ejecucion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bloque_id,orden),
  check (carga is null or unidad_carga is not null)
);

create table if not exists public.retroalimentaciones (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  sesion_id uuid references public.sesiones(id) on delete set null,
  elemento_id uuid references public.elementos_tecnicos(id) on delete set null,
  comentario_entrenador text,
  indicacion_tecnica text,
  explicacion text,
  percepcion_gimnasta text,
  nivel_comprension smallint check (nivel_comprension is null or nivel_comprension between 1 and 5),
  proximo_foco text,
  visible_familia boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.evidencias_multimedia (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  sesion_id uuid references public.sesiones(id) on delete set null,
  elemento_id uuid references public.elementos_tecnicos(id) on delete set null,
  feedback_id uuid references public.retroalimentaciones(id) on delete set null,
  tipo_item_id uuid references public.catalogo_items(id) on delete restrict,
  storage_bucket text not null default 'gymnast-evidence',
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  momento text check (momento is null or momento in ('antes','durante','despues')),
  comentario text,
  frame_representativo_segundos numeric,
  privacidad text not null default 'entrenadores' check (privacidad in ('privado','entrenadores','familia')),
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (storage_bucket,storage_path)
);

-- Goals, loads, wellness, restrictions, attendance and competitions ---------

create table if not exists public.objetivos_atleta (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  tipo_item_id uuid references public.catalogo_items(id) on delete set null,
  descripcion text not null,
  fecha_inicio date not null,
  fecha_objetivo date not null,
  indicador text,
  valor_inicial numeric,
  valor_esperado numeric,
  porcentaje_avance numeric(5,2) not null default 0 check (porcentaje_avance between 0 and 100),
  estado text not null default 'pendiente' check (estado in ('pendiente','en_progreso','en_riesgo','alcanzado','parcialmente_alcanzado','pospuesto','cancelado')),
  prioridad smallint not null default 3 check (prioridad between 1 and 5),
  responsable_id uuid references public.perfiles(id) on delete set null,
  observaciones text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (fecha_objetivo >= fecha_inicio)
);

create table if not exists public.cargas_entrenamiento (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  sesion_id uuid references public.sesiones(id) on delete set null,
  fecha date not null,
  duracion_prevista_min integer check (duracion_prevista_min is null or duracion_prevista_min >= 0),
  duracion_real_min integer check (duracion_real_min is null or duracion_real_min >= 0),
  volumen_tecnico numeric check (volumen_tecnico is null or volumen_tecnico >= 0),
  intentos integer check (intentos is null or intentos >= 0),
  aterrizajes integer check (aterrizajes is null or aterrizajes >= 0),
  intensidad_planificada numeric(5,2),
  intensidad_real numeric(5,2),
  rpe_sesion numeric(4,1) check (rpe_sesion is null or rpe_sesion between 0 and 10),
  carga_interna numeric generated always as (
    case when duracion_real_min is not null and rpe_sesion is not null then duracion_real_min * rpe_sesion else null end
  ) stored,
  distribucion_aparatos jsonb not null default '{}'::jsonb,
  distribucion_capacidades jsonb not null default '{}'::jsonb,
  registrado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (atleta_id,sesion_id)
);

create table if not exists public.registros_bienestar (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  fecha date not null,
  energia smallint check (energia between 1 and 5),
  calidad_sueno smallint check (calidad_sueno between 1 and 5),
  fatiga smallint check (fatiga between 1 and 5),
  disposicion_entrenar smallint check (disposicion_entrenar between 1 and 5),
  dolor_molestia boolean not null default false,
  observaciones text,
  registrado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (atleta_id,fecha)
);

create table if not exists public.restricciones_atleta (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  tipo_item_id uuid references public.catalogo_items(id) on delete set null,
  zona_corporal text,
  intensidad_reportada smallint check (intensidad_reportada is null or intensidad_reportada between 0 and 10),
  fecha_inicio date not null,
  fecha_fin date,
  estado text not null default 'activa' check (estado in ('activa','en_revision','finalizada','cancelada')),
  ejercicios_restringidos uuid[] not null default '{}',
  aparatos_restringidos uuid[] not null default '{}',
  adaptaciones_temporales text,
  observaciones text,
  retorno_autorizado boolean not null default false,
  autorizado_por text,
  autorizado_por_usuario uuid references auth.users(id) on delete set null,
  autorizado_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (fecha_fin is null or fecha_fin >= fecha_inicio)
);

create table if not exists public.asistencia (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  sesion_id uuid references public.sesiones(id) on delete set null,
  fecha date not null,
  estado text not null check (estado in ('confirmada','ausente','ausencia_justificada','parcial','reprogramada','fuera_del_plan')),
  porcentaje_participacion numeric(5,2) check (porcentaje_participacion is null or porcentaje_participacion between 0 and 100),
  motivo text,
  registrado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (atleta_id,sesion_id,fecha)
);

alter table public.competencias
  add column if not exists ciudad text,
  add column if not exists fecha_fin date,
  add column if not exists nivel text,
  add column if not exists categoria text,
  add column if not exists reglamento text,
  add column if not exists aparatos jsonb not null default '[]'::jsonb,
  add column if not exists fecha_limite_preparacion date,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

create table if not exists public.competencias_atleta (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  competencia_id uuid not null references public.competencias(id) on delete cascade,
  objetivo_resultado text,
  objetivo_ejecucion text,
  rutinas jsonb not null default '{}'::jsonb,
  elementos_requeridos jsonb not null default '[]'::jsonb,
  elementos_opcionales jsonb not null default '[]'::jsonb,
  prioridades jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (atleta_id,competencia_id)
);

-- AI approval and audit ------------------------------------------------------

create table if not exists public.sugerencias_ia (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  atleta_id uuid references public.atletas(id) on delete cascade,
  tipo text not null,
  entidad_tipo text,
  entidad_id uuid,
  entrada_contexto jsonb not null default '{}'::jsonb,
  propuesta_original jsonb not null,
  propuesta_editada jsonb,
  fundamento text not null,
  modelo text,
  estado text not null default 'borrador' check (estado in ('borrador','pendiente_aprobacion','aprobada','rechazada','aplicada')),
  generado_por uuid references auth.users(id) on delete set null,
  aprobado_por uuid references auth.users(id) on delete set null,
  aprobado_at timestamptz,
  aplicada_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (estado not in ('aprobada','aplicada') or (aprobado_por is not null and aprobado_at is not null))
);

create table if not exists public.auditoria (
  id bigint generated always as identity primary key,
  club_id uuid references public.clubs(id) on delete set null,
  usuario_id uuid references auth.users(id) on delete set null,
  entidad text not null,
  entidad_id text,
  accion text not null,
  valor_anterior jsonb,
  valor_nuevo jsonb,
  motivo text,
  contexto jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes -------------------------------------------------------------------

create index if not exists idx_atletas_club_activos on public.atletas(club_id,nombre) where deleted_at is null;
create index if not exists idx_sesiones_club_grupo_fecha on public.sesiones(club_id,grupo_id,fecha_calendario desc) where deleted_at is null;
create index if not exists idx_sesiones_atleta_fecha on public.sesiones(club_id,atleta_id,fecha_calendario desc) where deleted_at is null;
create index if not exists idx_planes_individuales_atleta on public.planes_individuales(club_id,atleta_id,estado) where deleted_at is null;
create index if not exists idx_ajustes_plan_sync on public.ajustes_plan_individual(plan_individual_id,estado_sincronizacion) where deleted_at is null;
create index if not exists idx_estado_elemento_atleta on public.estado_elemento_atleta(club_id,atleta_id,estado_item_id);
create index if not exists idx_errores_tecnicos_historial on public.errores_tecnicos_atleta(club_id,atleta_id,elemento_id,fecha desc) where deleted_at is null;
create index if not exists idx_pruebas_historial on public.sesiones_pruebas_fisicas(club_id,atleta_id,fecha desc) where deleted_at is null;
create index if not exists idx_objetivos_atleta on public.objetivos_atleta(club_id,atleta_id,estado,fecha_objetivo) where deleted_at is null;
create index if not exists idx_cargas_atleta_fecha on public.cargas_entrenamiento(club_id,atleta_id,fecha desc);
create index if not exists idx_bienestar_atleta_fecha on public.registros_bienestar(club_id,atleta_id,fecha desc);
create index if not exists idx_restricciones_activas on public.restricciones_atleta(club_id,atleta_id,fecha_inicio desc) where deleted_at is null and estado in ('activa','en_revision');
create index if not exists idx_asistencia_atleta_fecha on public.asistencia(club_id,atleta_id,fecha desc);
create index if not exists idx_evidencias_atleta_fecha on public.evidencias_multimedia(club_id,atleta_id,created_at desc) where deleted_at is null;
create index if not exists idx_auditoria_entidad on public.auditoria(club_id,entidad,entidad_id,created_at desc);

-- updated_at triggers -------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'atletas','sesiones','evaluaciones_fisicas','temporadas','macrociclos','mesociclos','microciclos',
    'planes_individuales','ajustes_plan_individual','catalogos','catalogo_items','elementos_tecnicos',
    'estado_elemento_atleta','errores_tecnicos_atleta','catalogo_pruebas_fisicas','baterias_pruebas_fisicas',
    'sesiones_pruebas_fisicas','bloques_sesion','ejercicios_sesion','retroalimentaciones','objetivos_atleta',
    'cargas_entrenamiento','restricciones_atleta','asistencia','competencias','competencias_atleta','sugerencias_ia'
  ] loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I',t,t);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',t,t);
  end loop;
end $$;

-- RLS: strict organization isolation on every new sensitive table -----------

do $$
declare t text;
begin
  foreach t in array array[
    'temporadas','macrociclos','mesociclos','microciclos','versiones_plan_general','planes_individuales',
    'ajustes_plan_individual','atleta_entrenadores','elementos_tecnicos','pasos_progresion_elemento',
    'estado_elemento_atleta','errores_tecnicos_atleta','baterias_pruebas_fisicas','sesiones_pruebas_fisicas',
    'resultados_pruebas_fisicas','versiones_sesion','bloques_sesion','ejercicios_sesion','retroalimentaciones',
    'evidencias_multimedia','objetivos_atleta','cargas_entrenamiento','registros_bienestar',
    'restricciones_atleta','asistencia','competencias_atleta','sugerencias_ia','auditoria'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists tenant_select on public.%I',t);
    execute format('create policy tenant_select on public.%I for select to authenticated using (public.is_superadmin() or club_id = public.current_club_id())',t);
    execute format('drop policy if exists tenant_insert on public.%I',t);
    execute format('create policy tenant_insert on public.%I for insert to authenticated with check (public.can_manage_club(club_id))',t);
    execute format('drop policy if exists tenant_update on public.%I',t);
    execute format('create policy tenant_update on public.%I for update to authenticated using (public.can_manage_club(club_id)) with check (public.can_manage_club(club_id))',t);
  end loop;
end $$;

-- No client-side delete policy for histories. Deletion is soft and server controlled.

alter table public.catalogos enable row level security;
alter table public.catalogo_items enable row level security;
alter table public.catalogo_pruebas_fisicas enable row level security;

create policy catalogos_select on public.catalogos for select to authenticated
  using (club_id is null or club_id = public.current_club_id() or public.is_superadmin());
create policy catalogos_manage on public.catalogos for all to authenticated
  using (club_id is not null and public.can_manage_club(club_id))
  with check (club_id is not null and public.can_manage_club(club_id));
create policy catalogo_items_select on public.catalogo_items for select to authenticated
  using (club_id is null or club_id = public.current_club_id() or public.is_superadmin());
create policy catalogo_items_manage on public.catalogo_items for all to authenticated
  using (club_id is not null and public.can_manage_club(club_id))
  with check (club_id is not null and public.can_manage_club(club_id));
create policy pruebas_catalogo_select on public.catalogo_pruebas_fisicas for select to authenticated
  using (club_id is null or club_id = public.current_club_id() or public.is_superadmin());
create policy pruebas_catalogo_manage on public.catalogo_pruebas_fisicas for all to authenticated
  using (club_id is not null and public.can_manage_club(club_id))
  with check (club_id is not null and public.can_manage_club(club_id));

-- Link tables without club_id inherit access through their parent.
alter table public.prerrequisitos_elemento enable row level security;
create policy prerrequisitos_select on public.prerrequisitos_elemento for select to authenticated using (
  exists (select 1 from public.elementos_tecnicos e where e.id=elemento_id and (e.club_id is null or e.club_id=public.current_club_id() or public.is_superadmin()))
);
create policy prerrequisitos_manage on public.prerrequisitos_elemento for all to authenticated using (
  exists (select 1 from public.elementos_tecnicos e where e.id=elemento_id and e.club_id is not null and public.can_manage_club(e.club_id))
) with check (
  exists (select 1 from public.elementos_tecnicos e where e.id=elemento_id and e.club_id is not null and public.can_manage_club(e.club_id))
);

alter table public.bateria_pruebas_items enable row level security;
create policy bateria_items_select on public.bateria_pruebas_items for select to authenticated using (
  exists (select 1 from public.baterias_pruebas_fisicas b where b.id=bateria_id and (b.club_id=public.current_club_id() or public.is_superadmin()))
);
create policy bateria_items_manage on public.bateria_pruebas_items for all to authenticated using (
  exists (select 1 from public.baterias_pruebas_fisicas b where b.id=bateria_id and public.can_manage_club(b.club_id))
) with check (
  exists (select 1 from public.baterias_pruebas_fisicas b where b.id=bateria_id and public.can_manage_club(b.club_id))
);

-- Existing empty legacy planning tables are now protected.
alter table public.macrociclos enable row level security;
alter table public.mesociclos enable row level security;

-- Private evidence bucket. Objects are stored as <club_id>/<athlete_id>/...
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('gymnast-evidence','gymnast-evidence',false,104857600,array['video/mp4','video/quicktime','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false;

drop policy if exists evidence_select on storage.objects;
create policy evidence_select on storage.objects for select to authenticated using (
  bucket_id='gymnast-evidence'
  and (public.is_superadmin() or (storage.foldername(name))[1]=public.current_club_id()::text)
);
drop policy if exists evidence_insert on storage.objects;
create policy evidence_insert on storage.objects for insert to authenticated with check (
  bucket_id='gymnast-evidence'
  and public.can_manage_club(((storage.foldername(name))[1])::uuid)
);
drop policy if exists evidence_update on storage.objects;
create policy evidence_update on storage.objects for update to authenticated using (
  bucket_id='gymnast-evidence'
  and public.can_manage_club(((storage.foldername(name))[1])::uuid)
) with check (
  bucket_id='gymnast-evidence'
  and public.can_manage_club(((storage.foldername(name))[1])::uuid)
);
drop policy if exists evidence_delete on storage.objects;
create policy evidence_delete on storage.objects for delete to authenticated using (
  bucket_id='gymnast-evidence'
  and public.can_manage_club(((storage.foldername(name))[1])::uuid)
);

commit;

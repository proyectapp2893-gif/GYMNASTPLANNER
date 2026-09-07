begin;

create table if not exists public.fuentes_conocimiento_deportivo (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade,
  codigo text not null,
  titulo text not null,
  organizacion text not null,
  version text,
  anio_publicacion integer check (anio_publicacion is null or anio_publicacion between 1900 and 2200),
  estado_vigencia text not null default 'pendiente_revision' check (estado_vigencia in ('vigente','historica','pendiente_revision','retirada')),
  alcance_uso text not null default 'solo_referencia' check (alcance_uso in ('solo_referencia','extractos_licenciados','uso_interno_completo')),
  url_fuente text,
  referencia_local text,
  nota_licencia text,
  revisado_at timestamptz,
  revisado_por uuid references auth.users(id) on delete set null,
  activa boolean not null default true,
  metadatos jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists fuentes_conocimiento_global_codigo_idx
  on public.fuentes_conocimiento_deportivo(codigo) where club_id is null;
create unique index if not exists fuentes_conocimiento_club_codigo_idx
  on public.fuentes_conocimiento_deportivo(club_id,codigo) where club_id is not null;

create table if not exists public.etapas_desarrollo_deportivo (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade,
  codigo text not null,
  nombre text not null,
  orden smallint not null check (orden between 1 and 100),
  descripcion text,
  edad_minima_referencia numeric(4,1),
  edad_maxima_referencia numeric(4,1),
  objetivos jsonb not null default '[]'::jsonb,
  criterios_revision jsonb not null default '[]'::jsonb,
  activa boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (edad_maxima_referencia is null or edad_minima_referencia is null or edad_maxima_referencia >= edad_minima_referencia)
);

create unique index if not exists etapas_desarrollo_global_codigo_idx
  on public.etapas_desarrollo_deportivo(codigo) where club_id is null;
create unique index if not exists etapas_desarrollo_club_codigo_idx
  on public.etapas_desarrollo_deportivo(club_id,codigo) where club_id is not null;

create table if not exists public.reglas_conocimiento_deportivo (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade,
  fuente_id uuid not null references public.fuentes_conocimiento_deportivo(id) on delete restrict,
  etapa_id uuid references public.etapas_desarrollo_deportivo(id) on delete set null,
  codigo text not null,
  titulo text not null,
  categoria text not null check (categoria in ('desarrollo','seguridad','carga','tecnica','recuperacion','bienestar','competencia','inclusion')),
  nivel_accion text not null default 'informativa' check (nivel_accion in ('informativa','precaucion','bloqueo')),
  estado text not null default 'borrador' check (estado in ('borrador','en_revision','aprobada','retirada')),
  condicion jsonb not null default '{}'::jsonb,
  recomendacion jsonb not null default '{}'::jsonb,
  fundamento text not null,
  paginas_referencia text,
  valida_desde date,
  valida_hasta date,
  aprobada_at timestamptz,
  aprobada_por uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valida_hasta is null or valida_desde is null or valida_hasta >= valida_desde),
  check (estado <> 'aprobada' or (aprobada_at is not null and aprobada_por is not null))
);

create unique index if not exists reglas_conocimiento_global_codigo_idx
  on public.reglas_conocimiento_deportivo(codigo) where club_id is null;
create unique index if not exists reglas_conocimiento_club_codigo_idx
  on public.reglas_conocimiento_deportivo(club_id,codigo) where club_id is not null;
create index if not exists reglas_conocimiento_aplicables_idx
  on public.reglas_conocimiento_deportivo(club_id,estado,categoria);

alter table public.fuentes_conocimiento_deportivo enable row level security;
alter table public.etapas_desarrollo_deportivo enable row level security;
alter table public.reglas_conocimiento_deportivo enable row level security;

create policy knowledge_sources_read on public.fuentes_conocimiento_deportivo for select to authenticated
  using (activa and (club_id is null or club_id = public.current_club_id()));
create policy knowledge_sources_insert on public.fuentes_conocimiento_deportivo for insert to authenticated
  with check (club_id is not null and public.can_administer_club(club_id));
create policy knowledge_sources_update on public.fuentes_conocimiento_deportivo for update to authenticated
  using (club_id is not null and public.can_administer_club(club_id))
  with check (club_id is not null and public.can_administer_club(club_id));

create policy development_stages_read on public.etapas_desarrollo_deportivo for select to authenticated
  using (activa and (club_id is null or club_id = public.current_club_id()));
create policy development_stages_insert on public.etapas_desarrollo_deportivo for insert to authenticated
  with check (club_id is not null and public.can_administer_club(club_id));
create policy development_stages_update on public.etapas_desarrollo_deportivo for update to authenticated
  using (club_id is not null and public.can_administer_club(club_id))
  with check (club_id is not null and public.can_administer_club(club_id));

create policy knowledge_rules_read on public.reglas_conocimiento_deportivo for select to authenticated
  using (club_id is null or club_id = public.current_club_id());
create policy knowledge_rules_insert on public.reglas_conocimiento_deportivo for insert to authenticated
  with check (club_id is not null and public.can_administer_club(club_id));
create policy knowledge_rules_update on public.reglas_conocimiento_deportivo for update to authenticated
  using (club_id is not null and public.can_administer_club(club_id))
  with check (club_id is not null and public.can_administer_club(club_id));

insert into public.fuentes_conocimiento_deportivo
  (codigo,titulo,organizacion,version,anio_publicacion,estado_vigencia,alcance_uso,url_fuente,referencia_local,nota_licencia,revisado_at,metadatos)
select
  'gymcan_ltad_2008',
  'Long Term Athlete Development for Gymnastics',
  'Gymnastics Canada Gymnastique',
  '2008',
  2008,
  'historica',
  'solo_referencia',
  'https://gymcan.org/wp-content/uploads/2024/12/GymCan_ltad_en.pdf',
  'MATERIALES APP/GymCan_ltad_en.pdf',
  'Documento protegido. Usar como referencia y trazabilidad; no almacenar ni reproducir el texto completo sin autorización.',
  now(),
  '{"idioma":"en","paginas":68,"tipo":"marco_desarrollo"}'::jsonb
where not exists (select 1 from public.fuentes_conocimiento_deportivo where club_id is null and codigo='gymcan_ltad_2008');

insert into public.etapas_desarrollo_deportivo
  (codigo,nombre,orden,descripcion,edad_minima_referencia,edad_maxima_referencia,objetivos,criterios_revision)
values
  ('inicio_activo','Inicio activo',1,'Exploración motriz, juego, confianza y experiencias positivas.',0,6,'["patrones fundamentales","juego","confianza"]','["desarrollo individual","experiencia positiva"]'),
  ('fundamentos','Diversión, condición y fundamentos',2,'Desarrollo amplio de patrones fundamentales y alfabetización física.',6,9,'["agilidad","equilibrio","coordinación","fundamentos"]','["calidad de movimiento","participación"]'),
  ('construccion_habilidades','Construcción de habilidades',3,'Consolidación de fundamentos y preparación física previa a habilidades.',7,10,'["fundamentos técnicos","simetría","preparación física"]','["calidad","seguridad","preparación"]'),
  ('especializacion','Especialización en disciplina',4,'Desarrollo específico sin perder bienestar, recuperación y desarrollo integral.',9,12,'["habilidades específicas","preparación física","estrategias mentales"]','["crecimiento","recuperación","motivación"]'),
  ('competidor_consistente','Competidora consistente',5,'Consistencia técnica y adaptación individual durante el crecimiento.',10,15,'["consistencia","calidad","adaptación al crecimiento"]','["carga","bienestar","crecimiento"]'),
  ('rendimiento_competitivo','Rendimiento competitivo',6,'Optimización progresiva del rendimiento con participación de la gimnasta.',13,19,'["rendimiento","autorregulación","equilibrio vital"]','["recuperación","salud","objetivos"]'),
  ('excelencia_internacional','Excelencia internacional',7,'Rendimiento internacional, autonomía y soporte interdisciplinario.',16,null,'["excelencia","autonomía","longevidad"]','["salud","rendimiento","transición"]'),
  ('gimnasia_para_la_vida','Gimnasia para la vida',8,'Participación segura, significativa y sostenible durante toda la vida.',null,null,'["participación","bienestar","permanencia"]','["interés","capacidad","seguridad"]')
on conflict do nothing;

insert into public.reglas_conocimiento_deportivo
  (fuente_id,etapa_id,codigo,titulo,categoria,nivel_accion,estado,condicion,recomendacion,fundamento,paginas_referencia)
select f.id,null,'crecimiento_requiere_revision','Revisar el entrenamiento durante crecimiento acelerado','seguridad','precaucion','en_revision',
  '{"crecimiento_acelerado":true}',
  '{"acciones":["revisar carga e impacto","revisar flexibilidad activa","priorizar fundamentos y calidad"],"requiere_aprobacion_entrenador":true}',
  'Los cambios rápidos de proporciones pueden afectar coordinación, fuerza relativa, flexibilidad y ejecución técnica. La regla es orientativa y no diagnostica maduración.',
  '10, 12-18, 26-37'
from public.fuentes_conocimiento_deportivo f
where f.club_id is null and f.codigo='gymcan_ltad_2008'
and not exists (select 1 from public.reglas_conocimiento_deportivo where club_id is null and codigo='crecimiento_requiere_revision');

insert into public.reglas_conocimiento_deportivo
  (fuente_id,etapa_id,codigo,titulo,categoria,nivel_accion,estado,condicion,recomendacion,fundamento,paginas_referencia)
select f.id,null,'preparacion_antes_de_habilidad','Verificar preparación antes de progresar una habilidad','tecnica','precaucion','en_revision',
  '{"progresion_tecnica":true}',
  '{"acciones":["verificar prerrequisitos","verificar preparación física","valorar calidad, seguridad y consistencia"],"requiere_aprobacion_entrenador":true}',
  'La progresión no debe basarse solo en repeticiones o nivel nominal; requiere preparación y calidad observada.',
  '24-35'
from public.fuentes_conocimiento_deportivo f
where f.club_id is null and f.codigo='gymcan_ltad_2008'
and not exists (select 1 from public.reglas_conocimiento_deportivo where club_id is null and codigo='preparacion_antes_de_habilidad');

commit;

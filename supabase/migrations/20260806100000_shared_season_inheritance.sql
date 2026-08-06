begin;

alter table public.temporadas
  add column if not exists competencia_principal_nombre text,
  add column if not exists fecha_competencia_principal date,
  add column if not exists competencias_preparatorias jsonb not null default '[]'::jsonb,
  add column if not exists objetivo_general text;

alter table public.configuracion_grupos
  add column if not exists temporada_id uuid references public.temporadas(id) on delete set null,
  add column if not exists heredar_calendario_temporada boolean not null default false;

create index if not exists configuracion_grupos_temporada_idx
  on public.configuracion_grupos(temporada_id)
  where temporada_id is not null;

-- Link compatible legacy configurations to their existing macrocycle season,
-- while keeping their current dates as explicit overrides.
update public.configuracion_grupos c
set temporada_id = m.temporada_id
from public.macrociclos m
where m.grupo_id = c.grupo_id
  and m.temporada_id is not null
  and m.deleted_at is null
  and c.temporada_id is null;

drop view if exists public.configuracion_grupos_efectiva;
create view public.configuracion_grupos_efectiva
with (security_invoker = true)
as
select
  c.id,
  c.grupo_id,
  c.temporada_id,
  c.heredar_calendario_temporada,
  case when c.heredar_calendario_temporada then t.fecha_inicio else c.fecha_inicio end as fecha_inicio,
  case when c.heredar_calendario_temporada then coalesce(t.fecha_competencia_principal,t.fecha_fin) else c.fecha_competencia end as fecha_competencia,
  case when c.heredar_calendario_temporada then t.competencias_preparatorias else c.competencias_secundarias end as competencias_secundarias,
  case when c.heredar_calendario_temporada
    then greatest(1,floor((coalesce(t.fecha_competencia_principal,t.fecha_fin)-t.fecha_inicio)/7.0)::integer)
    else c.semanas_totales end as semanas_totales,
  case when c.heredar_calendario_temporada
    then round(greatest(1,floor((coalesce(t.fecha_competencia_principal,t.fecha_fin)-t.fecha_inicio)/7.0)::integer)*0.8)::integer
    else c.semanas_preparatorio end as semanas_preparatorio,
  case when c.heredar_calendario_temporada
    then greatest(1,floor((coalesce(t.fecha_competencia_principal,t.fecha_fin)-t.fecha_inicio)/7.0)::integer)-round(greatest(1,floor((coalesce(t.fecha_competencia_principal,t.fecha_fin)-t.fecha_inicio)/7.0)::integer)*0.8)::integer
    else c.semanas_competitivo end as semanas_competitivo,
  c.horario_semanal,
  c.inventario,
  c.created_at,
  t.nombre as temporada_nombre,
  t.objetivo_general as temporada_objetivo
from public.configuracion_grupos c
left join public.temporadas t on t.id=c.temporada_id and t.deleted_at is null;

grant select on public.configuracion_grupos_efectiva to authenticated;

commit;

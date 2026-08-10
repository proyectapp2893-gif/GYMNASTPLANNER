begin;

alter table public.configuracion_grupos
  add column if not exists fecha_fin date;

update public.configuracion_grupos
set fecha_fin = fecha_competencia
where fecha_fin is null and fecha_competencia is not null;

alter table public.configuracion_grupos drop constraint if exists configuracion_grupos_fechas_check;
alter table public.configuracion_grupos add constraint configuracion_grupos_fechas_check
  check (
    fecha_fin is null or fecha_inicio is null or fecha_fin >= fecha_inicio
  );

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
  case when c.heredar_calendario_temporada then t.fecha_fin else c.fecha_fin end as fecha_fin,
  case when c.heredar_calendario_temporada then coalesce(t.fecha_competencia_principal,t.fecha_fin) else c.fecha_competencia end as fecha_competencia,
  case when c.heredar_calendario_temporada then t.competencias_preparatorias else c.competencias_secundarias end as competencias_secundarias,
  case when c.heredar_calendario_temporada
    then greatest(1,floor((t.fecha_fin-t.fecha_inicio)/7.0)::integer)
    else c.semanas_totales end as semanas_totales,
  case when c.heredar_calendario_temporada
    then round(greatest(1,floor((t.fecha_fin-t.fecha_inicio)/7.0)::integer)*0.8)::integer
    else c.semanas_preparatorio end as semanas_preparatorio,
  case when c.heredar_calendario_temporada
    then greatest(1,floor((t.fecha_fin-t.fecha_inicio)/7.0)::integer)-round(greatest(1,floor((t.fecha_fin-t.fecha_inicio)/7.0)::integer)*0.8)::integer
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

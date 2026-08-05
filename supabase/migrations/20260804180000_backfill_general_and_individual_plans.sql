-- Materialize references to the current group configuration without copying
-- the general plan into every athlete record.

begin;

insert into public.temporadas(club_id,nombre,fecha_inicio,fecha_fin,estado)
select
  g.club_id,
  'Temporada ' || extract(year from min(c.fecha_inicio))::integer,
  min(c.fecha_inicio),
  max(coalesce(c.fecha_competencia,c.fecha_inicio + greatest(coalesce(c.semanas_totales,1),1) * 7)),
  'activa'
from public.configuracion_grupos c
join public.grupos g on g.id=c.grupo_id
where g.club_id is not null and c.fecha_inicio is not null
group by g.club_id,extract(year from c.fecha_inicio)
on conflict (club_id,nombre) do nothing;

insert into public.macrociclos(
  club_id,temporada_id,grupo_id,nombre,objetivo,anio_temporada,
  fecha_inicio,fecha_fin,estado,version_actual
)
select
  g.club_id,t.id,c.grupo_id,
  'Plan general - ' || g.nombre,
  'Planificación general para ' || g.nivel,
  extract(year from c.fecha_inicio)::integer,
  c.fecha_inicio,
  coalesce(c.fecha_competencia,c.fecha_inicio + greatest(coalesce(c.semanas_totales,1),1) * 7),
  'publicado',1
from public.configuracion_grupos c
join public.grupos g on g.id=c.grupo_id
join public.temporadas t on t.club_id=g.club_id
  and t.nombre='Temporada ' || extract(year from c.fecha_inicio)::integer
where g.club_id is not null and c.fecha_inicio is not null
  and not exists(select 1 from public.macrociclos m where m.grupo_id=c.grupo_id and m.deleted_at is null);

insert into public.versiones_plan_general(
  club_id,macrociclo_id,numero_version,snapshot,resumen_cambios
)
select
  m.club_id,m.id,1,
  jsonb_build_object(
    'source','configuracion_grupos',
    'configuracion_grupo_id',c.id,
    'fecha_inicio',c.fecha_inicio,
    'fecha_competencia',c.fecha_competencia,
    'semanas_totales',c.semanas_totales,
    'semanas_preparatorio',c.semanas_preparatorio,
    'semanas_competitivo',c.semanas_competitivo,
    'horario_semanal',coalesce(c.horario_semanal,'[]'::jsonb),
    'competencias_secundarias',coalesce(c.competencias_secundarias,'[]'::jsonb),
    'inventario',coalesce(c.inventario,'[]'::jsonb)
  ),
  'Versión inicial importada desde la configuración general existente'
from public.macrociclos m
join public.configuracion_grupos c on c.grupo_id=m.grupo_id
where m.club_id is not null
on conflict (macrociclo_id,numero_version) do nothing;

insert into public.planes_individuales(
  club_id,atleta_id,macrociclo_id,version_base_id,estado,objetivo_principal,fecha_inicio,fecha_fin
)
select
  a.club_id,a.id,m.id,v.id,'activo',a.objetivo_temporada,m.fecha_inicio,m.fecha_fin
from public.atletas a
join public.macrociclos m on m.grupo_id=a.grupo_id and m.deleted_at is null
left join public.versiones_plan_general v on v.macrociclo_id=m.id and v.numero_version=m.version_actual
where a.club_id is not null and a.deleted_at is null
on conflict (atleta_id,macrociclo_id) do nothing;

create or replace function public.provision_individual_plan_for_athlete()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.deleted_at is null and new.grupo_id is not null and new.club_id is not null then
    insert into public.planes_individuales(
      club_id,atleta_id,macrociclo_id,version_base_id,estado,objetivo_principal,fecha_inicio,fecha_fin,created_by
    )
    select
      new.club_id,new.id,m.id,v.id,'activo',new.objetivo_temporada,m.fecha_inicio,m.fecha_fin,auth.uid()
    from public.macrociclos m
    left join public.versiones_plan_general v on v.macrociclo_id=m.id and v.numero_version=m.version_actual
    where m.grupo_id=new.grupo_id and m.club_id=new.club_id and m.estado='publicado' and m.deleted_at is null
    order by m.fecha_inicio desc
    limit 1
    on conflict (atleta_id,macrociclo_id) do nothing;
  end if;
  return new;
end;
$$;

revoke execute on function public.provision_individual_plan_for_athlete() from public,anon,authenticated;
drop trigger if exists trg_atletas_provision_individual_plan on public.atletas;
create trigger trg_atletas_provision_individual_plan
after insert or update of grupo_id on public.atletas
for each row execute function public.provision_individual_plan_for_athlete();

commit;

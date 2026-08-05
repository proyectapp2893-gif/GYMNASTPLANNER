-- Harden API visibility and add immutable automatic audit trails.

begin;

-- Supabase grants public-schema objects to anon by default. RLS prevents row
-- access, but sensitive table names should not be discoverable before login.
do $$
declare r record;
begin
  for r in select schemaname, tablename from pg_tables where schemaname='public' loop
    execute format('revoke all privileges on table %I.%I from anon',r.schemaname,r.tablename);
  end loop;
end $$;

revoke execute on function public.current_club_id() from public, anon;
revoke execute on function public.is_superadmin() from public, anon;
revoke execute on function public.current_profile_role() from public, anon;
revoke execute on function public.can_manage_club(uuid) from public, anon;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

grant execute on function public.current_club_id() to authenticated;
grant execute on function public.is_superadmin() to authenticated;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.can_manage_club(uuid) to authenticated;

-- Audit logs are readable only by organization administrators and cannot be
-- inserted or modified directly by browser clients.
drop policy if exists tenant_select on public.auditoria;
drop policy if exists tenant_insert on public.auditoria;
drop policy if exists tenant_update on public.auditoria;
create policy audit_admin_select on public.auditoria
for select to authenticated
using (
  public.is_superadmin()
  or (
    club_id=public.current_club_id()
    and public.current_profile_role() in ('administrador','administrador_organizacion','entrenador_principal')
  )
);

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  old_row jsonb;
  new_row jsonb;
  tenant_id uuid;
  entity_id text;
begin
  old_row := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end;
  new_row := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end;
  tenant_id := coalesce(
    nullif(new_row->>'club_id','')::uuid,
    nullif(old_row->>'club_id','')::uuid,
    public.current_club_id()
  );
  entity_id := coalesce(new_row->>'id',old_row->>'id');

  insert into public.auditoria(
    club_id,usuario_id,entidad,entidad_id,accion,valor_anterior,valor_nuevo,contexto
  ) values (
    tenant_id,auth.uid(),tg_table_name,entity_id,lower(tg_op),old_row,new_row,
    jsonb_build_object('schema',tg_table_schema,'trigger',tg_name)
  );

  return case when tg_op='DELETE' then old else new end;
end;
$$;

revoke execute on function public.audit_row_change() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'atletas','planes_individuales','ajustes_plan_individual','sesiones','bloques_sesion',
    'ejercicios_sesion','estado_elemento_atleta','errores_tecnicos_atleta',
    'sesiones_pruebas_fisicas','resultados_pruebas_fisicas','objetivos_atleta',
    'cargas_entrenamiento','restricciones_atleta','asistencia','competencias_atleta',
    'sugerencias_ia','retroalimentaciones','evidencias_multimedia'
  ] loop
    execute format('drop trigger if exists trg_%I_audit on public.%I',t,t);
    execute format(
      'create trigger trg_%I_audit after insert or update or delete on public.%I for each row execute function public.audit_row_change()',
      t,t
    );
  end loop;
end $$;

-- Avoid duplicate permissive SELECT policies on configurable catalogs.
drop policy if exists catalogos_manage on public.catalogos;
create policy catalogos_insert on public.catalogos for insert to authenticated
  with check (club_id is not null and public.can_manage_club(club_id));
create policy catalogos_update on public.catalogos for update to authenticated
  using (club_id is not null and public.can_manage_club(club_id))
  with check (club_id is not null and public.can_manage_club(club_id));
create policy catalogos_delete on public.catalogos for delete to authenticated
  using (club_id is not null and public.can_manage_club(club_id));

drop policy if exists catalogo_items_manage on public.catalogo_items;
create policy catalogo_items_insert on public.catalogo_items for insert to authenticated
  with check (club_id is not null and public.can_manage_club(club_id));
create policy catalogo_items_update on public.catalogo_items for update to authenticated
  using (club_id is not null and public.can_manage_club(club_id))
  with check (club_id is not null and public.can_manage_club(club_id));
create policy catalogo_items_delete on public.catalogo_items for delete to authenticated
  using (club_id is not null and public.can_manage_club(club_id));

drop policy if exists pruebas_catalogo_manage on public.catalogo_pruebas_fisicas;
create policy pruebas_catalogo_insert on public.catalogo_pruebas_fisicas for insert to authenticated
  with check (club_id is not null and public.can_manage_club(club_id));
create policy pruebas_catalogo_update on public.catalogo_pruebas_fisicas for update to authenticated
  using (club_id is not null and public.can_manage_club(club_id))
  with check (club_id is not null and public.can_manage_club(club_id));
create policy pruebas_catalogo_delete on public.catalogo_pruebas_fisicas for delete to authenticated
  using (club_id is not null and public.can_manage_club(club_id));

drop policy if exists prerrequisitos_manage on public.prerrequisitos_elemento;
create policy prerrequisitos_insert on public.prerrequisitos_elemento for insert to authenticated with check (
  exists(select 1 from public.elementos_tecnicos e where e.id=elemento_id and e.club_id is not null and public.can_manage_club(e.club_id))
);
create policy prerrequisitos_update on public.prerrequisitos_elemento for update to authenticated using (
  exists(select 1 from public.elementos_tecnicos e where e.id=elemento_id and e.club_id is not null and public.can_manage_club(e.club_id))
) with check (
  exists(select 1 from public.elementos_tecnicos e where e.id=elemento_id and e.club_id is not null and public.can_manage_club(e.club_id))
);
create policy prerrequisitos_delete on public.prerrequisitos_elemento for delete to authenticated using (
  exists(select 1 from public.elementos_tecnicos e where e.id=elemento_id and e.club_id is not null and public.can_manage_club(e.club_id))
);

drop policy if exists bateria_items_manage on public.bateria_pruebas_items;
create policy bateria_items_insert on public.bateria_pruebas_items for insert to authenticated with check (
  exists(select 1 from public.baterias_pruebas_fisicas b where b.id=bateria_id and public.can_manage_club(b.club_id))
);
create policy bateria_items_update on public.bateria_pruebas_items for update to authenticated using (
  exists(select 1 from public.baterias_pruebas_fisicas b where b.id=bateria_id and public.can_manage_club(b.club_id))
) with check (
  exists(select 1 from public.baterias_pruebas_fisicas b where b.id=bateria_id and public.can_manage_club(b.club_id))
);
create policy bateria_items_delete on public.bateria_pruebas_items for delete to authenticated using (
  exists(select 1 from public.baterias_pruebas_fisicas b where b.id=bateria_id and public.can_manage_club(b.club_id))
);

commit;

begin;
create or replace function public.can_administer_club(target_club_id uuid) returns boolean language sql stable security definer set search_path=public as $$
  select public.is_superadmin() or (target_club_id=public.current_club_id() and public.current_profile_role() in ('administrador','administrador_organizacion'))
$$;
revoke execute on function public.can_administer_club(uuid) from public,anon;
grant execute on function public.can_administer_club(uuid) to authenticated;

drop policy if exists catalogos_insert on public.catalogos;drop policy if exists catalogos_update on public.catalogos;drop policy if exists catalogos_delete on public.catalogos;
create policy catalogos_insert on public.catalogos for insert to authenticated with check (club_id is not null and public.can_administer_club(club_id));
create policy catalogos_update on public.catalogos for update to authenticated using (club_id is not null and public.can_administer_club(club_id)) with check (club_id is not null and public.can_administer_club(club_id));
create policy catalogos_delete on public.catalogos for delete to authenticated using (club_id is not null and public.can_administer_club(club_id));
drop policy if exists catalogo_items_insert on public.catalogo_items;drop policy if exists catalogo_items_update on public.catalogo_items;drop policy if exists catalogo_items_delete on public.catalogo_items;
create policy catalogo_items_insert on public.catalogo_items for insert to authenticated with check (club_id is not null and public.can_administer_club(club_id));
create policy catalogo_items_update on public.catalogo_items for update to authenticated using (club_id is not null and public.can_administer_club(club_id)) with check (club_id is not null and public.can_administer_club(club_id));
create policy catalogo_items_delete on public.catalogo_items for delete to authenticated using (club_id is not null and public.can_administer_club(club_id));
drop policy if exists pruebas_catalogo_insert on public.catalogo_pruebas_fisicas;drop policy if exists pruebas_catalogo_update on public.catalogo_pruebas_fisicas;drop policy if exists pruebas_catalogo_delete on public.catalogo_pruebas_fisicas;
create policy pruebas_catalogo_insert on public.catalogo_pruebas_fisicas for insert to authenticated with check (club_id is not null and public.can_administer_club(club_id));
create policy pruebas_catalogo_update on public.catalogo_pruebas_fisicas for update to authenticated using (club_id is not null and public.can_administer_club(club_id)) with check (club_id is not null and public.can_administer_club(club_id));
create policy pruebas_catalogo_delete on public.catalogo_pruebas_fisicas for delete to authenticated using (club_id is not null and public.can_administer_club(club_id));
drop policy if exists tenant_insert on public.configuracion_carga;drop policy if exists tenant_update on public.configuracion_carga;
create policy load_config_insert on public.configuracion_carga for insert to authenticated with check (public.can_administer_club(club_id));
create policy load_config_update on public.configuracion_carga for update to authenticated using (public.can_administer_club(club_id)) with check (public.can_administer_club(club_id));
commit;

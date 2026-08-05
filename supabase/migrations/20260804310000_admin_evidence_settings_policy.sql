begin;

drop policy if exists tenant_insert on public.configuracion_evidencias;
drop policy if exists tenant_update on public.configuracion_evidencias;
create policy tenant_insert on public.configuracion_evidencias for insert to authenticated
with check (public.can_administer_club(club_id));
create policy tenant_update on public.configuracion_evidencias for update to authenticated
using (public.can_administer_club(club_id)) with check (public.can_administer_club(club_id));

commit;

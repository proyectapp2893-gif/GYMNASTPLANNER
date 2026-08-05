begin;

drop policy if exists tenant_delete_editable on public.ejercicios_sesion;
create policy tenant_delete_editable on public.ejercicios_sesion
for delete to authenticated
using (public.can_manage_club(club_id));

create index if not exists idx_ejercicios_sesion_bloque_orden
on public.ejercicios_sesion(bloque_id,orden);

commit;

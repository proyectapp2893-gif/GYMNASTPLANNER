-- Phase 7: bind saved sessions to a specific group to avoid collisions between
-- groups that share the same level inside one club.

begin;

alter table public.sesiones
add column if not exists grupo_id uuid references public.grupos(id) on delete set null;

create index if not exists idx_sesiones_club_group_date
on public.sesiones (club_id, grupo_id, fecha_calendario desc);

drop policy if exists "sesiones_all_own_club_or_superadmin" on public.sesiones;
create policy "sesiones_all_own_club_or_superadmin"
on public.sesiones
for all
to authenticated
using (public.is_superadmin() or club_id = public.current_club_id())
with check (
  public.is_superadmin()
  or (
    club_id = public.current_club_id()
    and (
      grupo_id is null
      or exists (
        select 1
        from public.grupos g
        where g.id = grupo_id
          and g.club_id = public.current_club_id()
      )
    )
  )
);

commit;

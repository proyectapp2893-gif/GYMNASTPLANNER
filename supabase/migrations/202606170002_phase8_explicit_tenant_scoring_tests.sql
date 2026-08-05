-- Phase 8: make tenant ownership explicit on scoring and physical tests.

begin;

alter table public.puntuaciones
add column if not exists club_id uuid references public.clubs(id) on delete cascade;

update public.puntuaciones p
set club_id = c.club_id
from public.competencias c
where p.competencia_id = c.id
  and p.club_id is null;

create index if not exists idx_puntuaciones_club_competencia_atleta
on public.puntuaciones (club_id, competencia_id, atleta_id);

alter table public.evaluaciones_fisicas
add column if not exists grupo_id uuid references public.grupos(id) on delete set null;

update public.evaluaciones_fisicas e
set grupo_id = a.grupo_id
from public.atletas a
where e.atleta_id = a.id
  and e.grupo_id is null;

create index if not exists idx_evaluaciones_fisicas_club_grupo_fecha
on public.evaluaciones_fisicas (club_id, grupo_id, fecha desc);

drop policy if exists "puntuaciones_select_own_competencia_or_superadmin" on public.puntuaciones;
create policy "puntuaciones_select_own_competencia_or_superadmin"
on public.puntuaciones
for select
to authenticated
using (
  public.is_superadmin()
  or club_id = public.current_club_id()
  or exists (
    select 1
    from public.competencias c
    where c.id = competencia_id
      and c.club_id = public.current_club_id()
  )
);

drop policy if exists "puntuaciones_insert_own_competencia_and_atleta_or_superadmin" on public.puntuaciones;
create policy "puntuaciones_insert_own_competencia_and_atleta_or_superadmin"
on public.puntuaciones
for insert
to authenticated
with check (
  public.is_superadmin()
  or (
    club_id = public.current_club_id()
    and exists (
      select 1
      from public.competencias c
      where c.id = competencia_id
        and c.club_id = public.current_club_id()
    )
    and exists (
      select 1
      from public.atletas a
      where a.id = atleta_id
        and a.club_id = public.current_club_id()
    )
  )
);

drop policy if exists "puntuaciones_update_own_competencia_and_atleta_or_superadmin" on public.puntuaciones;
create policy "puntuaciones_update_own_competencia_and_atleta_or_superadmin"
on public.puntuaciones
for update
to authenticated
using (
  public.is_superadmin()
  or club_id = public.current_club_id()
  or exists (
    select 1
    from public.competencias c
    where c.id = competencia_id
      and c.club_id = public.current_club_id()
  )
)
with check (
  public.is_superadmin()
  or (
    club_id = public.current_club_id()
    and exists (
      select 1
      from public.competencias c
      where c.id = competencia_id
        and c.club_id = public.current_club_id()
    )
    and exists (
      select 1
      from public.atletas a
      where a.id = atleta_id
        and a.club_id = public.current_club_id()
    )
  )
);

drop policy if exists "puntuaciones_delete_own_competencia_or_superadmin" on public.puntuaciones;
create policy "puntuaciones_delete_own_competencia_or_superadmin"
on public.puntuaciones
for delete
to authenticated
using (
  public.is_superadmin()
  or club_id = public.current_club_id()
  or exists (
    select 1
    from public.competencias c
    where c.id = competencia_id
      and c.club_id = public.current_club_id()
  )
);

commit;

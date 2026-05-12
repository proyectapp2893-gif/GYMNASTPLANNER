-- Phase 2: tenant isolation policies for GymnastPlanner.
-- Apply from Supabase SQL editor or with `supabase db push`.
-- Review table/column names against production before applying.

begin;

create or replace function public.current_club_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.club_id
  from public.perfiles p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'gymnastplanner@gmail.com'
$$;

grant execute on function public.current_club_id() to authenticated;
grant execute on function public.is_superadmin() to authenticated;

alter table public.clubs enable row level security;
alter table public.perfiles enable row level security;
alter table public.grupos enable row level security;
alter table public.atletas enable row level security;
alter table public.ejercicios enable row level security;
alter table public.sesiones enable row level security;
alter table public.evaluaciones_fisicas enable row level security;
alter table public.competencias enable row level security;
alter table public.configuracion_grupos enable row level security;
alter table public.puntuaciones enable row level security;

drop policy if exists "clubs_select_own_or_superadmin" on public.clubs;
create policy "clubs_select_own_or_superadmin"
on public.clubs
for select
to authenticated
using (public.is_superadmin() or id = public.current_club_id());

drop policy if exists "clubs_insert_authenticated_pending" on public.clubs;
create policy "clubs_insert_authenticated_pending"
on public.clubs
for insert
to authenticated
with check (estado = 'pendiente' or public.is_superadmin());

drop policy if exists "clubs_update_own_or_superadmin" on public.clubs;
create policy "clubs_update_own_or_superadmin"
on public.clubs
for update
to authenticated
using (public.is_superadmin() or id = public.current_club_id())
with check (public.is_superadmin() or id = public.current_club_id());

drop policy if exists "perfiles_select_own_or_superadmin" on public.perfiles;
create policy "perfiles_select_own_or_superadmin"
on public.perfiles
for select
to authenticated
using (public.is_superadmin() or id = auth.uid() or club_id = public.current_club_id());

drop policy if exists "perfiles_insert_own" on public.perfiles;
create policy "perfiles_insert_own"
on public.perfiles
for insert
to authenticated
with check (id = auth.uid() or public.is_superadmin());

drop policy if exists "perfiles_update_own_or_superadmin" on public.perfiles;
create policy "perfiles_update_own_or_superadmin"
on public.perfiles
for update
to authenticated
using (public.is_superadmin() or id = auth.uid())
with check (public.is_superadmin() or id = auth.uid());

drop policy if exists "grupos_all_own_club_or_superadmin" on public.grupos;
create policy "grupos_all_own_club_or_superadmin"
on public.grupos
for all
to authenticated
using (public.is_superadmin() or club_id = public.current_club_id())
with check (public.is_superadmin() or club_id = public.current_club_id());

drop policy if exists "atletas_all_own_club_or_superadmin" on public.atletas;
create policy "atletas_all_own_club_or_superadmin"
on public.atletas
for all
to authenticated
using (public.is_superadmin() or club_id = public.current_club_id())
with check (
  public.is_superadmin()
  or (
    club_id = public.current_club_id()
    and exists (
      select 1
      from public.grupos g
      where g.id = grupo_id
        and g.club_id = public.current_club_id()
    )
  )
);

drop policy if exists "ejercicios_select_own_or_allowed_global" on public.ejercicios;
create policy "ejercicios_select_own_or_allowed_global"
on public.ejercicios
for select
to authenticated
using (
  public.is_superadmin()
  or club_id = public.current_club_id()
  or (
    club_id is null
    and exists (
      select 1
      from public.clubs c
      where c.id = public.current_club_id()
        and coalesce(c.acceso_biblioteca_elite, false) = true
    )
  )
);

drop policy if exists "ejercicios_insert_own_or_superadmin_global" on public.ejercicios;
create policy "ejercicios_insert_own_or_superadmin_global"
on public.ejercicios
for insert
to authenticated
with check (public.is_superadmin() or club_id = public.current_club_id());

drop policy if exists "ejercicios_update_own_or_superadmin" on public.ejercicios;
create policy "ejercicios_update_own_or_superadmin"
on public.ejercicios
for update
to authenticated
using (public.is_superadmin() or club_id = public.current_club_id())
with check (public.is_superadmin() or club_id = public.current_club_id());

drop policy if exists "ejercicios_delete_own_or_superadmin" on public.ejercicios;
create policy "ejercicios_delete_own_or_superadmin"
on public.ejercicios
for delete
to authenticated
using (public.is_superadmin() or club_id = public.current_club_id());

drop policy if exists "sesiones_all_own_club_or_superadmin" on public.sesiones;
create policy "sesiones_all_own_club_or_superadmin"
on public.sesiones
for all
to authenticated
using (public.is_superadmin() or club_id = public.current_club_id())
with check (public.is_superadmin() or club_id = public.current_club_id());

drop policy if exists "evaluaciones_all_own_club_or_superadmin" on public.evaluaciones_fisicas;
create policy "evaluaciones_all_own_club_or_superadmin"
on public.evaluaciones_fisicas
for all
to authenticated
using (public.is_superadmin() or club_id = public.current_club_id())
with check (
  public.is_superadmin()
  or (
    club_id = public.current_club_id()
    and exists (
      select 1
      from public.atletas a
      where a.id = atleta_id
        and a.club_id = public.current_club_id()
    )
  )
);

drop policy if exists "competencias_all_own_club_or_superadmin" on public.competencias;
create policy "competencias_all_own_club_or_superadmin"
on public.competencias
for all
to authenticated
using (public.is_superadmin() or club_id = public.current_club_id())
with check (public.is_superadmin() or club_id = public.current_club_id());

drop policy if exists "configuracion_grupos_all_own_group_or_superadmin" on public.configuracion_grupos;
create policy "configuracion_grupos_all_own_group_or_superadmin"
on public.configuracion_grupos
for all
to authenticated
using (
  public.is_superadmin()
  or exists (
    select 1
    from public.grupos g
    where g.id = grupo_id
      and g.club_id = public.current_club_id()
  )
)
with check (
  public.is_superadmin()
  or exists (
    select 1
    from public.grupos g
    where g.id = grupo_id
      and g.club_id = public.current_club_id()
  )
);

drop policy if exists "puntuaciones_select_own_competencia_or_superadmin" on public.puntuaciones;
create policy "puntuaciones_select_own_competencia_or_superadmin"
on public.puntuaciones
for select
to authenticated
using (
  public.is_superadmin()
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
    exists (
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
    exists (
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
  or exists (
    select 1
    from public.competencias c
    where c.id = competencia_id
      and c.club_id = public.current_club_id()
  )
);

drop policy if exists "logos_select_authenticated" on storage.objects;
create policy "logos_select_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'logos');

drop policy if exists "logos_insert_own_or_superadmin" on storage.objects;
create policy "logos_insert_own_or_superadmin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'logos'
  and (
    public.is_superadmin()
    or name like ('logos/' || public.current_club_id()::text || '-%')
  )
);

drop policy if exists "logos_update_own_or_superadmin" on storage.objects;
create policy "logos_update_own_or_superadmin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'logos'
  and (
    public.is_superadmin()
    or name like ('logos/' || public.current_club_id()::text || '-%')
  )
)
with check (
  bucket_id = 'logos'
  and (
    public.is_superadmin()
    or name like ('logos/' || public.current_club_id()::text || '-%')
  )
);

drop policy if exists "logos_delete_own_or_superadmin" on storage.objects;
create policy "logos_delete_own_or_superadmin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'logos'
  and (
    public.is_superadmin()
    or name like ('logos/' || public.current_club_id()::text || '-%')
  )
);

commit;

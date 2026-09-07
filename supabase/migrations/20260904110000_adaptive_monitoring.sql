begin;

create table if not exists public.planes_adaptacion_atleta (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  fecha date not null default current_date,
  senales jsonb not null default '[]'::jsonb,
  decision_entrenador text not null check (char_length(decision_entrenador) between 10 and 2000),
  fecha_revision date not null,
  estado text not null default 'abierto' check (estado in ('abierto','en_seguimiento','cerrado')),
  resultado text check (resultado is null or char_length(resultado) <= 2000),
  creado_por uuid references auth.users(id) on delete set null,
  cerrado_por uuid references auth.users(id) on delete set null,
  cerrado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fecha_revision >= fecha),
  check (estado <> 'cerrado' or (resultado is not null and cerrado_at is not null))
);

create index if not exists planes_adaptacion_atleta_estado_idx on public.planes_adaptacion_atleta(atleta_id,estado,fecha_revision);
alter table public.planes_adaptacion_atleta enable row level security;

create policy adaptation_plans_select on public.planes_adaptacion_atleta for select to authenticated
  using (public.can_access_athlete(atleta_id));
create policy adaptation_plans_insert on public.planes_adaptacion_atleta for insert to authenticated
  with check (public.can_modify_athlete(atleta_id) and club_id=public.current_club_id());
create policy adaptation_plans_update on public.planes_adaptacion_atleta for update to authenticated
  using (public.can_modify_athlete(atleta_id))
  with check (public.can_modify_athlete(atleta_id) and club_id=public.current_club_id());

commit;

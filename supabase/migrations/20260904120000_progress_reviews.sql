begin;

create table if not exists public.revisiones_progreso_atleta (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  periodo_inicio date not null,
  periodo_fin date not null,
  snapshot_indicadores jsonb not null default '{}'::jsonb,
  logros text not null check (char_length(logros) between 10 and 3000),
  aspectos_a_desarrollar text not null check (char_length(aspectos_a_desarrollar) between 10 and 3000),
  prioridades_siguiente_periodo jsonb not null default '[]'::jsonb,
  voz_gimnasta text check (voz_gimnasta is null or char_length(voz_gimnasta) <= 2000),
  resumen_familia text check (resumen_familia is null or char_length(resumen_familia) <= 3000),
  visible_familia boolean not null default false,
  revisado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (periodo_fin >= periodo_inicio),
  check (not visible_familia or resumen_familia is not null)
);

create index if not exists revisiones_progreso_atleta_periodo_idx on public.revisiones_progreso_atleta(atleta_id,periodo_fin desc);
alter table public.revisiones_progreso_atleta enable row level security;
create policy progress_reviews_select on public.revisiones_progreso_atleta for select to authenticated using (public.can_access_athlete(atleta_id));
create policy progress_reviews_insert on public.revisiones_progreso_atleta for insert to authenticated with check (public.can_modify_athlete(atleta_id) and club_id=public.current_club_id());
create policy progress_reviews_update on public.revisiones_progreso_atleta for update to authenticated using (public.can_modify_athlete(atleta_id)) with check (public.can_modify_athlete(atleta_id) and club_id=public.current_club_id());

commit;

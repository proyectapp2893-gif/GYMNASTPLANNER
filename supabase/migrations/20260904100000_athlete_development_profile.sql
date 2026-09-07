begin;

alter table public.atletas
  add column if not exists etapa_desarrollo_id uuid references public.etapas_desarrollo_deportivo(id) on delete set null,
  add column if not exists etapa_desarrollo_revisada_at timestamptz,
  add column if not exists etapa_desarrollo_revisada_por uuid references auth.users(id) on delete set null;

create index if not exists atletas_etapa_desarrollo_idx on public.atletas(etapa_desarrollo_id);

create table if not exists public.mediciones_desarrollo_atleta (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  fecha date not null,
  estatura_pie_cm numeric(5,1) check (estatura_pie_cm between 30 and 250),
  estatura_sentada_cm numeric(5,1) check (estatura_sentada_cm between 20 and 180),
  envergadura_cm numeric(5,1) check (envergadura_cm between 30 and 260),
  peso_kg numeric(5,1) check (peso_kg between 5 and 250),
  protocolo text not null default 'estandar_club' check (char_length(protocolo) between 2 and 120),
  consentimiento_confirmado boolean not null check (consentimiento_confirmado),
  observaciones text check (observaciones is null or char_length(observaciones) <= 2000),
  registrado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (atleta_id, fecha),
  check (num_nonnulls(estatura_pie_cm,estatura_sentada_cm,envergadura_cm,peso_kg) >= 1),
  check (estatura_pie_cm is null or estatura_sentada_cm is null or estatura_sentada_cm < estatura_pie_cm)
);

create table if not exists public.registros_desarrollo_atleta (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  fecha date not null,
  confianza smallint not null check (confianza between 1 and 5),
  motivacion smallint not null check (motivacion between 1 and 5),
  disfrute smallint not null check (disfrute between 1 and 5),
  estres smallint not null check (estres between 1 and 5),
  disposicion smallint not null check (disposicion between 1 and 5),
  miedo_reportado boolean not null default false,
  voz_gimnasta text check (voz_gimnasta is null or char_length(voz_gimnasta) <= 2000),
  registrado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (atleta_id, fecha)
);

create index if not exists mediciones_desarrollo_atleta_fecha_idx on public.mediciones_desarrollo_atleta(atleta_id,fecha desc);
create index if not exists registros_desarrollo_atleta_fecha_idx on public.registros_desarrollo_atleta(atleta_id,fecha desc);

alter table public.mediciones_desarrollo_atleta enable row level security;
alter table public.registros_desarrollo_atleta enable row level security;

create policy athlete_development_measurements_select on public.mediciones_desarrollo_atleta for select to authenticated
  using (public.can_access_athlete(atleta_id));
create policy athlete_development_measurements_insert on public.mediciones_desarrollo_atleta for insert to authenticated
  with check (public.can_modify_athlete(atleta_id) and club_id=public.current_club_id());
create policy athlete_development_measurements_update on public.mediciones_desarrollo_atleta for update to authenticated
  using (public.can_modify_athlete(atleta_id))
  with check (public.can_modify_athlete(atleta_id) and club_id=public.current_club_id());

create policy athlete_development_checkins_select on public.registros_desarrollo_atleta for select to authenticated
  using (public.can_access_athlete(atleta_id));
create policy athlete_development_checkins_insert on public.registros_desarrollo_atleta for insert to authenticated
  with check (public.can_modify_athlete(atleta_id) and club_id=public.current_club_id());
create policy athlete_development_checkins_update on public.registros_desarrollo_atleta for update to authenticated
  using (public.can_modify_athlete(atleta_id))
  with check (public.can_modify_athlete(atleta_id) and club_id=public.current_club_id());

alter table public.ejercicios
  add column if not exists patrones_fundamentales jsonb not null default '[]'::jsonb,
  add column if not exists prerrequisitos jsonb not null default '[]'::jsonb,
  add column if not exists requisitos_fisicos jsonb not null default '[]'::jsonb,
  add column if not exists nivel_impacto text check (nivel_impacto is null or nivel_impacto in ('bajo','moderado','alto')),
  add column if not exists bilateralidad text check (bilateralidad is null or bilateralidad in ('bilateral','derecha','izquierda','no_aplica')),
  add column if not exists fuente_conocimiento_id uuid references public.fuentes_conocimiento_deportivo(id) on delete set null;

commit;

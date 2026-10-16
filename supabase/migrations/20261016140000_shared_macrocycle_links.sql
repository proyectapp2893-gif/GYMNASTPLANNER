create table if not exists public.enlaces_macrociclo (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  grupo_id uuid references public.grupos(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  activo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create unique index if not exists enlaces_macrociclo_club_todos_idx
  on public.enlaces_macrociclo(club_id) where grupo_id is null;
create unique index if not exists enlaces_macrociclo_club_grupo_idx
  on public.enlaces_macrociclo(club_id, grupo_id) where grupo_id is not null;

alter table public.enlaces_macrociclo enable row level security;
revoke all on public.enlaces_macrociclo from anon, authenticated;
grant all on public.enlaces_macrociclo to service_role;

comment on table public.enlaces_macrociclo is 'Enlaces públicos revocables y de solo lectura para macrociclos configurados.';

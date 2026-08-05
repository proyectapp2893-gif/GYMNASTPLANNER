begin;

create table if not exists public.plantillas_sesion (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  atleta_id uuid references public.atletas(id) on delete cascade,
  nombre text not null,
  descripcion text,
  snapshot jsonb not null,
  activa boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique nulls not distinct (club_id,atleta_id,nombre)
);

create index if not exists idx_plantillas_sesion_club_atleta
on public.plantillas_sesion(club_id,atleta_id,nombre) where deleted_at is null and activa;

create trigger trg_plantillas_sesion_updated_at before update on public.plantillas_sesion
for each row execute function public.set_updated_at();

alter table public.plantillas_sesion enable row level security;
create policy template_select on public.plantillas_sesion for select to authenticated
using (public.is_superadmin() or club_id=public.current_club_id());
create policy template_insert on public.plantillas_sesion for insert to authenticated
with check (public.can_manage_club(club_id));
create policy template_update on public.plantillas_sesion for update to authenticated
using (public.can_manage_club(club_id)) with check (public.can_manage_club(club_id));

create trigger trg_plantillas_sesion_audit after insert or update or delete on public.plantillas_sesion
for each row execute function public.audit_row_change();

revoke all privileges on table public.plantillas_sesion from anon;

commit;

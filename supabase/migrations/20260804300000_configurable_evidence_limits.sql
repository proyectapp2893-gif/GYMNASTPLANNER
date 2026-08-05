begin;

create table if not exists public.configuracion_evidencias (
  club_id uuid primary key references public.clubs(id) on delete cascade,
  tamano_maximo_mb integer not null default 100 check (tamano_maximo_mb between 1 and 500),
  tipos_mime_permitidos text[] not null default array['video/mp4','video/quicktime','image/jpeg','image/png','image/webp']::text[],
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (cardinality(tipos_mime_permitidos) between 1 and 20)
);

alter table public.configuracion_evidencias enable row level security;
create policy tenant_select on public.configuracion_evidencias for select to authenticated
using (public.is_superadmin() or club_id=public.current_club_id());
create policy tenant_insert on public.configuracion_evidencias for insert to authenticated
with check (public.can_manage_club(club_id));
create policy tenant_update on public.configuracion_evidencias for update to authenticated
using (public.can_manage_club(club_id)) with check (public.can_manage_club(club_id));
create trigger trg_configuracion_evidencias_updated_at before update on public.configuracion_evidencias
for each row execute function public.set_updated_at();

commit;

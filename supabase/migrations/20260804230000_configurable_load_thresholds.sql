begin;
create table if not exists public.configuracion_carga (
  club_id uuid primary key references public.clubs(id) on delete cascade,
  aumento_semanal_aviso_pct numeric(5,2) not null default 20 check (aumento_semanal_aviso_pct between 0 and 500),
  rpe_alto numeric(3,1) not null default 8 check (rpe_alto between 0 and 10),
  fatiga_alta smallint not null default 4 check (fatiga_alta between 1 and 5),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.configuracion_carga enable row level security;
create policy tenant_select on public.configuracion_carga for select to authenticated using (public.is_superadmin() or club_id=public.current_club_id());
create policy tenant_insert on public.configuracion_carga for insert to authenticated with check (public.can_manage_club(club_id));
create policy tenant_update on public.configuracion_carga for update to authenticated using (public.can_manage_club(club_id)) with check (public.can_manage_club(club_id));
create trigger trg_configuracion_carga_updated_at before update on public.configuracion_carga for each row execute function public.set_updated_at();
commit;

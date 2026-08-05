begin;

create table if not exists public.progreso_paso_atleta (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  paso_id uuid not null references public.pasos_progresion_elemento(id) on delete restrict,
  estado text not null default 'pendiente' check (estado in ('pendiente','en_progreso','aprobado','suspendido','requiere_revision')),
  fecha_inicio date,
  fecha_dominio date,
  calidad_tecnica smallint check (calidad_tecnica between 1 and 5),
  seguridad smallint check (seguridad between 1 and 5),
  consistencia smallint check (consistencia between 1 and 5),
  comprension smallint check (comprension between 1 and 5),
  control_corporal smallint check (control_corporal between 1 and 5),
  ejecuciones_correctas integer not null default 0 check (ejecuciones_correctas >= 0),
  aprobado_por uuid references public.perfiles(id) on delete set null,
  aprobado_at timestamptz,
  observaciones text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(atleta_id,paso_id),
  check (estado <> 'aprobado' or (aprobado_por is not null and aprobado_at is not null)),
  check (fecha_dominio is null or fecha_inicio is null or fecha_dominio >= fecha_inicio)
);

create index if not exists idx_progreso_paso_atleta on public.progreso_paso_atleta(club_id,atleta_id,estado);
alter table public.progreso_paso_atleta enable row level security;
create policy tenant_select on public.progreso_paso_atleta for select to authenticated using (public.is_superadmin() or club_id=public.current_club_id());
create policy tenant_insert on public.progreso_paso_atleta for insert to authenticated with check (public.can_manage_club(club_id));
create policy tenant_update on public.progreso_paso_atleta for update to authenticated using (public.can_manage_club(club_id)) with check (public.can_manage_club(club_id));
create trigger trg_progreso_paso_atleta_updated_at before update on public.progreso_paso_atleta for each row execute function public.set_updated_at();

commit;

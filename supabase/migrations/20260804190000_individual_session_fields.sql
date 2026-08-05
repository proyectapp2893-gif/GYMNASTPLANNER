begin;

alter table public.sesiones
  add column if not exists microciclo_id uuid references public.microciclos(id) on delete set null,
  add column if not exists duracion_disponible_min integer,
  add column if not exists observaciones text;

alter table public.sesiones drop constraint if exists sesiones_duracion_disponible_check;
alter table public.sesiones add constraint sesiones_duracion_disponible_check
  check (duracion_disponible_min is null or duracion_disponible_min between 1 and 720);

create index if not exists idx_sesiones_microciclo on public.sesiones(club_id,microciclo_id,fecha_calendario);

commit;

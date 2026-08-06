begin;

alter table public.clubs
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null,
  add column if not exists deletion_reason text;

create index if not exists clubs_active_created_at_idx
  on public.clubs(created_at desc)
  where deleted_at is null;

comment on column public.clubs.deleted_at is
  'Soft deletion timestamp. Club data is retained for audit and child-safety history.';

-- Remove test tenants created by authorization suites from the active registry.
update public.clubs
set deleted_at = coalesce(deleted_at, now()),
    deletion_reason = coalesce(deletion_reason, 'Limpieza de tenants temporales de pruebas RLS'),
    estado = 'pendiente'
where deleted_at is null
  and (nombre like 'RLS Test A %' or nombre like 'RLS Test B %');

commit;

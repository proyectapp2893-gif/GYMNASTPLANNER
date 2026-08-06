begin;

-- Legacy registrations predate roles. Promote only the oldest profile when a
-- club has no administrator, preserving least privilege for every other user.
with first_profile as (
  select distinct on (p.club_id) p.id
  from public.perfiles p
  where not exists (
    select 1 from public.perfiles admin_profile
    where admin_profile.club_id = p.club_id
      and admin_profile.rol in ('administrador', 'administrador_organizacion')
  )
  order by p.club_id, p.created_at nulls last, p.id
)
update public.perfiles p
set rol = 'administrador_organizacion'
from first_profile f
where p.id = f.id;

commit;

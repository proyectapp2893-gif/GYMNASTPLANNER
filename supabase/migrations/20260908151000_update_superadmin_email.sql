begin;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'lic.kevinperalta2893@outlook.com'
$$;

grant execute on function public.is_superadmin() to authenticated;

commit;

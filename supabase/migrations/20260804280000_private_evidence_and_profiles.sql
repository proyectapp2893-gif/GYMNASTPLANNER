begin;

drop policy if exists evidence_select on storage.objects;
create policy evidence_select on storage.objects for select to authenticated using (
  bucket_id='gymnast-evidence' and case
    when array_length(storage.foldername(name),1)>=2
      and (storage.foldername(name))[1]=public.current_club_id()::text
      and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then public.can_access_athlete(((storage.foldername(name))[2])::uuid)
    else false end
);
drop policy if exists evidence_insert on storage.objects;
create policy evidence_insert on storage.objects for insert to authenticated with check (
  bucket_id='gymnast-evidence' and case
    when array_length(storage.foldername(name),1)>=2
      and (storage.foldername(name))[1]=public.current_club_id()::text
      and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then public.can_modify_athlete(((storage.foldername(name))[2])::uuid)
    else false end
);
drop policy if exists evidence_update on storage.objects;
create policy evidence_update on storage.objects for update to authenticated using (
  bucket_id='gymnast-evidence' and case when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then public.can_modify_athlete(((storage.foldername(name))[2])::uuid) else false end
) with check (
  bucket_id='gymnast-evidence' and case when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then public.can_modify_athlete(((storage.foldername(name))[2])::uuid) else false end
);
drop policy if exists evidence_delete on storage.objects;
create policy evidence_delete on storage.objects for delete to authenticated using (
  bucket_id='gymnast-evidence' and case when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then public.can_modify_athlete(((storage.foldername(name))[2])::uuid) else false end
);

drop policy if exists "perfiles_select_own_or_superadmin" on public.perfiles;
create policy profiles_minimum_select on public.perfiles for select to authenticated using (
  public.is_superadmin() or id=auth.uid() or (
    club_id=public.current_club_id() and public.current_profile_role() in ('administrador','administrador_organizacion','entrenador','entrenador_principal')
  )
);

drop policy if exists "clubs_update_own_or_superadmin" on public.clubs;
create policy clubs_update_admin on public.clubs for update to authenticated using (
  public.is_superadmin() or (id=public.current_club_id() and public.current_profile_role() in ('administrador','administrador_organizacion'))
) with check (
  public.is_superadmin() or (id=public.current_club_id() and public.current_profile_role() in ('administrador','administrador_organizacion'))
);

commit;

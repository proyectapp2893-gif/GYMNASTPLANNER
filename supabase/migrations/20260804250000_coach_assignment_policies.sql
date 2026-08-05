begin;
drop policy if exists tenant_select on public.atleta_entrenadores;
drop policy if exists tenant_insert on public.atleta_entrenadores;
drop policy if exists tenant_update on public.atleta_entrenadores;
create policy coach_assignment_select on public.atleta_entrenadores for select to authenticated using (
  public.is_superadmin() or (
    club_id=public.current_club_id() and (
      public.current_profile_role() in ('administrador','administrador_organizacion','entrenador','entrenador_principal')
      or entrenador_id=auth.uid()
    )
  )
);
create policy coach_assignment_insert on public.atleta_entrenadores for insert to authenticated with check (
  public.is_superadmin() or (club_id=public.current_club_id() and public.current_profile_role() in ('administrador','administrador_organizacion','entrenador','entrenador_principal'))
);
create policy coach_assignment_update on public.atleta_entrenadores for update to authenticated using (
  public.is_superadmin() or (club_id=public.current_club_id() and public.current_profile_role() in ('administrador','administrador_organizacion','entrenador','entrenador_principal'))
) with check (
  public.is_superadmin() or (club_id=public.current_club_id() and public.current_profile_role() in ('administrador','administrador_organizacion','entrenador','entrenador_principal'))
);
commit;

begin;

create or replace function public.can_access_athlete(target_atleta_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_superadmin() or exists (
    select 1 from public.atletas a
    where a.id=target_atleta_id and a.club_id=public.current_club_id()
      and (
        public.current_profile_role() in ('administrador','administrador_organizacion','entrenador','entrenador_principal')
        or exists (
          select 1 from public.atleta_entrenadores ae
          where ae.atleta_id=a.id and ae.entrenador_id=auth.uid()
            and ae.fecha_inicio<=current_date and (ae.fecha_fin is null or ae.fecha_fin>=current_date)
        )
      )
  )
$$;

create or replace function public.can_modify_athlete(target_atleta_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.can_access_athlete(target_atleta_id)
    and public.current_profile_role() not in ('gimnasta','familia')
$$;

revoke execute on function public.can_access_athlete(uuid) from public,anon;
revoke execute on function public.can_modify_athlete(uuid) from public,anon;
grant execute on function public.can_access_athlete(uuid) to authenticated;
grant execute on function public.can_modify_athlete(uuid) to authenticated;

drop policy if exists "atletas_all_own_club_or_superadmin" on public.atletas;
create policy athlete_select_assigned on public.atletas for select to authenticated
  using (public.can_access_athlete(id));
create policy athlete_insert_lead on public.atletas for insert to authenticated
  with check (public.can_manage_club(club_id) and public.current_profile_role() in ('administrador','administrador_organizacion','entrenador','entrenador_principal'));
create policy athlete_update_assigned on public.atletas for update to authenticated
  using (public.can_modify_athlete(id)) with check (public.can_modify_athlete(id));

do $$ declare t text; begin
  foreach t in array array[
    'planes_individuales','estado_elemento_atleta','errores_tecnicos_atleta',
    'sesiones_pruebas_fisicas','retroalimentaciones','evidencias_multimedia',
    'objetivos_atleta','cargas_entrenamiento','registros_bienestar','restricciones_atleta',
    'asistencia','competencias_atleta','sugerencias_ia','progreso_paso_atleta'
  ] loop
    execute format('drop policy if exists tenant_select on public.%I',t);
    execute format('drop policy if exists tenant_insert on public.%I',t);
    execute format('drop policy if exists tenant_update on public.%I',t);
    execute format('create policy athlete_select_assigned on public.%I for select to authenticated using (public.can_access_athlete(atleta_id))',t);
    execute format('create policy athlete_insert_assigned on public.%I for insert to authenticated with check (public.can_modify_athlete(atleta_id) and club_id=public.current_club_id())',t);
    execute format('create policy athlete_update_assigned on public.%I for update to authenticated using (public.can_modify_athlete(atleta_id)) with check (public.can_modify_athlete(atleta_id) and club_id=public.current_club_id())',t);
  end loop;
end $$;

drop policy if exists "sesiones_all_own_club_or_superadmin" on public.sesiones;
create policy sessions_select_authorized on public.sesiones for select to authenticated using (
  public.is_superadmin() or (club_id=public.current_club_id() and (atleta_id is null or public.can_access_athlete(atleta_id)))
);
create policy sessions_insert_authorized on public.sesiones for insert to authenticated with check (
  club_id=public.current_club_id() and public.can_manage_club(club_id) and (atleta_id is null or public.can_modify_athlete(atleta_id))
);
create policy sessions_update_authorized on public.sesiones for update to authenticated using (
  public.is_superadmin() or (club_id=public.current_club_id() and (atleta_id is null or public.can_modify_athlete(atleta_id)))
) with check (
  public.is_superadmin() or (club_id=public.current_club_id() and (atleta_id is null or public.can_modify_athlete(atleta_id)))
);

commit;

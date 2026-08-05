begin;
alter table public.sugerencias_ia add column if not exists decision_motivo text;
create or replace function public.guard_ai_approval() returns trigger language plpgsql set search_path=public as $$
begin
  if new.estado in ('aprobada','aplicada') and old.estado is distinct from new.estado then
    if public.current_profile_role() not in ('administrador','administrador_organizacion','entrenador','entrenador_principal') and not public.is_superadmin() then raise exception 'Solo un entrenador principal o administrador puede aprobar IA'; end if;
    if nullif(trim(coalesce(new.decision_motivo,'')),'') is null then raise exception 'La aprobación de IA requiere un motivo'; end if;
  end if;
  return new;
end $$;
revoke execute on function public.guard_ai_approval() from public,anon,authenticated;
drop trigger if exists trg_sugerencias_ia_guard_approval on public.sugerencias_ia;
create trigger trg_sugerencias_ia_guard_approval before update on public.sugerencias_ia for each row execute function public.guard_ai_approval();
create or replace function public.guard_session_publication() returns trigger language plpgsql set search_path=public as $$
begin
  if new.estado='publicada' and old.estado is distinct from new.estado then
    if public.current_profile_role() not in ('administrador','administrador_organizacion','entrenador','entrenador_principal') and not public.is_superadmin() then raise exception 'Solo un entrenador principal o administrador puede publicar sesiones'; end if;
    if new.duracion_prevista_min is null or new.duracion_prevista_min<=0 or nullif(trim(coalesce(new.objetivo,'')),'') is null then raise exception 'No se puede publicar una sesión incompleta'; end if;
  end if;
  return new;
end $$;
revoke execute on function public.guard_session_publication() from public,anon,authenticated;
drop trigger if exists trg_sesiones_guard_publication on public.sesiones;
create trigger trg_sesiones_guard_publication before update on public.sesiones for each row execute function public.guard_session_publication();
commit;

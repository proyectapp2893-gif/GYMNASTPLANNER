begin;
create or replace function public.save_session_pedagogy(target_session_id uuid,target_athlete_id uuid,change_reason text,phase_blocks jsonb)
returns boolean language plpgsql security invoker set search_path=public as $$
declare target_club uuid;item jsonb;block_id uuid;next_version integer;
begin
  if nullif(trim(change_reason),'') is null then raise exception 'El motivo es obligatorio';end if;
  if jsonb_typeof(phase_blocks)<>'array' or jsonb_array_length(phase_blocks)<>5 then raise exception 'Se requieren cinco fases';end if;
  select club_id into target_club from public.sesiones where id=target_session_id and atleta_id=target_athlete_id and deleted_at is null for update;
  if target_club is null or not public.can_modify_athlete(target_athlete_id) then raise exception 'Sesión no autorizada';end if;
  for item in select value from jsonb_array_elements(phase_blocks) loop
    select b.id into block_id from public.bloques_sesion b join public.catalogo_items ci on ci.id=b.fase_item_id where b.sesion_id=target_session_id and ci.codigo=item->>'phase';
    if block_id is null then raise exception 'Fase inexistente: %',item->>'phase';end if;
    update public.bloques_sesion set contenido=jsonb_set(coalesce(contenido,'{}'::jsonb),'{pedagogia}',coalesce(item->'content','{}'::jsonb),true) where id=block_id;
  end loop;
  select coalesce(max(numero_version),0)+1 into next_version from public.versiones_sesion where sesion_id=target_session_id;
  insert into public.versiones_sesion(club_id,sesion_id,numero_version,snapshot,motivo,created_by) values(target_club,target_session_id,next_version,jsonb_build_object('pedagogia',phase_blocks),change_reason,auth.uid());
  update public.sesiones set estado='borrador',published_at=null,published_by=null,updated_by=auth.uid() where id=target_session_id;
  return true;
end $$;
revoke execute on function public.save_session_pedagogy(uuid,uuid,text,jsonb) from public,anon;
grant execute on function public.save_session_pedagogy(uuid,uuid,text,jsonb) to authenticated;
commit;

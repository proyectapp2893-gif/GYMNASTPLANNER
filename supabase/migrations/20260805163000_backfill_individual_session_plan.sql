-- Reconnect existing individual sessions to the latest active individual plan.
-- This is idempotent and never changes general/group sessions.
with latest_plan as (
  select distinct on (club_id, atleta_id)
    id,
    club_id,
    atleta_id
  from public.planes_individuales
  where deleted_at is null
  order by club_id, atleta_id, created_at desc
)
update public.sesiones as session
set plan_individual_id = latest_plan.id,
    updated_at = now()
from latest_plan
where session.club_id = latest_plan.club_id
  and session.atleta_id = latest_plan.atleta_id
  and session.atleta_id is not null
  and session.plan_individual_id is null
  and session.deleted_at is null;

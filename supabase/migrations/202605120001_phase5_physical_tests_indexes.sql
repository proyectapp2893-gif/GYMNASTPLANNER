-- Phase 5: non-destructive indexes for physical-test history queries.

create index if not exists evaluaciones_fisicas_club_atleta_fecha_idx
on public.evaluaciones_fisicas (club_id, atleta_id, fecha desc);

create index if not exists evaluaciones_fisicas_club_created_idx
on public.evaluaciones_fisicas (club_id, created_at desc);

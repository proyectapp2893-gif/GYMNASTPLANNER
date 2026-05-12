-- Phase 6: non-destructive indexes for exercise catalog lookups.
-- This does not add a unique constraint because existing catalogs may contain duplicates.

create index if not exists ejercicios_club_nombre_aparato_idx
on public.ejercicios (club_id, lower(nombre), aparato);

create index if not exists ejercicios_club_categoria_aparato_dificultad_idx
on public.ejercicios (club_id, categoria, aparato, dificultad);

create index if not exists ejercicios_global_categoria_aparato_idx
on public.ejercicios (categoria, aparato)
where club_id is null;

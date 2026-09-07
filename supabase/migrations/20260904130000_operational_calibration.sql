begin;

alter table public.configuracion_carga
  add column if not exists disposicion_baja smallint not null default 2 check (disposicion_baja between 1 and 5),
  add column if not exists desviacion_intensidad_aviso numeric(5,1) not null default 15 check (desviacion_intensidad_aviso between 1 and 100),
  add column if not exists desviacion_duracion_aviso_pct numeric(5,1) not null default 20 check (desviacion_duracion_aviso_pct between 1 and 500),
  add column if not exists ventana_sesiones_recientes smallint not null default 3 check (ventana_sesiones_recientes between 1 and 20),
  add column if not exists dominio_prerrequisito_pct numeric(5,1) not null default 80 check (dominio_prerrequisito_pct between 1 and 100),
  add column if not exists vigencia_checkin_dias smallint not null default 7 check (vigencia_checkin_dias between 1 and 90);

commit;

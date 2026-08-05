# Planificación Individual de la Gimnasta

## Decisiones de arquitectura

El módulo individual vive bajo `/gimnastas/[id]` y no forma parte del dashboard anual `/dashboard`. Ambos se conectan mediante referencias al plan general (`plan_general_id`, `sesion_general_id`) y registros de sobreescritura. No se replica físicamente todo el macrociclo por deportista.

La resolución del plan sigue esta precedencia:

1. contenido vigente del plan general por nivel o grupo;
2. ajuste individual adaptado, reemplazado o suspendido;
3. contenido creado exclusivamente para la gimnasta;
4. conflicto pendiente cuando cambió la versión general sobre una adaptación existente.

Una actualización general nunca reemplaza silenciosamente un ajuste individual. Los snapshots y hashes de origen permiten decidir si el contenido puede actualizarse o requiere confirmación.

## Capas

- `src/app/gimnastas/[id]`: páginas servidor y navegación individual.
- `src/app/api/gimnastas/[id]`: validación de entrada, autenticación y casos de uso.
- `src/components/gymnasts`: formularios y visualizaciones reutilizables.
- `src/lib/individual-planning`, `individual-sessions`, `technical-tracking`, `pedagogical-session`: reglas de dominio sin dependencia de la interfaz.
- `src/lib/gymnasts/server.ts`: consultas servidor paginadas y acotadas por organización y gimnasta.
- `supabase/migrations`: esquema reproducible, RLS, almacenamiento privado, auditoría y guardas de transición.

## Seguridad

Todas las entidades sensibles llevan `club_id`. Las políticas usan la organización del perfil autenticado y, para entrenadores asistentes, la asignación activa en `atleta_entrenadores`. Administración puede gestionar catálogos y configuración; entrenadores principales pueden publicar y aprobar; asistentes registran ejecución solo para gimnastas asignadas; familia no accede al módulo técnico interno.

Las evidencias usan el bucket privado `gymnast-evidence`, rutas `club/gimnasta/archivo`, cargas firmadas y URLs de lectura con expiración. El tamaño y los formatos se validan antes de emitir la carga y al confirmar el registro. La eliminación comprueba pertenencia antes de borrar el objeto.

## Integridad

- La sesión exige las cinco fases pedagógicas.
- La publicación requiere objetivo, duración válida y dosificación completa.
- La aprobación de IA requiere rol autorizado, motivo, responsable y fecha.
- Una progresión no se aprueba por repeticiones: exige calidad, seguridad, consistencia, comprensión, control corporal y decisión del entrenador.
- Las restricciones son preventivas y no contienen diagnóstico, tratamiento ni autorización automática de retorno.
- La carga interna muestra la fórmula `duración real × RPE`; sus umbrales son configurables.

## Rendimiento

Las consultas de historial tienen límites y orden explícito; los listados usan paginación; las relaciones necesarias se consultan en una sola operación para evitar N+1; videos usan `preload="metadata"`; imágenes usan `next/image`; URLs privadas tienen expiración.

## Compatibilidad

Las migraciones son aditivas, conservan las tablas anteriores y hacen backfill solo cuando existe una equivalencia segura. Los tipos de base se regeneran en `src/lib/database.types.ts`. La adopción genérica de esos tipos en módulos históricos debe hacerse gradualmente para no cambiar contratos heredados sin pruebas.

# Operación de producción

## Revisión inicial

- Confirmar en Supabase Auth que `Site URL` sea `https://gymnastplanner-gymnastplanner.vercel.app`.
- Autorizar el mismo dominio y `/reset-password` como URL de redirección.
- Crear secretos del repositorio para las pruebas controladas: URL, anon key y service role de Supabase.
- Ejecutar manualmente el workflow **Seguridad y E2E controlado** después de cambiar RLS o autenticación.
- Mantener la service role únicamente en servicios de servidor y secretos protegidos.

## Piloto antes de incorporar más deportistas

1. Crear una gimnasta piloto con autorización de tratamiento de datos.
2. Vincularla a un grupo, macrociclo y entrenador responsable.
3. Heredar una sesión general y adaptar un único bloque.
4. Publicar, ejecutar y registrar asistencia, RPE y bienestar.
5. Registrar una evaluación, un objetivo, una restricción de prueba y una evidencia privada.
6. Generar el informe técnico y la versión para familia.
7. Confirmar con otra organización de prueba que no puede leer esos datos.

## Privacidad de menores

- Obtener consentimiento verificable antes de almacenar imágenes o video.
- Documentar quién puede ver evidencias y durante cuánto tiempo se conservan.
- Usar `privado` o `entrenadores` por defecto; habilitar `familia` de forma explícita.
- No registrar diagnósticos ni tratamientos en restricciones o bienestar.
- Atender solicitudes de eliminación mediante borrado lógico y eliminación segura del objeto privado.

## Respaldo y recuperación

- Verificar diariamente el estado del proyecto Supabase y semanalmente el consumo de Storage.
- Confirmar en el plan contratado la retención disponible de backups y recuperación temporal.
- Antes de migraciones de alto impacto, probar la migración en un proyecto separado.
- Conservar migraciones inmutables en Git; cualquier corrección debe agregarse como una migración nueva.

## Incidentes

1. Suspender publicaciones o cargas si existe una posible exposición de datos.
2. Identificar organización, usuario, entidad y periodo mediante auditoría.
3. Revocar sesiones o claves comprometidas.
4. Restaurar únicamente después de preservar evidencia técnica del incidente.
5. Documentar causa, alcance, corrección y medidas preventivas.

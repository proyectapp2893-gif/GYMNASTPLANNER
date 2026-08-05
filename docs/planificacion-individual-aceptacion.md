# Matriz de aceptación

Estado verificado el 4 de agosto de 2026.

| Área | Evidencia principal | Estado |
|---|---|---|
| Módulo separado del dashboard anual | Rutas `/gimnastas/[id]/*`; `/dashboard` permanece independiente | Cumple |
| Herencia sin duplicación completa | `planes_individuales`, `ajustes_plan_individual`, resolución y pruebas de herencia/conflicto | Cumple |
| Prevención de sobrescritura | hash/versión de origen, estados de conflicto y confirmación explícita | Cumple |
| Perfil y dashboard individual | resumen, perfil, entrenador, grupo, restricciones, objetivos y progreso | Cumple |
| Temporada y comparación | timeline de mesociclos, microciclos, sesiones generales/individuales y ejecución | Cumple |
| Cinco fases pedagógicas | esquema, editor detallado y RPC transaccional `save_session_pedagogy` | Cumple |
| Constructor de sesiones | drag-and-drop, banco, plantillas, borrador, publicación, duplicación y duración | Cumple |
| Prescripción física completa | dosis, carga/unidad, tempo, RPE, capacidad, patrón, segmento, plano, energía, transferencia, errores, progresión y regresión | Cumple |
| Técnica y metodología | matriz, estados configurables, prerrequisitos, pasos, criterios cualitativos, errores y tendencias | Cumple |
| Evaluación física | catálogo administrable, baterías, historial y resultados por unidad | Cumple |
| Carga y bienestar | previsto/real, RPE, aterrizajes, fórmula visible, variación y alertas configurables | Cumple |
| Restricciones y reintegro | registro, alertas al planificar, adaptaciones, responsable y trazabilidad | Cumple |
| Asistencia y cumplimiento | estados diferenciados, ejecución real y métricas individuales | Cumple |
| Evidencias privadas | carga/lectura firmada, privacidad, límites configurables, fotograma y eliminación segura | Cumple |
| Objetivos y competencias | CRUD individual, avance, cuenta regresiva y preparación por elementos | Cumple |
| IA asistida | contexto histórico, borrador editable, fundamento, aprobación obligatoria y versión original | Cumple |
| Informes | técnico, físico, cumplimiento, competitivo y pedagógico con impresión/PDF del navegador y CSV técnico | Cumple |
| Multi-tenant y roles | RLS, asignación de entrenador y 13 pruebas remotas de autorización | Cumple |
| Auditoría/versiones | snapshots de sesión, auditoría de cambios y decisiones de IA | Cumple |
| Responsive | Playwright autenticado en Chromium: escritorio 1440×900, iPad y iPhone; resumen y constructor sin desbordamiento | Cumple |
| Tipos/lint/pruebas/build | `tsc`, ESLint, 29 pruebas Vitest, 13 controles RLS, 3 E2E, `supabase db lint`, `next build` | Cumple |
| Dependencias de producción | Next.js 16.3.0 y `npm audit`: 0 vulnerabilidades conocidas | Cumple |

## Puertas de calidad reproducibles

```bash
npx tsc --noEmit
npm run lint
npm test
npm run test:authorization
npm run test:e2e
supabase db lint --linked
npm run build
```

## Trabajo posterior que no bloquea el alcance actual

- Portal de familia/gimnasta: el requerimiento lo define expresamente como fase posterior. La política actual aplica mínimo privilegio hasta diseñar consentimiento y visibilidad.
- Revisión jurídica colombiana del tratamiento de datos de menores antes de operar comercialmente.
- Pruebas en dispositivos físicos adicionales y pruebas de volumen con datos representativos del despliegue.
- Integración con un servicio dedicado de transcodificación y miniaturas si el volumen de video supera las capacidades operativas de Vercel/Supabase Storage.

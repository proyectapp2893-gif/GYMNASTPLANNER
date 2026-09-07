import { describe, expect, it } from 'vitest'
import { buildTeamPhysicalSummary } from './team-physical-summary'

describe('buildTeamPhysicalSummary', () => {
  it('promedia el registro más reciente por atleta y prueba', () => {
    const summary = buildTeamPhysicalSummary([
      {
        atleta_id: 'atleta-1',
        fecha: '2026-09-01',
        resultados_pruebas_fisicas: [{ prueba_id: 'flexiones', valor: 30, unidad: 'repeticiones', catalogo_pruebas_fisicas: { nombre: 'Flexiones' } }],
      },
      {
        atleta_id: 'atleta-1',
        fecha: '2026-08-01',
        resultados_pruebas_fisicas: [{ prueba_id: 'flexiones', valor: 10, unidad: 'repeticiones', catalogo_pruebas_fisicas: { nombre: 'Flexiones' } }],
      },
      {
        atleta_id: 'atleta-2',
        fecha: '2026-08-15',
        resultados_pruebas_fisicas: [{ prueba_id: 'flexiones', valor: 20, unidad: 'repeticiones', catalogo_pruebas_fisicas: { nombre: 'Flexiones' } }],
      },
    ])

    expect(summary).toEqual([{ id: 'flexiones', nombre: 'Flexiones', promedio: 25, unidad: 'repeticiones', atletas: 2 }])
  })

  it('prioriza las pruebas con mayor cobertura y descarta valores inválidos', () => {
    const summary = buildTeamPhysicalSummary([
      {
        atleta_id: 'atleta-1',
        fecha: '2026-09-01',
        resultados_pruebas_fisicas: [
          { prueba_id: 'remo', valor: 12, catalogo_pruebas_fisicas: [{ nombre: 'Remo' }] },
          { prueba_id: 'salto', valor: null, catalogo_pruebas_fisicas: { nombre: 'Salto' } },
        ],
      },
      {
        atleta_id: 'atleta-2',
        fecha: '2026-09-01',
        resultados_pruebas_fisicas: [{ prueba_id: 'remo', valor: '18', catalogo_pruebas_fisicas: { nombre: 'Remo' } }],
      },
    ])

    expect(summary[0]).toMatchObject({ nombre: 'Remo', promedio: 15, atletas: 2 })
    expect(summary).toHaveLength(1)
  })
})

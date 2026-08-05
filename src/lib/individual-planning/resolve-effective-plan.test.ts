import { describe, expect, it } from 'vitest'
import { resolveEffectivePlan } from './resolve-effective-plan'
import type { PlanOverride } from './types'

const adaptedOverride: PlanOverride = {
  id: 'override-1',
  entityType: 'microciclo',
  sourceEntityId: 'week-1',
  fieldPath: 'weeks.week1.volume',
  origin: 'adaptado',
  value: 60,
  replacementId: null,
  baseVersion: 2,
  syncStatus: 'actualizado',
  reason: 'Carga individual',
}

describe('resolveEffectivePlan', () => {
  it('inherits the general snapshot when there are no overrides', () => {
    const general = { weeks: { week1: { volume: 80 } } }
    expect(resolveEffectivePlan(general, 2, []).snapshot).toEqual(general)
  })

  it('applies an individual override without mutating the source', () => {
    const general = { weeks: { week1: { volume: 80 } } }
    const result = resolveEffectivePlan(general, 2, [adaptedOverride])

    expect(result.snapshot).toEqual({ weeks: { week1: { volume: 60 } } })
    expect(general.weeks.week1.volume).toBe(80)
    expect(result.conflicts).toHaveLength(0)
  })

  it('keeps an adaptation and reports a conflict after the general plan changes', () => {
    const result = resolveEffectivePlan(
      { weeks: { week1: { volume: 90 } } },
      3,
      [adaptedOverride],
    )

    expect(result.snapshot).toEqual({ weeks: { week1: { volume: 60 } } })
    expect(result.conflicts).toHaveLength(1)
    expect(result.conflicts[0].currentVersion).toBe(3)
  })

  it('removes suspended content from the effective plan', () => {
    const result = resolveEffectivePlan(
      { weeks: { week1: { skill: 'Flic-flac', volume: 80 } } },
      1,
      [{ ...adaptedOverride, origin: 'suspendido', fieldPath: 'weeks.week1.skill', value: null, baseVersion: 1 }],
    )

    expect(result.snapshot).toEqual({ weeks: { week1: { volume: 80 } } })
  })
})

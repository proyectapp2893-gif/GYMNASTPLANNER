import { describe, expect, it } from 'vitest'
import { getSessionDayProfile } from './session-focus'

describe('getSessionDayProfile', () => {
  it('does not interpret floor as an apparatus on a choreography and ballet day', () => {
    const profile = getSessionDayProfile('Coreografía, Ballet y Prevención', 'Suelo, Danza')
    expect(profile.kind).toBe('dance_choreography')
    expect(profile.apparatus).toEqual([])
    expect(profile.displayTags).toEqual(['Danza', 'Prevención'])
  })

  it('keeps floor as an apparatus when technical or acrobatic work is explicit', () => {
    const profile = getSessionDayProfile('Técnica de suelo, acrobacia y coreografía', 'Suelo, Danza')
    expect(profile.isApparatusDay).toBe(true)
    expect(profile.apparatus).toContain('Suelo')
  })

  it('recognizes ordinary apparatus sessions', () => {
    const profile = getSessionDayProfile('Flexibilidad, Viga y Suelo', 'Viga, Suelo')
    expect(profile.kind).toBe('apparatus')
    expect(profile.apparatus).toEqual(['Viga de Equilibrio', 'Suelo'])
  })
})

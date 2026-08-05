export type SessionDayKind = 'dance_choreography' | 'apparatus' | 'physical_prevention' | 'mixed'

export type SessionDayProfile = {
  kind: SessionDayKind
  label: string
  displayTags: string[]
  apparatus: string[]
  isApparatusDay: boolean
  blockTimes: {
    calentamiento: string
    prep_fisica: string
    tecnico: string
    rutinas: string
    flexibilidad: string
    cierre: string
  }
}

const normalize = (value = '') => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const APPARATUS = [
  { label: 'Salto', terms: ['salto'] },
  { label: 'Barras Asimétricas', terms: ['barras', 'asimetricas'] },
  { label: 'Viga de Equilibrio', terms: ['viga'] },
  { label: 'Suelo', terms: ['suelo', 'piso', 'manos libres'] },
] as const

export function getSessionDayProfile(focus = '', rawTags = ''): SessionDayProfile {
  const normalizedFocus = normalize(focus)
  const normalizedTags = normalize(rawTags)
  const isDance = ['coreografia', 'ballet', 'danza', 'expresion corporal'].some(term => normalizedFocus.includes(term))
  const hasPrevention = ['prevencion', 'prehabilitacion', 'movilidad preventiva'].some(term => normalizedFocus.includes(term))
  const hasExplicitFloorTechnique = ['acroba', 'tumbling', 'pasada', 'rutina de suelo', 'tecnica de suelo'].some(term => normalizedFocus.includes(term))
  const apparatus = APPARATUS.filter(item => {
    const appears = item.terms.some(term => normalizedFocus.includes(term) || normalizedTags.includes(term))
    if (item.label === 'Suelo' && isDance && !hasExplicitFloorTechnique) return false
    return appears
  }).map(item => item.label)

  if (isDance && apparatus.length === 0) {
    return {
      kind: 'dance_choreography',
      label: 'Danza, coreografía y prevención',
      displayTags: hasPrevention ? ['Danza', 'Prevención'] : ['Danza', 'Coreografía'],
      apparatus: [],
      isApparatusDay: false,
      blockTimes: { calentamiento: '15', prep_fisica: '20', tecnico: '30', rutinas: '35', flexibilidad: '10', cierre: '10' },
    }
  }

  if (apparatus.length > 0) {
    return {
      kind: isDance ? 'mixed' : 'apparatus',
      label: isDance ? 'Sesión mixta: aparato y danza' : 'Trabajo técnico por aparatos',
      displayTags: [...apparatus, ...(isDance ? ['Danza'] : [])],
      apparatus,
      isApparatusDay: true,
      blockTimes: { calentamiento: '15', prep_fisica: '25', tecnico: '45', rutinas: '15', flexibilidad: '10', cierre: '10' },
    }
  }

  if (hasPrevention || ['fisica', 'fuerza', 'flexibilidad', 'movilidad'].some(term => normalizedFocus.includes(term))) {
    return {
      kind: 'physical_prevention',
      label: 'Preparación física y prevención',
      displayTags: hasPrevention ? ['Preparación física', 'Prevención'] : ['Preparación física'],
      apparatus: [],
      isApparatusDay: false,
      blockTimes: { calentamiento: '15', prep_fisica: '45', tecnico: '20', rutinas: '0', flexibilidad: '25', cierre: '15' },
    }
  }

  return {
    kind: 'mixed',
    label: 'Sesión general',
    displayTags: rawTags.split(',').map(tag => tag.trim()).filter(Boolean).length ? rawTags.split(',').map(tag => tag.trim()).filter(Boolean) : ['General'],
    apparatus: [],
    isApparatusDay: false,
    blockTimes: { calentamiento: '15', prep_fisica: '25', tecnico: '35', rutinas: '15', flexibilidad: '15', cierre: '15' },
  }
}

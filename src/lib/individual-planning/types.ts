export type PlanOrigin = 'heredado' | 'adaptado' | 'individual' | 'suspendido' | 'reemplazado'

export type SyncStatus = 'actualizado' | 'conflicto' | 'requiere_confirmacion' | 'ignorado'

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export type PlanOverride = {
  id: string
  entityType: string
  sourceEntityId: string | null
  fieldPath: string | null
  origin: PlanOrigin
  value: JsonValue | null
  replacementId: string | null
  baseVersion: number
  syncStatus: SyncStatus
  reason: string | null
}

export type EffectivePlanItem = {
  key: string
  value: JsonValue | undefined
  origin: PlanOrigin
  overrideId: string | null
  syncStatus: SyncStatus
}

export type PlanConflict = {
  overrideId: string
  fieldPath: string | null
  baseVersion: number
  currentVersion: number
  reason: string
}

export type EffectivePlan = {
  snapshot: JsonValue
  items: EffectivePlanItem[]
  conflicts: PlanConflict[]
}

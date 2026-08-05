import type { EffectivePlan, EffectivePlanItem, JsonValue, PlanConflict, PlanOverride } from './types'

export function resolveEffectivePlan(
  generalSnapshot: JsonValue,
  currentVersion: number,
  overrides: PlanOverride[],
): EffectivePlan {
  let snapshot = cloneJson(generalSnapshot)
  const items: EffectivePlanItem[] = []
  const conflicts: PlanConflict[] = []

  for (const override of overrides) {
    const fieldPath = override.fieldPath
    const versionConflict = override.baseVersion !== currentVersion && override.origin !== 'heredado'
    const explicitConflict = override.syncStatus === 'conflicto' || override.syncStatus === 'requiere_confirmacion'

    if (versionConflict || explicitConflict) {
      conflicts.push({
        overrideId: override.id,
        fieldPath,
        baseVersion: override.baseVersion,
        currentVersion,
        reason: explicitConflict
          ? 'El ajuste requiere revisión del entrenador.'
          : 'El plan general cambió después de crear esta adaptación.',
      })
    }

    if (!fieldPath) {
      items.push(toEffectiveItem(override, undefined))
      continue
    }

    if (override.origin === 'heredado') {
      items.push(toEffectiveItem(override, readPath(snapshot, fieldPath)))
      continue
    }

    // A conflict is reported but the individual value remains effective. This
    // prevents a newer general version from silently overwriting coach work.
    if (override.origin === 'suspendido') {
      snapshot = removePath(snapshot, fieldPath)
      items.push(toEffectiveItem(override, undefined))
      continue
    }

    snapshot = writePath(snapshot, fieldPath, cloneJson(override.value))
    items.push(toEffectiveItem(override, override.value ?? undefined))
  }

  return { snapshot, items, conflicts }
}

function toEffectiveItem(override: PlanOverride, value: JsonValue | undefined): EffectivePlanItem {
  return {
    key: override.fieldPath || `${override.entityType}:${override.sourceEntityId || override.id}`,
    value,
    origin: override.origin,
    overrideId: override.id,
    syncStatus: override.syncStatus,
  }
}

function readPath(value: JsonValue, path: string): JsonValue | undefined {
  let current: JsonValue | undefined = value
  for (const segment of splitPath(path)) {
    if (!isJsonObject(current)) return undefined
    current = current[segment]
  }
  return current
}

function writePath(value: JsonValue, path: string, replacement: JsonValue): JsonValue {
  const root = isJsonObject(value) ? cloneJson(value) : {}
  const segments = splitPath(path)
  if (segments.length === 0) return replacement

  let current: Record<string, JsonValue> = root
  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      current[segment] = replacement
      return
    }
    const next = current[segment]
    current[segment] = isJsonObject(next) ? cloneJson(next) : {}
    current = current[segment] as Record<string, JsonValue>
  })
  return root
}

function removePath(value: JsonValue, path: string): JsonValue {
  if (!isJsonObject(value)) return value
  const root = cloneJson(value)
  const segments = splitPath(path)
  let current: Record<string, JsonValue> = root

  for (let index = 0; index < segments.length - 1; index += 1) {
    const next = current[segments[index]]
    if (!isJsonObject(next)) return root
    current = next
  }
  delete current[segments.at(-1) || '']
  return root
}

function splitPath(path: string) {
  return path.split('.').map(segment => segment.trim()).filter(Boolean)
}

function isJsonObject(value: JsonValue | undefined): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cloneJson<T extends JsonValue>(value: T): T {
  return structuredClone(value)
}

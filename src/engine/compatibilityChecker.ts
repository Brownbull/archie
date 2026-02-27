import { MAX_INCOMPATIBILITY_REASON_LENGTH } from "@/lib/constants"

export interface CompatibilityResult {
  isCompatible: boolean
  reason: string
}

interface CompatibilityInput {
  category: string
  compatibility?: Record<string, string>
}

function clampReason(reason: string): string {
  return reason.length > MAX_INCOMPATIBILITY_REASON_LENGTH
    ? reason.slice(0, MAX_INCOMPATIBILITY_REASON_LENGTH) + "…"
    : reason
}

export function checkCompatibility(
  sourceComponent: CompatibilityInput | undefined,
  targetComponent: CompatibilityInput | undefined,
): CompatibilityResult {
  if (!sourceComponent || !targetComponent) {
    return { isCompatible: true, reason: "" }
  }

  // Check source → target direction
  const sourceCompat = sourceComponent.compatibility
  if (sourceCompat && Object.keys(sourceCompat).length > 0) {
    const reason = sourceCompat[targetComponent.category]
    if (reason !== undefined) {
      return { isCompatible: false, reason: clampReason(reason) }
    }
  }

  // Check target → source direction (bidirectional — TD-1-4a Item 3)
  const targetCompat = targetComponent.compatibility
  if (targetCompat && Object.keys(targetCompat).length > 0) {
    const reason = targetCompat[sourceComponent.category]
    if (reason !== undefined) {
      return { isCompatible: false, reason: clampReason(reason) }
    }
  }

  return { isCompatible: true, reason: "" }
}

export interface CompatibilityResult {
  isCompatible: boolean
  reason: string
}

interface CompatibilityInput {
  category: string
  compatibility?: Record<string, string>
}

export function checkCompatibility(
  sourceComponent: CompatibilityInput | undefined,
  targetComponent: CompatibilityInput | undefined,
): CompatibilityResult {
  if (!sourceComponent || !targetComponent) {
    return { isCompatible: true, reason: "" }
  }

  const compatibility = sourceComponent.compatibility
  if (!compatibility || Object.keys(compatibility).length === 0) {
    return { isCompatible: true, reason: "" }
  }

  const reason = compatibility[targetComponent.category]
  if (reason !== undefined) {
    return { isCompatible: false, reason }
  }

  return { isCompatible: true, reason: "" }
}

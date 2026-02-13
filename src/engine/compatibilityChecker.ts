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

  // Check source → target direction
  const sourceCompat = sourceComponent.compatibility
  if (sourceCompat && Object.keys(sourceCompat).length > 0) {
    const reason = sourceCompat[targetComponent.category]
    if (reason !== undefined) {
      return { isCompatible: false, reason }
    }
  }

  // Check target → source direction (bidirectional — TD-1-4a Item 3)
  const targetCompat = targetComponent.compatibility
  if (targetCompat && Object.keys(targetCompat).length > 0) {
    const reason = targetCompat[sourceComponent.category]
    if (reason !== undefined) {
      return { isCompatible: false, reason }
    }
  }

  return { isCompatible: true, reason: "" }
}

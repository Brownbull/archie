import { type PortDefinition } from "@/lib/constants"
import { MAX_INCOMPATIBILITY_REASON_LENGTH } from "@/lib/constants"

export interface PortCompatibilityResult {
  isCompatible: boolean
  isPortMismatch: boolean
  reason: string
}

export interface PortLookupContext {
  ports?: PortDefinition[]
  category: string
  compatibility?: Record<string, string>
}

function clampReason(reason: string): string {
  return reason.length > MAX_INCOMPATIBILITY_REASON_LENGTH
    ? reason.slice(0, MAX_INCOMPATIBILITY_REASON_LENGTH) + "…"
    : reason
}

function findPort(
  ports: PortDefinition[] | undefined,
  handleId: string,
): PortDefinition | undefined {
  return ports?.find((p) => p.id === handleId)
}

export function checkPortCompatibility(
  sourceHandleId: string | null | undefined,
  targetHandleId: string | null | undefined,
  sourceComponent: PortLookupContext | undefined,
  targetComponent: PortLookupContext | undefined,
): PortCompatibilityResult {
  if (!sourceComponent || !targetComponent) {
    return { isCompatible: true, isPortMismatch: false, reason: "" }
  }

  if (!sourceHandleId || !targetHandleId) {
    return { isCompatible: true, isPortMismatch: false, reason: "" }
  }

  const sourcePort = findPort(sourceComponent.ports, sourceHandleId)
  const targetPort = findPort(targetComponent.ports, targetHandleId)

  if (!sourcePort || !targetPort) {
    return { isCompatible: true, isPortMismatch: false, reason: "" }
  }

  if (sourcePort.direction !== "out") {
    return {
      isCompatible: false,
      isPortMismatch: true,
      reason: clampReason(
        `Port "${sourcePort.id}" is an input port and cannot be used as a source`,
      ),
    }
  }

  if (targetPort.direction !== "in") {
    return {
      isCompatible: false,
      isPortMismatch: true,
      reason: clampReason(
        `Port "${targetPort.id}" is an output port and cannot be used as a target`,
      ),
    }
  }

  if (sourcePort.type !== targetPort.type) {
    return {
      isCompatible: false,
      isPortMismatch: true,
      reason: clampReason(
        `Port type mismatch: ${sourcePort.type} → ${targetPort.type}`,
      ),
    }
  }

  return { isCompatible: true, isPortMismatch: false, reason: "" }
}

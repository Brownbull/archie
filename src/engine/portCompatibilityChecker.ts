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

/** Minimal edge shape carrying the precomputed port-mismatch flag. Every edge-creation site
 *  (architectureStore, stackPlacement, yamlImporter) writes `data.isPortMismatch` at creation. */
interface PortMismatchEdge {
  data?: { isPortMismatch?: boolean }
}

/**
 * Tallies edges whose endpoints have mismatched ports (D87). Pure — it only sums the flag the
 * canvas already computed at each edge's creation, so it needs no component library access. A
 * challenge attempt freezes this count into its start-time snapshot (challengeStore.AttemptSnapshot)
 * so a mid-run edit can't change the well-formed-star verdict. Empty / undefined-data edges count 0.
 */
export function countPortMismatches(edges: readonly PortMismatchEdge[]): number {
  return edges.reduce((n, e) => (e.data?.isPortMismatch ? n + 1 : n), 0)
}

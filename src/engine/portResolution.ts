import { PORT_SORT_ORDER, type PortDefinition } from "@/lib/constants"

const PORT_PRIORITY = new Map(PORT_SORT_ORDER.map((t, i) => [t, i]))

export interface ResolvedPortPair {
  sourceHandleId: string | null
  targetHandleId: string | null
}

/**
 * Pick which source-out / target-in handles an edge should connect, by matching port TYPE.
 *
 * Reused by v2→v3 migration, stack loading, and blueprint hydration so EVERY path that builds
 * edges wires them to the correct typed handles — instead of leaving them null and letting React
 * Flow fall back to a node's default handle (which made cache + database links all appear to leave
 * the same http port). The handle id IS the port id (ArchieNode renders `<Handle id={port.id}>`).
 *
 * - Cross-matches source `out` ports against target `in` ports where the port types are equal.
 * - `preferredType` (e.g. a stack connection's `connectionType`) steers the match: a same-type
 *   match wins; otherwise the lowest PORT_SORT_ORDER type wins (stable, deterministic tie-break).
 *   Free-form/unknown values simply don't match any port and fall through to the priority pick.
 * - Returns { null, null } when ports are missing or no type matches — preserving today's legacy
 *   behaviour for port-less components. It never invents a handle that doesn't exist.
 */
export function resolvePortPair(
  sourcePorts: readonly PortDefinition[] | undefined,
  targetPorts: readonly PortDefinition[] | undefined,
  preferredType?: string,
): ResolvedPortPair {
  const none: ResolvedPortPair = { sourceHandleId: null, targetHandleId: null }
  if (!sourcePorts || !targetPorts) return none

  const matches: Array<{ source: PortDefinition; target: PortDefinition; priority: number }> = []
  for (const sp of sourcePorts) {
    if (sp.direction !== "out") continue
    for (const tp of targetPorts) {
      if (tp.direction !== "in" || tp.type !== sp.type) continue
      matches.push({ source: sp, target: tp, priority: PORT_PRIORITY.get(sp.type) ?? 999 })
    }
  }
  if (matches.length === 0) return none

  if (preferredType) {
    const preferred = matches.find((m) => m.source.type === preferredType)
    if (preferred) return { sourceHandleId: preferred.source.id, targetHandleId: preferred.target.id }
  }

  matches.sort((a, b) => a.priority - b.priority)
  const best = matches[0]
  return { sourceHandleId: best.source.id, targetHandleId: best.target.id }
}

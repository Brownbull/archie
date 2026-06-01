import { componentLibrary } from "@/services/componentLibrary"
import {
  NODE_TYPE_COMPONENT,
  EDGE_TYPE_CONNECTION,
  NODE_WIDTH,
  MIN_REPLICAS,
  CANVAS_GRID_SIZE,
  type ComponentCategoryId,
} from "@/lib/constants"
import { snapToGrid } from "@/lib/canvasUtils"
import type { ArchieNode, ArchieEdge } from "@/stores/architectureStore"

/**
 * Every diagram should have an explicit origin of load — a Traffic Source — rather than RPS
 * appearing from thin air. These helpers inject a sensible default source (sized to a target RPS
 * when known) and wire it to the entry of a graph. Used when loading blueprints, dropping the first
 * stack, and starting a challenge. Safe to call when a source is already present (no-op).
 */
const TRAFFIC_CATEGORY = "traffic"
const DEFAULT_SOURCE_ID = "web-users"

interface SourcePick {
  componentId: string
  variantId: string
}

function sourceVariants(): { componentId: string; variantId: string; maxRps: number; preferred: boolean }[] {
  const out: { componentId: string; variantId: string; maxRps: number; preferred: boolean }[] = []
  for (const c of componentLibrary.getComponentsByCategory(TRAFFIC_CATEGORY)) {
    for (const v of c.configVariants) {
      out.push({ componentId: c.id, variantId: v.id, maxRps: v.maxRPS ?? 0, preferred: c.id === DEFAULT_SOURCE_ID })
    }
  }
  return out
}

/** Picks a traffic source+tier whose rate best matches targetRps; defaults to Web Users when none. */
export function pickTrafficSource(targetRps?: number): SourcePick | null {
  const variants = sourceVariants()
  if (variants.length === 0) return null
  if (!targetRps || targetRps <= 0) {
    const web = variants.filter((v) => v.preferred)
    const pool = (web.length ? web : variants).slice().sort((a, b) => a.maxRps - b.maxRps)
    return { componentId: pool[0].componentId, variantId: pool[0].variantId }
  }
  let best = variants[0]
  for (const v of variants) {
    const d = Math.abs(v.maxRps - targetRps)
    const bd = Math.abs(best.maxRps - targetRps)
    if (d < bd || (d === bd && v.preferred && !best.preferred)) best = v
  }
  return { componentId: best.componentId, variantId: best.variantId }
}

export function hasTrafficSource(nodes: ReadonlyArray<{ data?: { componentCategory?: string } }>): boolean {
  return nodes.some((n) => n.data?.componentCategory === TRAFFIC_CATEGORY)
}

/** Builds a traffic-source node (sized to targetRps) at a position, or null if none available. */
export function makeTrafficSourceNode(
  targetRps: number | undefined,
  position: { x: number; y: number },
): ArchieNode | null {
  const pick = pickTrafficSource(targetRps)
  if (!pick) return null
  const comp = componentLibrary.getComponent(pick.componentId)
  if (!comp) return null
  return {
    id: crypto.randomUUID(),
    type: NODE_TYPE_COMPONENT,
    position: { x: snapToGrid(position.x), y: snapToGrid(position.y) },
    data: {
      archieComponentId: comp.id,
      activeConfigVariantId: pick.variantId,
      componentName: comp.name,
      componentCategory: TRAFFIC_CATEGORY as ComponentCategoryId,
      replicaCount: MIN_REPLICAS,
    },
    width: NODE_WIDTH,
  }
}

function entryInPort(componentId: string): string | null {
  const ports = componentLibrary.getComponent(componentId)?.ports ?? []
  const port = ports.find((p) => p.direction === "in" && p.type === "http") ?? ports.find((p) => p.direction === "in")
  return port?.id ?? null
}

function sourceEdge(source: ArchieNode, target: ArchieNode): ArchieEdge {
  const targetHandle = entryInPort(target.data.archieComponentId)
  return {
    id: crypto.randomUUID(),
    source: source.id,
    target: target.id,
    sourceHandle: "http-out",
    targetHandle,
    type: EDGE_TYPE_CONNECTION,
    data: {
      isIncompatible: false,
      isPortMismatch: false,
      incompatibilityReason: null,
      sourceArchieComponentId: source.data.archieComponentId,
      targetArchieComponentId: target.data.archieComponentId,
      sourceHandleId: "http-out",
      targetHandleId: targetHandle,
    },
  }
}

/**
 * Ensures a graph has an explicit traffic origin: when no source is present, prepend one (sized to
 * targetRps) to the left of the entry nodes and wire it to each entry (in-degree 0). No-op on an
 * empty graph or when a source already exists.
 */
export function withEntryTrafficSource(
  nodes: ArchieNode[],
  edges: ArchieEdge[],
  targetRps?: number,
): { nodes: ArchieNode[]; edges: ArchieEdge[] } {
  if (nodes.length === 0 || hasTrafficSource(nodes)) return { nodes, edges }
  const hasIncoming = new Set(edges.map((e) => e.target))
  const entries = nodes.filter((n) => !hasIncoming.has(n.id))
  if (entries.length === 0) return { nodes, edges }
  const minX = Math.min(...nodes.map((n) => n.position.x))
  const avgY = entries.reduce((sum, n) => sum + n.position.y, 0) / entries.length
  const source = makeTrafficSourceNode(targetRps, { x: minX - (NODE_WIDTH + CANVAS_GRID_SIZE * 5), y: avgY })
  if (!source) return { nodes, edges }
  return { nodes: [source, ...nodes], edges: [...edges, ...entries.map((e) => sourceEdge(source, e))] }
}

/** Peak RPS across a traffic curve (a challenge's target load). */
export function curvePeakRps(curve: ReadonlyArray<{ rps: number }>): number {
  return curve.reduce((max, p) => Math.max(max, p.rps), 0)
}

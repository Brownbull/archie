import { z } from "zod"
import { ArchitectureFileSchema, CURRENT_SCHEMA_VERSION } from "@/schemas/architectureFileSchema"
import type { ArchitectureFile } from "@/schemas/architectureFileSchema"
import type { ArchieNode, ArchieEdge } from "@/stores/architectureStore"

/**
 * Chain carry-forward (P5-S5, D95): when a CHAIN quest is 3★'d, the winning build is snapshotted
 * client-side so the next stage starts FROM IT — one architecture grown across requirement stages,
 * the feedback's progressive-challenge vision. Client-side localStorage by design (same tier as
 * canvas autosave: a per-device convenience, not progression truth — losing it falls back to the
 * stage's authored seed, never blocks the quest).
 *
 * The snapshot is stored in the ArchitectureFile shape and re-validated through the SAME schema on
 * read (localStorage is untrusted input), then hydrated through the import pipeline by the seeding
 * service — one code path for imports, brownfield seeds, and carried-forward builds.
 */
const KEY_PREFIX = "archie-chain-build:"
const MAX_SNAPSHOT_BYTES = 256 * 1024 // a 50-node build serializes well under this; cap defensively

const SnapshotSchema = ArchitectureFileSchema.pick({ schemaVersion: true, nodes: true, edges: true })
type Snapshot = z.infer<typeof SnapshotSchema>

/** Serialize + persist the 3★ build for `challengeId`. Silent on quota/serialization failure. */
export function saveChainBuild(challengeId: string, nodes: readonly ArchieNode[], edges: readonly ArchieEdge[]): void {
  if (!challengeId) return
  try {
    const snapshot: Snapshot = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      nodes: nodes.map((n) => ({
        id: n.id,
        componentId: n.data.archieComponentId,
        configVariantId: n.data.activeConfigVariantId || undefined,
        position: { x: n.position.x, y: n.position.y },
        replicas: n.data.replicaCount ?? 1,
        trafficRps: n.data.trafficRps,
        trafficKind: n.data.trafficKind as Snapshot["nodes"][number]["trafficKind"],
        trafficWorkload: n.data.trafficWorkload,
        trafficOrigin: n.data.trafficOrigin,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        sourceNodeId: e.source,
        targetNodeId: e.target,
        sourceHandleId: e.sourceHandle ?? undefined,
        targetHandleId: e.targetHandle ?? undefined,
      })),
    }
    const raw = JSON.stringify(snapshot)
    if (raw.length > MAX_SNAPSHOT_BYTES) return
    localStorage.setItem(KEY_PREFIX + challengeId, raw)
  } catch {
    // quota exceeded / private mode — carry-forward is a convenience, never an error surface
  }
}

/** The validated snapshot for `challengeId`, or null (absent, corrupt, or schema-rejected). */
export function loadChainBuild(challengeId: string): Pick<ArchitectureFile, "nodes" | "edges"> | null {
  if (!challengeId) return null
  try {
    const raw = localStorage.getItem(KEY_PREFIX + challengeId)
    if (!raw) return null
    const parsed = SnapshotSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return null
    return { nodes: parsed.data.nodes, edges: parsed.data.edges }
  } catch {
    return null
  }
}

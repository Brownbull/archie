import { hydrateArchitectureSkeleton } from "@/services/yamlImporter"
import { CURRENT_SCHEMA_VERSION } from "@/schemas/architectureFileSchema"
import { makeChallengeTrafficNodes, hasTrafficSource } from "@/services/trafficSourceInjection"
import { loadChainBuild } from "@/services/chainCarryForward"
import type { ArchitectureFile } from "@/schemas/architectureFileSchema"
import type { ArchieNode, ArchieEdge } from "@/stores/architectureStore"
import type { Challenge } from "@/lib/challengeTypes"

/**
 * The starting canvas for a quest (P5-S1, D95).
 *
 * Greenfield (no `initial_architecture` — every pre-Phase-5 quest): one typed traffic node per
 * authored source, empty edges — byte-identical to the previous behavior.
 *
 * Brownfield: hydrate the authored architecture through the SAME pipeline the Import flow uses
 * (component resolution, variant fallback, port-aware edges, snap-to-grid), so an inherited build
 * behaves exactly like one the player imported. If the authored seed carries no traffic source,
 * the challenge's traffic nodes are appended — demand must always have an origin on the canvas.
 * Hydration is defensive: a seed that fails to hydrate falls back to greenfield seeding rather
 * than blocking the quest (the harness pins authored seeds, so this path is unreachable for
 * shipped content — it guards user-authored quests).
 */
export function makeChallengeCanvas(challenge: Challenge): { nodes: ArchieNode[]; edges: ArchieEdge[] } {
  // P5-S5: a chain stage continues the PLAYER'S build of its parent when one is saved (the
  // progressive-challenge vision — grow one architecture across stages); the authored seed is the
  // fallback, traffic-only the floor. All three roads hydrate through the same import pipeline.
  const carried: Pick<ArchitectureFile, "nodes" | "edges"> | null =
    challenge.chain?.continuesFrom ? loadChainBuild(challenge.chain.continuesFrom) : null
  const seed = carried ?? challenge.initialArchitecture
  if (!seed || seed.nodes.length === 0) {
    return { nodes: makeChallengeTrafficNodes(challenge), edges: [] }
  }

  const result = hydrateArchitectureSkeleton({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    name: `${challenge.id} — inherited architecture`,
    nodes: seed.nodes,
    edges: seed.edges,
  })
  if (!result.success) {
    if (import.meta.env.DEV) console.warn(`Brownfield seed for "${challenge.id}" failed to hydrate — falling back to traffic-only:`, result.errors)
    return { nodes: makeChallengeTrafficNodes(challenge), edges: [] }
  }

  const nodes = hasTrafficSource(result.architecture.nodes)
    ? result.architecture.nodes
    : [...makeChallengeTrafficNodes(challenge), ...result.architecture.nodes]
  return { nodes, edges: result.architecture.edges }
}

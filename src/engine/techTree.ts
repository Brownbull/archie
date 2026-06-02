import type { Challenge, TechTreeNode, TechTreeResult, TechTreeIssue, TechTreeStatus } from "@/lib/challengeTypes"
import { BASE_UNLOCKED_BLOCKS, MAX_CHALLENGE_TIER, trackOrder } from "@/lib/challengeTracks"

/**
 * Pure tech-tree resolver (Mastery Tracks, D40 / Phase 1). Given the authored challenges and the
 * set of challenge ids a player has completed, it derives — with zero side effects and fully
 * deterministically — each challenge's status (completed / available / locked) and the set of
 * component TYPE ids the player has unlocked.
 *
 * A challenge is `available` once every id in its `requires` is completed; otherwise `locked`.
 * Prerequisites are direct (one hop): if a direct prerequisite is itself locked, this challenge is
 * locked too, because that prerequisite won't be in the completed set. No graph walk is needed for
 * status — only `validateTechTree` walks the graph (to catch authoring cycles / dangling refs).
 */
export function resolveTechTree(
  challenges: readonly Challenge[],
  completedIds: Iterable<string>,
  baseBlocks: readonly string[] = BASE_UNLOCKED_BLOCKS,
): TechTreeResult {
  const completed = new Set(completedIds)

  const nodes = new Map<string, TechTreeNode>()
  const unlockedBlocks = new Set<string>(baseBlocks)

  for (const challenge of challenges) {
    const isDone = completed.has(challenge.id)
    const missingRequirements = isDone ? [] : challenge.requires.filter((r) => !completed.has(r))
    const status: TechTreeStatus = isDone ? "completed" : missingRequirements.length === 0 ? "available" : "locked"

    nodes.set(challenge.id, { challenge, status, missingRequirements })

    // Only completed challenges that actually exist contribute their permanent block grants.
    if (isDone) {
      for (const block of challenge.grants) unlockedBlocks.add(block)
    }
  }

  const ordered = [...nodes.values()].sort(compareNodes)

  return { nodes, ordered, unlockedBlocks }
}

/** Deterministic tree order: track order, then tier (untiered last), then id. */
function compareNodes(a: TechTreeNode, b: TechTreeNode): number {
  const trackDelta = trackOrder(a.challenge.track) - trackOrder(b.challenge.track)
  if (trackDelta !== 0) return trackDelta
  const tierDelta = (a.challenge.tier ?? MAX_CHALLENGE_TIER + 1) - (b.challenge.tier ?? MAX_CHALLENGE_TIER + 1)
  if (tierDelta !== 0) return tierDelta
  return a.challenge.id.localeCompare(b.challenge.id)
}

/**
 * Validate a challenge set as a tech tree: duplicate ids, dangling `requires` / `unlocks`
 * references, and cycles in the `requires` graph (which would make a challenge unreachable).
 * Pure + deterministic; returns an ordered list of issues (empty when the tree is sound).
 */
export function validateTechTree(challenges: readonly Challenge[]): TechTreeIssue[] {
  const issues: TechTreeIssue[] = []

  // Duplicate ids — last-write-wins downstream, but flag the collision.
  const seen = new Set<string>()
  for (const c of challenges) {
    if (seen.has(c.id)) issues.push({ kind: "duplicate-id", challengeId: c.id, detail: `Duplicate challenge id: ${c.id}` })
    seen.add(c.id)
  }

  const ids = new Set(challenges.map((c) => c.id))

  // Dangling references.
  for (const c of challenges) {
    for (const r of c.requires) {
      if (!ids.has(r)) issues.push({ kind: "unknown-requires", challengeId: c.id, detail: `requires unknown challenge: ${r}` })
    }
    for (const u of c.unlocks) {
      if (!ids.has(u)) issues.push({ kind: "unknown-unlocks", challengeId: c.id, detail: `unlocks unknown challenge: ${u}` })
    }
  }

  issues.push(...findRequiresCycles(challenges, ids))

  return issues
}

/** DFS over the `requires` graph (edge: challenge → each prerequisite), reporting back-edges as cycles. */
function findRequiresCycles(challenges: readonly Challenge[], ids: ReadonlySet<string>): TechTreeIssue[] {
  const issues: TechTreeIssue[] = []
  const requiresOf = new Map(challenges.map((c) => [c.id, c.requires.filter((r) => ids.has(r))]))
  const WHITE = 0, GREY = 1, BLACK = 2
  const colour = new Map<string, number>()
  const reported = new Set<string>()

  const visit = (id: string, path: string[]): void => {
    colour.set(id, GREY)
    for (const prereq of requiresOf.get(id) ?? []) {
      const c = colour.get(prereq) ?? WHITE
      if (c === GREY) {
        // Back-edge: prereq is on the current stack → cycle.
        const start = path.indexOf(prereq)
        const cyclePath = [...path.slice(start), prereq]
        const key = [...cyclePath].sort().join(",")
        if (!reported.has(key)) {
          reported.add(key)
          issues.push({ kind: "cycle", challengeId: prereq, detail: `requires cycle: ${cyclePath.join(" → ")}` })
        }
      } else if (c === WHITE) {
        visit(prereq, [...path, prereq])
      }
    }
    colour.set(id, BLACK)
  }

  for (const c of challenges) {
    if ((colour.get(c.id) ?? WHITE) === WHITE) visit(c.id, [c.id])
  }

  return issues
}

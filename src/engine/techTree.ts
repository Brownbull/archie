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
  playerXp = 0,
): TechTreeResult {
  const completed = new Set(completedIds)

  const nodes = new Map<string, TechTreeNode>()
  const unlockedBlocks = new Set<string>(baseBlocks)

  for (const challenge of challenges) {
    const isDone = completed.has(challenge.id)
    const missingRequirements = isDone ? [] : challenge.requires.filter((r) => !completed.has(r))
    const meetsXpGate = isDone || (challenge.minXp ?? 0) <= playerXp
    const status: TechTreeStatus = isDone ? "completed" : (missingRequirements.length === 0 && meetsXpGate) ? "available" : "locked"

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
 * references, cycles in the `requires` graph (which would make a challenge unreachable), and — since
 * S5 closed every one (D89) — unlock-ordering REQUIRED-TYPE reachability (a required type no challenge
 * in the requires-closure grants). Pure + deterministic; returns an ordered list of issues (empty when
 * the tree is sound). The softer `ungrantable-available-block` palette check is NOT gated here — it
 * stays in `findUnlockOrderingIssues` as a tracked baseline (see that function).
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

  // S5 (D89): the unlock-ordering REQUIRED-TYPE check is now a HARD gate (all 21 violations fixed) —
  // a required type unreachable via the requires-closure fails here, so challengeLoader's `=== []`
  // assertion is the permanent regression net. Palette gaps stay soft (findUnlockOrderingIssues).
  issues.push(...findUnlockOrderingIssues(challenges).filter((i) => i.kind === "unreachable-required-type"))

  return issues
}

/**
 * S3 (D89): UNLOCK-ORDERING validation, separate from the structural `validateTechTree` (which stays
 * the load-bearing `=== []` CI gate). A challenge's required_types and available_blocks must each be
 * GRANTABLE — present in BASE_UNLOCKED_BLOCKS, granted by the challenge itself (teach-by-using), or
 * granted by some challenge in its transitive requires-closure. A block that is none of these is an
 * unlock-ordering violation: the progression demands/offers it before any path provides it (a free-build
 * dead-end after S2's filter, and a palette gap for user-cloned challenges under D45-AC2).
 *
 * Kept separate (not folded into validateTechTree) until the content batches S4/S5 drive the count to
 * zero — at which point the `=== []` assertion can migrate here as the permanent regression net.
 * Runs only on the SOUND subgraph (skips nodes implicated in a cycle or with unknown requires) so the
 * closure walk can't recurse forever or report noise atop a structural break already flagged elsewhere.
 */
export function findUnlockOrderingIssues(challenges: readonly Challenge[]): TechTreeIssue[] {
  const ids = new Set(challenges.map((c) => c.id))
  const tainted = new Set<string>()
  for (const i of findRequiresCycles(challenges, ids)) tainted.add(i.challengeId)
  for (const c of challenges) {
    if (c.requires.some((r) => !ids.has(r))) tainted.add(c.id)
  }
  return findUnreachableBlocks(challenges, ids, BASE_UNLOCKED_BLOCKS, tainted)
}

/**
 * For each challenge, the set of component-type blocks GRANTABLE by the time it is reached:
 * BASE_UNLOCKED_BLOCKS ∪ the challenge's own grants (teach-by-using) ∪ the grantable set of every
 * challenge in its transitive `requires` closure. Memoized DFS; an in-progress guard makes the walk
 * terminate on a `requires` cycle (those nodes are reported + skipped by the caller anyway).
 */
function grantableClosure(
  challenges: readonly Challenge[],
  ids: ReadonlySet<string>,
  baseBlocks: readonly string[],
): Map<string, Set<string>> {
  const byId = new Map(challenges.map((c) => [c.id, c]))
  const memo = new Map<string, Set<string>>()
  const inProgress = new Set<string>()

  const compute = (id: string): Set<string> => {
    const cached = memo.get(id)
    if (cached) return cached
    if (inProgress.has(id)) return new Set(baseBlocks) // cycle guard — don't recurse into a back-edge
    inProgress.add(id)
    const acc = new Set<string>(baseBlocks)
    const c = byId.get(id)
    if (c) {
      for (const g of c.grants) acc.add(g)
      for (const r of c.requires) {
        if (!ids.has(r)) continue // dangling requires — reported separately, treated as no grants
        for (const b of compute(r)) acc.add(b)
      }
    }
    inProgress.delete(id)
    memo.set(id, acc)
    return acc
  }

  for (const c of challenges) compute(c.id)
  return memo
}

/**
 * Emits an `unreachable-required-type` per required type, and an `ungrantable-available-block` per
 * palette block, that is not in the challenge's grantable closure. `skip` holds nodes already broken
 * by a cycle / unknown-requires (excluded so the report reflects only the sound subgraph). Block ids
 * are sorted for deterministic output.
 */
function findUnreachableBlocks(
  challenges: readonly Challenge[],
  ids: ReadonlySet<string>,
  baseBlocks: readonly string[],
  skip: ReadonlySet<string>,
): TechTreeIssue[] {
  const issues: TechTreeIssue[] = []
  const grantable = grantableClosure(challenges, ids, baseBlocks)
  for (const c of challenges) {
    if (skip.has(c.id)) continue
    const reachable = grantable.get(c.id) ?? new Set(baseBlocks)
    for (const t of [...c.requiredTypes].sort()) {
      if (!reachable.has(t)) {
        issues.push({ kind: "unreachable-required-type", challengeId: c.id, detail: `required type "${t}" is not grantable via the requires-closure` })
      }
    }
    // An empty palette means "full toolbox" (no restriction) — nothing to reach for.
    if (c.availableBlocks.length > 0) {
      for (const b of [...c.availableBlocks].sort()) {
        if (!reachable.has(b)) {
          issues.push({ kind: "ungrantable-available-block", challengeId: c.id, detail: `available block "${b}" is not grantable via the requires-closure` })
        }
      }
    }
  }
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

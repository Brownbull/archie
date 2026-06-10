import { describe, it, expect } from "vitest"
import { getAllChallenges } from "@/services/challengeLoader"
import { findUnlockOrderingIssues } from "@/engine/techTree"

/**
 * S3 (D89) unlock-ordering BASELINE — the worklist + drift net for content batches S4/S5.
 *
 * `findUnlockOrderingIssues` runs the closure-reachability check (BASE_UNLOCKED_BLOCKS ∪ self-grants ∪
 * prereq-closure grants) over the real 61 built-in challenges. It currently reports 21 hard
 * `unreachable-required-type` violations (the PLAN's "21 hard violations" headline) across 18
 * challenges, plus softer `ungrantable-available-block` palette violations. S4/S5 add prerequisite
 * edges (a granting challenge into each violator's requires-closure) to drive these toward [].
 *
 * This snapshot LOCKS the current violation set so a content edit that introduces a NEW violation fails
 * CI immediately. As S4/S5 fix violations the snapshot shrinks; when it reaches [], the assertion
 * migrates into `validateTechTree` + `challengeLoader.test` as the permanent, load-bearing gate.
 *
 * NOTE: the explicit counts below intentionally assert the CURRENT debt (the bug exists, by design,
 * pre-S4/S5). Update them downward as batches land — do NOT delete the test; it becomes the gate.
 */
describe("unlock-ordering baseline (S3 — pre-S4/S5 worklist)", () => {
  const issues = findUnlockOrderingIssues(getAllChallenges())
  const req = issues.filter((i) => i.kind === "unreachable-required-type")
  const pal = issues.filter((i) => i.kind === "ungrantable-available-block")

  it("locks the current unlock-ordering violations (worklist + drift net)", () => {
    const summary = issues
      .map(
        (i) =>
          `${i.challengeId} | ${i.kind === "unreachable-required-type" ? "REQ" : "PAL"} | ${i.detail.match(/"([^"]+)"/)?.[1]}`,
      )
      .sort()
    expect(summary).toMatchSnapshot()
  })

  // S4 batch A (edge/foundations capstones) landed: planet-scale/edge-cache-ratio/edge-economics/
  // edge-resilience/the-long-tail gained granting prereq edges (edge-delivery → cdn+dns; cache-the-hot-path
  // → cache), and thundering-herd cascaded (it requires edge-resilience). 21→13 REQ, 18→12 challenges.
  // S5 batch B drives the remaining 13 to 0, then folds the gate into validateTechTree.
  it("has 13 hard required-type violations across 12 challenges (post-S4-batch-A; S5 drives to 0)", () => {
    expect(req).toHaveLength(13)
    expect(new Set(req.map((i) => i.challengeId)).size).toBe(12)
  })

  it("also flags ungrantable palette blocks (softer; many resolve as a side effect of the REQ prereq edges)", () => {
    expect(pal.length).toBeGreaterThan(0)
  })
})

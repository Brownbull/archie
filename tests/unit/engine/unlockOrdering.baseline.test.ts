import { describe, it, expect } from "vitest"
import { getAllChallenges } from "@/services/challengeLoader"
import { findUnlockOrderingIssues, validateTechTree } from "@/engine/techTree"

/**
 * S5 (D89) unlock-ordering — REQUIRED-TYPE gate CLOSED, palette gaps tracked.
 *
 * `findUnlockOrderingIssues` runs the closure-reachability check (BASE_UNLOCKED_BLOCKS ∪ self-grants ∪
 * prereq-closure grants) over the 61 built-ins. As of S4 (batch A) + S5 (batch B), every one of the
 * 21 hard `unreachable-required-type` violations is fixed by added prerequisite edges — so the REQ
 * check is now folded into `validateTechTree` as a HARD gate (challengeLoader asserts `=== []`).
 *
 * The softer `ungrantable-available-block` palette gaps remain: a built-in palette may offer a block
 * its closure doesn't grant (teach-by-using — fine for built-in play since the palette isn't
 * intersected with the unlocked set; only user-CLONED challenges intersect, D45-AC2). They're tracked
 * here as a baseline snapshot, not gated. See DECISIONS for the palette-policy disposition.
 */
describe("unlock-ordering (S5 — REQ gate closed, palette gaps tracked)", () => {
  const challenges = getAllChallenges()
  const issues = findUnlockOrderingIssues(challenges)
  const req = issues.filter((i) => i.kind === "unreachable-required-type")
  const pal = issues.filter((i) => i.kind === "ungrantable-available-block")

  it("ZERO unreachable-required-type violations — every required type is reachable via its closure", () => {
    expect(req).toEqual([])
  })

  it("validateTechTree enforces the REQ gate (no required-type reachability issue leaks through)", () => {
    expect(validateTechTree(challenges).filter((i) => i.kind === "unreachable-required-type")).toEqual([])
  })

  it("tracks the remaining soft palette gaps (ungrantable-available-block) as a drift-net snapshot", () => {
    const summary = pal
      .map((i) => `${i.challengeId} | ${i.detail.match(/"([^"]+)"/)?.[1]}`)
      .sort()
    expect(summary).toMatchSnapshot()
  })
})

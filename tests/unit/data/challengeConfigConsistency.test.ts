import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync } from "fs"
import { join } from "path"
import { load } from "js-yaml"

/**
 * Challenge-config consistency guard (Phase 1, D88 follow-through).
 *
 * The polyglot-persistence regression (object-storage demanded by the brief, banned by
 * forbidden_types, yet offered in the palette) shipped because nothing cross-checks a challenge's
 * own fields against each other — the solvability harness routes around forbidden types and never
 * reads prose. These invariants make that class of contradiction unshippable:
 *
 *   1. forbidden_types ∩ available_blocks = ∅  — the palette must not offer a banned block
 *      (a player placing it gets a hard 0-star fail with no pre-run warning).
 *   2. forbidden_types ∩ required_types = ∅    — a challenge cannot demand what it bans.
 */

const CHALLENGES_DIR = join(__dirname, "../../../src/data/challenges")

interface ChallengeConfig {
  id?: string
  forbidden_types?: string[]
  required_types?: string[]
  available_blocks?: string[]
}

function loadAllChallenges(): Array<{ file: string; config: ChallengeConfig }> {
  return readdirSync(CHALLENGES_DIR)
    .filter((f) => f.endsWith(".yaml"))
    .map((file) => ({
      file,
      config: load(readFileSync(join(CHALLENGES_DIR, file), "utf-8")) as ChallengeConfig,
    }))
}

describe("challenge config consistency", () => {
  const challenges = loadAllChallenges()

  it("loads the full challenge set", () => {
    expect(challenges.length).toBeGreaterThanOrEqual(61)
  })

  it("no challenge offers a forbidden block in its palette (forbidden ∩ available_blocks = ∅)", () => {
    const violations = challenges.flatMap(({ file, config }) => {
      const forbidden = config.forbidden_types ?? []
      const available = config.available_blocks ?? []
      return forbidden
        .filter((t) => available.includes(t))
        .map((t) => `${file} (${config.id}): "${t}" is forbidden yet offered in available_blocks`)
    })
    expect(violations, violations.join("\n")).toEqual([])
  })

  it("no challenge requires a block it forbids (forbidden ∩ required_types = ∅)", () => {
    const violations = challenges.flatMap(({ file, config }) => {
      const forbidden = config.forbidden_types ?? []
      const required = config.required_types ?? []
      return forbidden
        .filter((t) => required.includes(t))
        .map((t) => `${file} (${config.id}): "${t}" is both forbidden and required`)
    })
    expect(violations, violations.join("\n")).toEqual([])
  })

  it("every required type the palette is expected to supply is actually in available_blocks", () => {
    // A required type missing from the palette makes the challenge unwinnable from the toolbox.
    const violations = challenges.flatMap(({ file, config }) => {
      const required = config.required_types ?? []
      const available = config.available_blocks ?? []
      if (available.length === 0) return [] // no palette restriction → full toolbox
      return required
        .filter((t) => !available.includes(t))
        .map((t) => `${file} (${config.id}): required type "${t}" is not in available_blocks`)
    })
    expect(violations, violations.join("\n")).toEqual([])
  })
})

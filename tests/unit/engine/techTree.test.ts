import { describe, it, expect } from "vitest"
import { resolveTechTree, validateTechTree, findUnlockOrderingIssues } from "@/engine/techTree"
import type { Challenge } from "@/lib/challengeTypes"

// Minimal Challenge factory — only the fields the tech-tree resolver/validator read matter here.
function ch(partial: Partial<Challenge> & Pick<Challenge, "id">): Challenge {
  return {
    title: partial.id,
    brief: "",
    difficulty: "beginner",
    budgetCap: 100,
    durationSeconds: 60,
    trafficCurve: [{ t: 0, rps: 0 }],
    requiredComponents: [],
    targetMetrics: { uptimePercent: 95, p99LatencyMs: 400 },
    scheduledEvents: [],
    hints: [],
    schemaVersion: 2,
    requires: [],
    unlocks: [],
    minXp: 0, requiredTypes: [], availableBlocks: [],
    grants: [],
    origin: "builtin",
    ...partial,
  }
}

// A small spine: foundations 1→2, data 1 off foundations 1.
const TREE: Challenge[] = [
  ch({ id: "first-service", track: "foundations", tier: 1, requires: [], unlocks: ["scale-out", "add-a-db"], grants: [] }),
  ch({ id: "scale-out", track: "foundations", tier: 2, requires: ["first-service"], unlocks: [], grants: ["load-balancer"] }),
  ch({ id: "add-a-db", track: "data", tier: 1, requires: ["first-service"], unlocks: ["cache"], grants: ["relational-db"] }),
  ch({ id: "cache", track: "data", tier: 2, requires: ["add-a-db"], unlocks: [], grants: ["cache"] }),
]

describe("resolveTechTree", () => {
  it("marks only zero-prerequisite challenges available when nothing is completed", () => {
    const { nodes } = resolveTechTree(TREE, [])
    expect(nodes.get("first-service")?.status).toBe("available")
    expect(nodes.get("scale-out")?.status).toBe("locked")
    expect(nodes.get("add-a-db")?.status).toBe("locked")
    expect(nodes.get("cache")?.status).toBe("locked")
  })

  it("opens direct children once a prerequisite is completed", () => {
    const { nodes } = resolveTechTree(TREE, ["first-service"])
    expect(nodes.get("first-service")?.status).toBe("completed")
    expect(nodes.get("scale-out")?.status).toBe("available")
    expect(nodes.get("add-a-db")?.status).toBe("available")
    // cache still needs add-a-db
    expect(nodes.get("cache")?.status).toBe("locked")
    expect(nodes.get("cache")?.missingRequirements).toEqual(["add-a-db"])
  })

  it("seeds unlockedBlocks with the base set and adds grants of completed challenges only", () => {
    const empty = resolveTechTree(TREE, [])
    expect([...empty.unlockedBlocks].sort()).toEqual(["compute", "traffic-source"])

    const some = resolveTechTree(TREE, ["first-service", "scale-out", "add-a-db"])
    expect(some.unlockedBlocks.has("load-balancer")).toBe(true) // scale-out grant
    expect(some.unlockedBlocks.has("relational-db")).toBe(true) // add-a-db grant
    expect(some.unlockedBlocks.has("cache")).toBe(false) // cache not completed → not granted
  })

  it("honours a custom base-block set", () => {
    const { unlockedBlocks } = resolveTechTree(TREE, [], [])
    expect(unlockedBlocks.size).toBe(0)
  })

  it("orders deterministically by track, then tier, then id", () => {
    const { ordered } = resolveTechTree(TREE, [])
    expect(ordered.map((n) => n.challenge.id)).toEqual(["first-service", "scale-out", "add-a-db", "cache"])
  })

  it("ignores completed ids that are not in the challenge set", () => {
    const { nodes, unlockedBlocks } = resolveTechTree(TREE, ["ghost"])
    expect(nodes.has("ghost")).toBe(false)
    expect([...unlockedBlocks].sort()).toEqual(["compute", "traffic-source"])
  })
})

describe("validateTechTree", () => {
  it("returns no issues for a sound DAG", () => {
    expect(validateTechTree(TREE)).toEqual([])
  })

  it("flags duplicate ids", () => {
    const issues = validateTechTree([...TREE, ch({ id: "first-service" })])
    expect(issues.some((i) => i.kind === "duplicate-id" && i.challengeId === "first-service")).toBe(true)
  })

  it("flags dangling requires and unlocks references", () => {
    const issues = validateTechTree([
      ch({ id: "a", requires: ["ghost-req"], unlocks: ["ghost-unlock"] }),
    ])
    expect(issues.some((i) => i.kind === "unknown-requires" && i.detail.includes("ghost-req"))).toBe(true)
    expect(issues.some((i) => i.kind === "unknown-unlocks" && i.detail.includes("ghost-unlock"))).toBe(true)
  })

  it("detects a requires cycle", () => {
    const cyclic = [
      ch({ id: "a", requires: ["b"] }),
      ch({ id: "b", requires: ["a"] }),
    ]
    const issues = validateTechTree(cyclic)
    expect(issues.some((i) => i.kind === "cycle")).toBe(true)
  })
})

describe("findUnlockOrderingIssues (S3 / D89 — closure reachability)", () => {
  it("returns [] when every required type / palette block is base, self-granted, or prereq-granted", () => {
    const tree = [
      ch({ id: "root", grants: ["cache"], requiredTypes: ["compute"], availableBlocks: ["traffic-source", "compute"] }),
      ch({ id: "child", requires: ["root"], requiredTypes: ["cache"], availableBlocks: ["cache", "compute"] }),
    ]
    expect(findUnlockOrderingIssues(tree)).toEqual([])
  })

  it("a required type granted by a prerequisite is reachable", () => {
    const tree = [
      ch({ id: "root", grants: ["relational-db"] }),
      ch({ id: "child", requires: ["root"], requiredTypes: ["relational-db"] }),
    ]
    expect(findUnlockOrderingIssues(tree)).toEqual([])
  })

  it("a self-granted required type (teach-by-using) is reachable — NOT flagged", () => {
    const tree = [ch({ id: "solo", grants: ["message-queue"], requiredTypes: ["message-queue"], availableBlocks: ["compute", "message-queue"] })]
    expect(findUnlockOrderingIssues(tree)).toEqual([])
  })

  it("flags a required type that no challenge in the closure grants", () => {
    const tree = [
      ch({ id: "root", grants: [] }),
      ch({ id: "child", requires: ["root"], requiredTypes: ["cdn"] }),
    ]
    const issues = findUnlockOrderingIssues(tree)
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ kind: "unreachable-required-type", challengeId: "child" })
    expect(issues[0].detail).toContain("cdn")
  })

  it("base blocks (compute / traffic-source) are always grantable", () => {
    const tree = [ch({ id: "solo", requiredTypes: ["compute", "traffic-source"], availableBlocks: ["compute", "traffic-source"] })]
    expect(findUnlockOrderingIssues(tree)).toEqual([])
  })

  it("flags an available block not grantable via the closure (palette offers a never-granted block)", () => {
    const tree = [ch({ id: "solo", availableBlocks: ["compute", "nosql"] })]
    const issues = findUnlockOrderingIssues(tree)
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ kind: "ungrantable-available-block", challengeId: "solo" })
    expect(issues[0].detail).toContain("nosql")
  })

  it("an empty available_blocks means full toolbox — no palette check", () => {
    const tree = [ch({ id: "solo", availableBlocks: [], requiredTypes: ["compute"] })]
    expect(findUnlockOrderingIssues(tree)).toEqual([])
  })

  it("terminates on a requires cycle and skips the cycle-reported node (no closure noise atop a structural break)", () => {
    const tree = [
      ch({ id: "a", requires: ["b"], requiredTypes: ["cdn"] }),
      ch({ id: "b", requires: ["a"], requiredTypes: [] }),
    ]
    const issues = findUnlockOrderingIssues(tree)
    expect(issues.filter((i) => i.challengeId === "a")).toEqual([]) // "a" is the cycle-reported node → skipped
  })

  it("skips a node whose requires reference an unknown challenge", () => {
    const tree = [ch({ id: "orphan", requires: ["does-not-exist"], requiredTypes: ["cdn"] })]
    expect(findUnlockOrderingIssues(tree)).toEqual([])
  })

  it("sorts emitted block ids deterministically within a challenge", () => {
    const tree = [ch({ id: "solo", requiredTypes: ["zeta", "alpha"] })]
    const reqs = findUnlockOrderingIssues(tree).filter((i) => i.kind === "unreachable-required-type")
    expect(reqs.map((i) => i.detail.match(/"([^"]+)"/)?.[1])).toEqual(["alpha", "zeta"])
  })
})

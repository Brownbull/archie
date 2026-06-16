import { describe, it, expect } from "vitest"
import {
  diffTrafficAttributes,
  detectSingleAttributeBreak,
  isNewBreak,
  remainingBreakAttributes,
  alternativeMethodIds,
  isDialFullyKnown,
  type TrafficNodeLike,
} from "@/engine/breakDetection"
import type { ChallengeTrafficSource } from "@/lib/challengeTypes"

const spec = (over: Partial<ChallengeTrafficSource> = {}): ChallengeTrafficSource => ({
  type: "web-users", rps: 1000, kind: "steady", workload: "mixed", origin: "one-region", ...over,
})
const node = (over: Partial<TrafficNodeLike["data"]> = {}): TrafficNodeLike => ({
  data: { componentCategory: "traffic", trafficRps: 1000, trafficKind: "steady", trafficWorkload: "mixed", trafficOrigin: "one-region", ...over },
})
const FAILED = { passedMetrics: false }
const PASSED = { passedMetrics: true }

describe("diffTrafficAttributes (P4-S1 / D94)", () => {
  it("reports no changes when live nodes match the authored spec", () => {
    expect(diffTrafficAttributes([node()], [spec()]).size).toBe(0)
  })

  it("reports exactly the changed attribute", () => {
    expect([...diffTrafficAttributes([node({ trafficRps: 5000 })], [spec()])]).toEqual(["rps"])
    expect([...diffTrafficAttributes([node({ trafficOrigin: "multi-region" })], [spec()])]).toEqual(["origin"])
  })

  it("multi-source: swapping which node carries which value is NOT a change (multiset compare)", () => {
    const authored = [spec({ rps: 1000 }), spec({ type: "api-client", rps: 2000 })]
    const live = [node({ trafficRps: 2000 }), node({ trafficRps: 1000 })]
    expect(diffTrafficAttributes(live, authored).size).toBe(0)
  })

  it("multi-source: one value changed on one source reports that attribute", () => {
    const authored = [spec({ rps: 1000 }), spec({ rps: 2000 })]
    const live = [node({ trafficRps: 1000 }), node({ trafficRps: 9000 })]
    expect([...diffTrafficAttributes(live, authored)]).toEqual(["rps"])
  })

  it("adding/removing a traffic node marks ALL attributes changed (structural edit, never a clean break)", () => {
    expect(diffTrafficAttributes([node(), node()], [spec()]).size).toBe(4)
    expect(diffTrafficAttributes([], [spec()]).size).toBe(4)
  })

  it("ignores non-traffic nodes", () => {
    const compute: TrafficNodeLike = { data: { componentCategory: "compute" } }
    expect(diffTrafficAttributes([node(), compute], [spec()]).size).toBe(0)
  })
})

describe("detectSingleAttributeBreak", () => {
  const challenge = { trafficSources: [spec()] }

  it("detects a break when ONE attribute changed and the run failed", () => {
    expect(detectSingleAttributeBreak([node({ trafficRps: 9000 })], challenge, FAILED)).toBe("rps")
    expect(detectSingleAttributeBreak([node({ trafficWorkload: "write" })], challenge, FAILED)).toBe("workload")
  })

  it("no break when the build HELD (metrics passed)", () => {
    expect(detectSingleAttributeBreak([node({ trafficRps: 9000 })], challenge, PASSED)).toBeNull()
  })

  it("no break when nothing changed (the authored demand failing would be a tuning bug, not a break)", () => {
    expect(detectSingleAttributeBreak([node()], challenge, FAILED)).toBeNull()
  })

  it("no break when TWO attributes changed — one at a time is the rule", () => {
    expect(detectSingleAttributeBreak([node({ trafficRps: 9000, trafficKind: "periodic" })], challenge, FAILED)).toBeNull()
  })

  it("no break on legacy curve-only challenges (no authored sources to diff)", () => {
    expect(detectSingleAttributeBreak([node({ trafficRps: 9000 })], { trafficSources: undefined }, FAILED)).toBeNull()
  })
})

describe("break collection bookkeeping", () => {
  it("isNewBreak: true until collected", () => {
    expect(isNewBreak(undefined, "rps")).toBe(true)
    expect(isNewBreak({ rps: true }, "rps")).toBe(false)
    expect(isNewBreak({ rps: true }, "kind")).toBe(true)
  })

  it("remainingBreakAttributes lists uncollected attributes in display order", () => {
    expect(remainingBreakAttributes(undefined)).toEqual(["rps", "kind", "workload", "origin"])
    expect(remainingBreakAttributes({ rps: true, workload: true })).toEqual(["kind", "origin"])
    expect(remainingBreakAttributes({ rps: true, kind: true, workload: true, origin: true })).toEqual([])
  })
})

describe("alternativeMethodIds", () => {
  const authored = { kind: "realistic", workload: "read", origin: "one-region" }

  it("rps always returns rps-overload", () => {
    expect(alternativeMethodIds("rps", authored)).toEqual(["rps-overload"])
  })

  it("kind returns all shapes except the authored one", () => {
    const ids = alternativeMethodIds("kind", authored)
    expect(ids).toEqual(["shape-steady", "shape-periodic", "shape-search"])
    expect(ids).not.toContain("shape-realistic")
  })

  it("workload returns all workloads except the authored one", () => {
    const ids = alternativeMethodIds("workload", authored)
    expect(ids).toEqual(["workload-write", "workload-mixed"])
    expect(ids).not.toContain("workload-read")
  })

  it("origin returns origin-multi-region when authored is one-region", () => {
    expect(alternativeMethodIds("origin", authored)).toEqual(["origin-multi-region"])
  })

  it("origin returns empty when authored is multi-region", () => {
    expect(alternativeMethodIds("origin", { ...authored, origin: "multi-region" })).toEqual([])
  })
})

describe("isDialFullyKnown", () => {
  const authored = { kind: "realistic", workload: "read", origin: "one-region" }

  it("returns false when no methods are known", () => {
    expect(isDialFullyKnown("rps", authored, {})).toBe(false)
  })

  it("returns true for rps when rps-overload is known", () => {
    expect(isDialFullyKnown("rps", authored, { "rps-overload": {} })).toBe(true)
  })

  it("returns false for kind when only some alternatives are known", () => {
    expect(isDialFullyKnown("kind", authored, { "shape-steady": {} })).toBe(false)
  })

  it("returns true for kind when all alternatives are known", () => {
    const methods = { "shape-steady": {}, "shape-periodic": {}, "shape-search": {} }
    expect(isDialFullyKnown("kind", authored, methods)).toBe(true)
  })

  it("returns true for workload when both alternatives are known", () => {
    const methods = { "workload-write": {}, "workload-mixed": {} }
    expect(isDialFullyKnown("workload", authored, methods)).toBe(true)
  })

  it("returns true for origin when origin-multi-region is known", () => {
    expect(isDialFullyKnown("origin", authored, { "origin-multi-region": {} })).toBe(true)
  })

  it("returns false for origin when authored is multi-region (no alternatives)", () => {
    expect(isDialFullyKnown("origin", { ...authored, origin: "multi-region" }, { "origin-multi-region": {} })).toBe(false)
  })
})

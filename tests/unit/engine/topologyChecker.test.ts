import { describe, it, expect } from "vitest"
import {
  detectOrphans,
  detectUnreachable,
  detectMissingHops,
  detectTopologyIssues,
} from "@/engine/topologyChecker"

const node = (id: string) => ({ id })
const edge = (source: string, target: string) => ({ source, target })

describe("detectOrphans", () => {
  it("returns empty for empty graph", () => {
    expect(detectOrphans([], [])).toEqual([])
  })

  it("flags a single node with no edges as orphan", () => {
    const issues = detectOrphans([node("a")], [])
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ nodeId: "a", issueType: "orphan", severity: "warning" })
  })

  it("flags only unconnected nodes when some have edges", () => {
    const nodes = [node("a"), node("b"), node("c")]
    const edges = [edge("a", "b")]
    const issues = detectOrphans(nodes, edges)
    expect(issues).toHaveLength(1)
    expect(issues[0].nodeId).toBe("c")
  })

  it("returns empty when all nodes are connected", () => {
    const nodes = [node("a"), node("b")]
    const edges = [edge("a", "b")]
    expect(detectOrphans(nodes, edges)).toEqual([])
  })

  it("detects multiple orphans", () => {
    const nodes = [node("a"), node("b"), node("c"), node("d")]
    const edges = [edge("a", "b")]
    const issues = detectOrphans(nodes, edges)
    expect(issues).toHaveLength(2)
    expect(issues.map((i) => i.nodeId).sort()).toEqual(["c", "d"])
  })
})

describe("detectUnreachable", () => {
  it("returns empty for single node", () => {
    expect(detectUnreachable([node("a")], [])).toEqual([])
  })

  it("returns empty for no edges", () => {
    expect(detectUnreachable([node("a"), node("b")], [])).toEqual([])
  })

  it("returns empty when all connected nodes form one component", () => {
    const nodes = [node("a"), node("b"), node("c")]
    const edges = [edge("a", "b"), edge("b", "c")]
    expect(detectUnreachable(nodes, edges)).toEqual([])
  })

  it("flags nodes in smaller disconnected subgraph", () => {
    const nodes = [node("a"), node("b"), node("c"), node("d"), node("e")]
    const edges = [edge("a", "b"), edge("b", "c"), edge("d", "e")]
    const issues = detectUnreachable(nodes, edges)
    expect(issues).toHaveLength(2)
    const ids = issues.map((i) => i.nodeId).sort()
    expect(ids).toEqual(["d", "e"])
    expect(issues[0].issueType).toBe("unreachable")
  })

  it("does not flag orphan nodes (no edges at all) — orphan detector handles those", () => {
    const nodes = [node("a"), node("b"), node("c"), node("orphan")]
    const edges = [edge("a", "b"), edge("b", "c")]
    const issues = detectUnreachable(nodes, edges)
    expect(issues.every((i) => i.nodeId !== "orphan")).toBe(true)
  })

  it("flags two equal-size subgraphs — smaller index becomes main by first-encounter", () => {
    const nodes = [node("a"), node("b"), node("c"), node("d")]
    const edges = [edge("a", "b"), edge("c", "d")]
    const issues = detectUnreachable(nodes, edges)
    expect(issues).toHaveLength(2)
    expect(issues.map((i) => i.nodeId).sort()).toEqual(["c", "d"])
  })
})

describe("detectMissingHops", () => {
  it("returns empty for small graphs", () => {
    expect(detectMissingHops([node("a"), node("b")], [edge("a", "b")])).toEqual([])
  })

  it("returns empty for fully connected triangle", () => {
    const nodes = [node("a"), node("b"), node("c")]
    const edges = [edge("a", "b"), edge("b", "c"), edge("a", "c")]
    expect(detectMissingHops(nodes, edges)).toEqual([])
  })

  it("detects bridge node in linear chain A-B-C", () => {
    const nodes = [node("a"), node("b"), node("c")]
    const edges = [edge("a", "b"), edge("b", "c")]
    const issues = detectMissingHops(nodes, edges)
    expect(issues.length).toBeGreaterThanOrEqual(1)
    expect(issues.some((i) => i.issueType === "missing-hop")).toBe(true)
    expect(issues[0].description).toContain("b")
  })

  it("detects bridge in star topology A-center-B, A-center-C", () => {
    const nodes = [node("center"), node("a"), node("b"), node("c")]
    const edges = [edge("center", "a"), edge("center", "b"), edge("center", "c")]
    const issues = detectMissingHops(nodes, edges)
    expect(issues.length).toBeGreaterThanOrEqual(1)
    expect(issues.every((i) => i.issueType === "missing-hop")).toBe(true)
  })

  it("returns empty for graph with no single point of failure", () => {
    // Square: a-b, b-c, c-d, d-a — no bridge
    const nodes = [node("a"), node("b"), node("c"), node("d")]
    const edges = [edge("a", "b"), edge("b", "c"), edge("c", "d"), edge("d", "a")]
    expect(detectMissingHops(nodes, edges)).toEqual([])
  })

  it("description references the bridge node", () => {
    const nodes = [node("lb"), node("api"), node("db")]
    const edges = [edge("lb", "api"), edge("api", "db")]
    const issues = detectMissingHops(nodes, edges)
    const apiIssue = issues.find((i) => i.description.includes("api"))
    expect(apiIssue).toBeDefined()
  })
})

describe("detectTopologyIssues (combined)", () => {
  it("returns empty for empty graph", () => {
    expect(detectTopologyIssues([], [])).toEqual([])
  })

  it("returns empty for well-connected triangle", () => {
    const nodes = [node("a"), node("b"), node("c")]
    const edges = [edge("a", "b"), edge("b", "c"), edge("a", "c")]
    expect(detectTopologyIssues(nodes, edges)).toEqual([])
  })

  it("detects orphan + unreachable in same graph", () => {
    const nodes = [node("a"), node("b"), node("c"), node("d"), node("orphan")]
    const edges = [edge("a", "b"), edge("c", "d")]
    const issues = detectTopologyIssues(nodes, edges)
    expect(issues.some((i) => i.issueType === "orphan")).toBe(true)
    expect(issues.some((i) => i.issueType === "unreachable")).toBe(true)
  })

  it("detects all three issue types in a complex graph", () => {
    // Main cluster: a-b-c (chain), orphan: d, separate pair: e-f
    const nodes = [node("a"), node("b"), node("c"), node("d"), node("e"), node("f")]
    const edges = [edge("a", "b"), edge("b", "c"), edge("e", "f")]
    const issues = detectTopologyIssues(nodes, edges)
    const types = new Set(issues.map((i) => i.issueType))
    expect(types.has("orphan")).toBe(true)
    expect(types.has("unreachable")).toBe(true)
    expect(types.has("missing-hop")).toBe(true)
  })

  it("pure function — no side effects on input arrays", () => {
    const nodes = [node("a"), node("b"), node("c")]
    const edges = [edge("a", "b")]
    const nodesCopy = [...nodes]
    const edgesCopy = [...edges]
    detectTopologyIssues(nodes, edges)
    expect(nodes).toEqual(nodesCopy)
    expect(edges).toEqual(edgesCopy)
  })
})

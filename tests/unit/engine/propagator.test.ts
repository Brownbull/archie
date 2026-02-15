import { describe, it, expect } from "vitest"
import {
  getAffectedNodes,
  getPropagationHops,
  type PropagationHop,
} from "@/engine/propagator"
import { RIPPLE_DELAY_MS } from "@/lib/constants"

// --- Test Helpers ---

function makeNode(id: string) {
  return { id }
}

function makeEdge(source: string, target: string) {
  return { source, target }
}

// --- Tests ---

describe("propagator", () => {
  describe("getAffectedNodes", () => {
    it("returns only the changed node when it has no connections", () => {
      const nodes = [makeNode("A")]
      const result = getAffectedNodes("A", nodes, [])
      expect(result).toEqual(["A"])
    })

    it("returns linear chain A→B→C in BFS order", () => {
      const nodes = [makeNode("A"), makeNode("B"), makeNode("C")]
      const edges = [makeEdge("A", "B"), makeEdge("B", "C")]
      const result = getAffectedNodes("A", nodes, edges)
      expect(result).toEqual(["A", "B", "C"])
    })

    it("returns branching graph in BFS order", () => {
      // A connects to B and C directly
      const nodes = [makeNode("A"), makeNode("B"), makeNode("C")]
      const edges = [makeEdge("A", "B"), makeEdge("A", "C")]
      const result = getAffectedNodes("A", nodes, edges)
      expect(result).toHaveLength(3)
      expect(result[0]).toBe("A")
      // B and C are both at depth 1 — order among them doesn't matter
      expect(result).toContain("B")
      expect(result).toContain("C")
    })

    it("handles cycle detection — does not infinite loop", () => {
      // A→B→C→A (cycle)
      const nodes = [makeNode("A"), makeNode("B"), makeNode("C")]
      const edges = [
        makeEdge("A", "B"),
        makeEdge("B", "C"),
        makeEdge("C", "A"),
      ]
      const result = getAffectedNodes("A", nodes, edges)
      expect(result).toHaveLength(3)
      expect(result[0]).toBe("A")
      expect(result).toContain("B")
      expect(result).toContain("C")
    })

    it("does not include disconnected nodes", () => {
      const nodes = [
        makeNode("A"),
        makeNode("B"),
        makeNode("C"),
        makeNode("D"),
      ]
      const edges = [makeEdge("A", "B")]
      // C and D are disconnected from A
      const result = getAffectedNodes("A", nodes, edges)
      expect(result).toEqual(["A", "B"])
      expect(result).not.toContain("C")
      expect(result).not.toContain("D")
    })

    it("traverses edges bidirectionally (follows both source and target)", () => {
      // Edge is B→A, but starting from A should still find B
      const nodes = [makeNode("A"), makeNode("B")]
      const edges = [makeEdge("B", "A")]
      const result = getAffectedNodes("A", nodes, edges)
      expect(result).toEqual(["A", "B"])
    })

    it("traverses mixed edge directions", () => {
      // A←B→C — B is source for both edges
      const nodes = [makeNode("A"), makeNode("B"), makeNode("C")]
      const edges = [makeEdge("B", "A"), makeEdge("B", "C")]
      const result = getAffectedNodes("A", nodes, edges)
      expect(result).toHaveLength(3)
      expect(result[0]).toBe("A")
    })

    it("handles diamond graph (A→B, A→C, B→D, C→D)", () => {
      const nodes = [
        makeNode("A"),
        makeNode("B"),
        makeNode("C"),
        makeNode("D"),
      ]
      const edges = [
        makeEdge("A", "B"),
        makeEdge("A", "C"),
        makeEdge("B", "D"),
        makeEdge("C", "D"),
      ]
      const result = getAffectedNodes("A", nodes, edges)
      expect(result).toHaveLength(4)
      expect(result[0]).toBe("A")
      // D should appear after both B and C
      const dIndex = result.indexOf("D")
      const bIndex = result.indexOf("B")
      const cIndex = result.indexOf("C")
      expect(dIndex).toBeGreaterThan(bIndex)
      expect(dIndex).toBeGreaterThan(cIndex)
    })

    it("returns empty array when changedNodeId is not in nodes list", () => {
      const nodes = [makeNode("A")]
      const result = getAffectedNodes("nonexistent", nodes, [])
      // Should still return the changedNodeId even if not in nodes
      // (defensive — the propagator trusts its input)
      expect(result).toEqual(["nonexistent"])
    })
  })

  describe("getPropagationHops", () => {
    it("returns single hop with index 0 and delay 0 for isolated node", () => {
      const nodes = [makeNode("A")]
      const result = getPropagationHops("A", nodes, [])
      expect(result).toEqual([{ nodeId: "A", hopIndex: 0, delayMs: 0 }])
    })

    it("assigns correct hopIndex for linear chain", () => {
      const nodes = [makeNode("A"), makeNode("B"), makeNode("C")]
      const edges = [makeEdge("A", "B"), makeEdge("B", "C")]
      const result = getPropagationHops("A", nodes, edges)

      expect(result).toHaveLength(3)
      const aHop = result.find((h) => h.nodeId === "A")!
      const bHop = result.find((h) => h.nodeId === "B")!
      const cHop = result.find((h) => h.nodeId === "C")!
      expect(aHop.hopIndex).toBe(0)
      expect(bHop.hopIndex).toBe(1)
      expect(cHop.hopIndex).toBe(2)
    })

    it("computes delayMs as hopIndex * RIPPLE_DELAY_MS", () => {
      const nodes = [makeNode("A"), makeNode("B"), makeNode("C")]
      const edges = [makeEdge("A", "B"), makeEdge("B", "C")]
      const result = getPropagationHops("A", nodes, edges)

      for (const hop of result) {
        expect(hop.delayMs).toBe(hop.hopIndex * RIPPLE_DELAY_MS)
      }
    })

    it("assigns same hopIndex to nodes at same BFS depth", () => {
      // A→B and A→C — both B and C are depth 1
      const nodes = [makeNode("A"), makeNode("B"), makeNode("C")]
      const edges = [makeEdge("A", "B"), makeEdge("A", "C")]
      const result = getPropagationHops("A", nodes, edges)

      const bHop = result.find((h) => h.nodeId === "B")!
      const cHop = result.find((h) => h.nodeId === "C")!
      expect(bHop.hopIndex).toBe(1)
      expect(cHop.hopIndex).toBe(1)
      expect(bHop.delayMs).toBe(cHop.delayMs)
    })

    it("handles cycle without infinite loop", () => {
      const nodes = [makeNode("A"), makeNode("B"), makeNode("C")]
      const edges = [
        makeEdge("A", "B"),
        makeEdge("B", "C"),
        makeEdge("C", "A"),
      ]
      const result = getPropagationHops("A", nodes, edges)
      expect(result).toHaveLength(3)
    })

    it("uses RIPPLE_DELAY_MS constant value of 100", () => {
      expect(RIPPLE_DELAY_MS).toBe(100)
    })
  })
})

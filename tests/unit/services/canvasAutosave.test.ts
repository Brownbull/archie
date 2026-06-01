import { describe, it, expect, beforeEach } from "vitest"
import {
  AUTOSAVE_KEY,
  readSavedCanvas,
  writeSavedCanvas,
  clearSavedCanvas,
} from "@/services/canvasAutosave"
import type { ArchieNode, ArchieEdge } from "@/stores/architectureStore"

const node = (id: string): ArchieNode => ({
  id,
  type: "archie-component",
  position: { x: 10, y: 20 },
  data: {
    archieComponentId: "postgresql",
    activeConfigVariantId: "default",
    componentName: "PostgreSQL",
    componentCategory: "data-storage",
    replicaCount: 1,
  },
})

const edge = (id: string): ArchieEdge => ({
  id,
  source: "a",
  target: "b",
  data: {
    isIncompatible: false,
    isPortMismatch: false,
    incompatibilityReason: null,
    sourceArchieComponentId: "a",
    targetArchieComponentId: "b",
    sourceHandleId: null,
    targetHandleId: null,
  },
})

describe("canvasAutosave", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("round-trips a saved canvas snapshot", () => {
    writeSavedCanvas({
      nodes: [node("n1")],
      edges: [edge("e1")],
      weightProfile: { performance: 1, reliability: 1, scalability: 1, "operational-complexity": 1, "cost-efficiency": 1, security: 1, "developer-experience": 1 } as never,
      activeScenarioId: "black-friday",
      activeFailureScenarioId: null,
    })
    const restored = readSavedCanvas()
    expect(restored).not.toBeNull()
    expect(restored!.nodes).toHaveLength(1)
    expect(restored!.nodes[0].id).toBe("n1")
    expect(restored!.nodes[0].position).toEqual({ x: 10, y: 20 })
    expect(restored!.edges[0].id).toBe("e1")
    expect(restored!.activeScenarioId).toBe("black-friday")
  })

  it("returns null when nothing is saved", () => {
    expect(readSavedCanvas()).toBeNull()
  })

  it("returns null for corrupt JSON (never crashes startup)", () => {
    localStorage.setItem(AUTOSAVE_KEY, "{not valid json")
    expect(readSavedCanvas()).toBeNull()
  })

  it("returns null when the structure is invalid (missing arrays)", () => {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ v: 1, nodes: "nope" }))
    expect(readSavedCanvas()).toBeNull()
  })

  it("returns null on a version mismatch (no stale-schema restore)", () => {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ v: 99, nodes: [], edges: [] }))
    expect(readSavedCanvas()).toBeNull()
  })

  it("clearSavedCanvas removes the snapshot", () => {
    writeSavedCanvas({ nodes: [node("n1")], edges: [], weightProfile: {} as never, activeScenarioId: null, activeFailureScenarioId: null })
    expect(readSavedCanvas()).not.toBeNull()
    clearSavedCanvas()
    expect(readSavedCanvas()).toBeNull()
  })
})

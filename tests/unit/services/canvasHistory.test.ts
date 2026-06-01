import { describe, it, expect, beforeEach } from "vitest"
import { useArchitectureStore, type ArchieNode } from "@/stores/architectureStore"
import {
  resetHistory,
  recordIfChanged,
  undo,
  redo,
  useHistoryStore,
} from "@/services/canvasHistory"

const node = (id: string): ArchieNode => ({
  id,
  type: "archie-component",
  position: { x: 0, y: 0 },
  data: {
    archieComponentId: "postgresql",
    activeConfigVariantId: "default",
    componentName: "PostgreSQL",
    componentCategory: "data-storage",
    replicaCount: 1,
  },
})

describe("canvasHistory", () => {
  beforeEach(() => {
    const s = useArchitectureStore.getState()
    s.setNodes([])
    s.setEdges([])
    resetHistory()
  })

  it("starts with nothing to undo or redo", () => {
    expect(useHistoryStore.getState().canUndo).toBe(false)
    expect(useHistoryStore.getState().canRedo).toBe(false)
  })

  it("records a graph change and can undo it", () => {
    useArchitectureStore.getState().setNodes([node("a")])
    recordIfChanged()
    expect(useHistoryStore.getState().canUndo).toBe(true)

    undo()
    expect(useArchitectureStore.getState().nodes).toHaveLength(0)
    expect(useHistoryStore.getState().canUndo).toBe(false)
    expect(useHistoryStore.getState().canRedo).toBe(true)
  })

  it("redo re-applies the undone change", () => {
    useArchitectureStore.getState().setNodes([node("a")])
    recordIfChanged()
    undo()
    redo()
    expect(useArchitectureStore.getState().nodes.map((n) => n.id)).toEqual(["a"])
    expect(useHistoryStore.getState().canRedo).toBe(false)
  })

  it("ignores no-op recordings (ref-equal graph)", () => {
    recordIfChanged()
    expect(useHistoryStore.getState().canUndo).toBe(false)
  })

  it("a new change after undo clears the redo stack", () => {
    useArchitectureStore.getState().setNodes([node("a")])
    recordIfChanged()
    undo()
    expect(useHistoryStore.getState().canRedo).toBe(true)
    useArchitectureStore.getState().setNodes([node("b")])
    recordIfChanged()
    expect(useHistoryStore.getState().canRedo).toBe(false)
  })
})

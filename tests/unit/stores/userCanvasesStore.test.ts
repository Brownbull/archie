import { describe, it, expect, beforeEach, vi } from "vitest"

vi.mock("@/lib/writeThrottle", () => ({ canWrite: () => true }))
vi.mock("@/lib/firebase", () => ({ db: {} }))
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => "server-ts"),
}))

import { getDoc, setDoc } from "firebase/firestore"
import { useUserCanvasesStore } from "@/stores/userCanvasesStore"
import type { SavedCanvas } from "@/services/canvasAutosave"

const getDocMock = vi.mocked(getDoc)
const setDocMock = vi.mocked(setDoc)

const sampleCanvas: SavedCanvas = {
  v: 1,
  nodes: [{ id: "n1", type: "archie-component", position: { x: 0, y: 0 }, data: { archieComponentId: "redis", activeConfigVariantId: "standalone", componentName: "Redis", componentCategory: "caching", replicaCount: 1 } }] as never,
  edges: [],
  activeScenarioId: null,
  activeFailureScenarioId: null,
}

describe("useUserCanvasesStore", () => {
  beforeEach(() => {
    useUserCanvasesStore.getState().reset()
    getDocMock.mockReset()
    setDocMock.mockReset()
    setDocMock.mockResolvedValue(undefined as never)
  })

  it("starts with two empty slots", () => {
    expect(useUserCanvasesStore.getState().getSlots()).toEqual([null, null])
  })

  it("saveToSlot stores into the chosen slot (optimistic) and persists", async () => {
    const ok = await useUserCanvasesStore.getState().saveToSlot("u1", 0, "My API", sampleCanvas)
    expect(ok).toBe(true)
    const slots = useUserCanvasesStore.getState().getSlots()
    expect(slots[0]?.name).toBe("My API")
    expect(slots[0]?.canvas.nodes).toHaveLength(1)
    expect(typeof slots[0]?.savedAt).toBe("number")
    expect(slots[1]).toBeNull()
    expect(setDocMock).toHaveBeenCalledTimes(1)
    const [, payload, options] = setDocMock.mock.calls[0]
    expect((payload as { slots: unknown[] }).slots).toHaveLength(2)
    expect(options).toEqual({ merge: true })
  })

  it("falls back to a default name when blank", async () => {
    await useUserCanvasesStore.getState().saveToSlot("u1", 1, "   ", sampleCanvas)
    expect(useUserCanvasesStore.getState().getSlots()[1]?.name).toBe("Canvas 2")
  })

  it("rejects a save with no userId or out-of-range slot", async () => {
    expect(await useUserCanvasesStore.getState().saveToSlot("", 0, "x", sampleCanvas)).toBe(false)
    expect(await useUserCanvasesStore.getState().saveToSlot("u1", 2, "x", sampleCanvas)).toBe(false)
    expect(setDocMock).not.toHaveBeenCalled()
  })

  it("rejects an oversized canvas without persisting", async () => {
    const huge: SavedCanvas = { ...sampleCanvas, nodes: [{ id: "big", data: { blob: "a".repeat(750_000) } }] as never }
    const ok = await useUserCanvasesStore.getState().saveToSlot("u1", 0, "huge", huge)
    expect(ok).toBe(false)
    expect(setDocMock).not.toHaveBeenCalled()
    expect(useUserCanvasesStore.getState().error).toMatch(/too large/i)
  })

  it("loadCanvases normalizes a persisted doc to exactly 2 slots", async () => {
    getDocMock.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ slots: [{ name: "A", savedAt: 1, canvas: sampleCanvas }] }),
    } as never)
    await useUserCanvasesStore.getState().loadCanvases("u1")
    const slots = useUserCanvasesStore.getState().getSlots()
    expect(slots).toHaveLength(2)
    expect(slots[0]?.name).toBe("A")
    expect(slots[1]).toBeNull()
  })

  it("loadCanvases clears to empty for a missing doc, and skips fetch for empty userId", async () => {
    getDocMock.mockResolvedValueOnce({ exists: () => false } as never)
    await useUserCanvasesStore.getState().loadCanvases("u1")
    expect(useUserCanvasesStore.getState().getSlots()).toEqual([null, null])
    getDocMock.mockClear()
    await useUserCanvasesStore.getState().loadCanvases("")
    expect(getDocMock).not.toHaveBeenCalled()
  })

  it("deleteSlot clears a slot and persists", async () => {
    await useUserCanvasesStore.getState().saveToSlot("u1", 0, "A", sampleCanvas)
    setDocMock.mockClear()
    await useUserCanvasesStore.getState().deleteSlot("u1", 0)
    expect(useUserCanvasesStore.getState().getSlots()[0]).toBeNull()
    expect(setDocMock).toHaveBeenCalledTimes(1)
  })
})

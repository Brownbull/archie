import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook } from "@testing-library/react"
import { useBuildGuidance } from "@/hooks/useBuildGuidance"

interface MockNode { id: string; data: { componentName: string; componentCategory: string } }
interface MockIssue { nodeId: string; issueType: string }

let mockNodes: MockNode[] = []
let mockTopologyIssues: MockIssue[] = []

vi.mock("@/stores/architectureStore", () => ({
  useArchitectureStore: (sel: (s: { nodes: MockNode[]; topologyIssues: MockIssue[] }) => unknown) =>
    sel({ nodes: mockNodes, topologyIssues: mockTopologyIssues }),
}))

const node = (id: string, category: string, name = id): MockNode => ({
  id,
  data: { componentName: name, componentCategory: category },
})

beforeEach(() => {
  mockNodes = []
  mockTopologyIssues = []
})

describe("useBuildGuidance (P6)", () => {
  it("flags missing compute + data layers; connected is met with no orphans", () => {
    mockNodes = [node("n1", "delivery-network", "CDN")]
    const { result } = renderHook(() => useBuildGuidance())
    const byId = Object.fromEntries(result.current.checks.map((c) => [c.id, c]))
    expect(byId.connected.met).toBe(true)
    expect(byId.compute.met).toBe(false)
    expect(byId.data.met).toBe(false)
    expect(result.current.metCount).toBe(1)
    expect(result.current.nodeCount).toBe(1)
  })

  it("is fully met when compute + data are present and all connected", () => {
    mockNodes = [node("a", "compute"), node("b", "data-storage")]
    const { result } = renderHook(() => useBuildGuidance())
    expect(result.current.metCount).toBe(3)
    expect(result.current.checks.every((c) => c.met)).toBe(true)
  })

  it("treats caching as a data layer", () => {
    mockNodes = [node("c", "caching")]
    const { result } = renderHook(() => useBuildGuidance())
    expect(result.current.checks.find((c) => c.id === "data")?.met).toBe(true)
  })

  it("marks 'connected' unmet when an orphan exists and names it in the nudge", () => {
    mockNodes = [node("a", "compute", "App"), node("orph", "data-storage", "Lonely DB")]
    mockTopologyIssues = [{ nodeId: "orph", issueType: "orphan" }]
    const { result } = renderHook(() => useBuildGuidance())
    const connected = result.current.checks.find((c) => c.id === "connected")
    expect(connected?.met).toBe(false)
    expect(connected?.nudge).toContain("Lonely DB")
    expect(connected?.nudge).toContain("not connected to traffic")
  })
})

import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook } from "@testing-library/react"
import { useNodePorts } from "@/hooks/useNodePorts"
import { PORT_TYPES, type PortDefinition } from "@/lib/constants"

const mockGetComponent = vi.fn()
vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: (...args: unknown[]) => mockGetComponent(...args),
  },
}))

describe("useNodePorts", () => {
  beforeEach(() => {
    mockGetComponent.mockReset()
  })

  it("returns empty arrays when component not found", () => {
    mockGetComponent.mockReturnValue(undefined)
    const { result } = renderHook(() => useNodePorts("nonexistent"))
    expect(result.current.inputs).toEqual([])
    expect(result.current.outputs).toEqual([])
    expect(result.current.hasPorts).toBe(false)
  })

  it("returns empty arrays when component has no ports", () => {
    mockGetComponent.mockReturnValue({ ports: undefined })
    const { result } = renderHook(() => useNodePorts("no-ports"))
    expect(result.current.hasPorts).toBe(false)
  })

  it("returns empty arrays when ports array is empty", () => {
    mockGetComponent.mockReturnValue({ ports: [] })
    const { result } = renderHook(() => useNodePorts("empty-ports"))
    expect(result.current.hasPorts).toBe(false)
  })

  it("splits ports into inputs and outputs", () => {
    const ports: PortDefinition[] = [
      { id: "http-in", type: "http", direction: "in" },
      { id: "http-out", type: "http", direction: "out" },
      { id: "db-in", type: "database", direction: "in" },
    ]
    mockGetComponent.mockReturnValue({ ports })
    const { result } = renderHook(() => useNodePorts("test-comp"))
    expect(result.current.inputs).toHaveLength(2)
    expect(result.current.outputs).toHaveLength(1)
    expect(result.current.hasPorts).toBe(true)
  })

  it("sorts ports by PORT_SORT_ORDER", () => {
    const ports: PortDefinition[] = [
      { id: "cdn-in", type: "cdn", direction: "in" },
      { id: "http-in", type: "http", direction: "in" },
      { id: "cache-in", type: "cache", direction: "in" },
    ]
    mockGetComponent.mockReturnValue({ ports })
    const { result } = renderHook(() => useNodePorts("sorted-comp"))
    expect(result.current.inputs.map((p) => p.type)).toEqual(["http", "cache", "cdn"])
  })

  it("resolves port label and color from PORT_TYPES", () => {
    const ports: PortDefinition[] = [
      { id: "db-out", type: "database", direction: "out" },
    ]
    mockGetComponent.mockReturnValue({ ports })
    const { result } = renderHook(() => useNodePorts("resolved-comp"))
    const port = result.current.outputs[0]
    expect(port.label).toBe(PORT_TYPES.database.label)
    expect(port.color).toBe(PORT_TYPES.database.color)
  })

  it("preserves original port fields", () => {
    const ports: PortDefinition[] = [
      { id: "auth-in", type: "auth", direction: "in" },
    ]
    mockGetComponent.mockReturnValue({ ports })
    const { result } = renderHook(() => useNodePorts("fields-comp"))
    const port = result.current.inputs[0]
    expect(port.id).toBe("auth-in")
    expect(port.type).toBe("auth")
    expect(port.direction).toBe("in")
  })

  it("handles component with 7 ports (max)", () => {
    const ports: PortDefinition[] = [
      { id: "http-in", type: "http", direction: "in" },
      { id: "db-in", type: "database", direction: "in" },
      { id: "cache-in", type: "cache", direction: "in" },
      { id: "stream-in", type: "stream", direction: "in" },
      { id: "monitor-in", type: "monitor", direction: "in" },
      { id: "auth-in", type: "auth", direction: "in" },
      { id: "cdn-in", type: "cdn", direction: "in" },
    ]
    mockGetComponent.mockReturnValue({ ports })
    const { result } = renderHook(() => useNodePorts("max-ports"))
    expect(result.current.inputs).toHaveLength(7)
    expect(result.current.outputs).toHaveLength(0)
    expect(result.current.hasPorts).toBe(true)
  })

  it("includes sortIndex on resolved ports", () => {
    const ports: PortDefinition[] = [
      { id: "monitor-out", type: "monitor", direction: "out" },
    ]
    mockGetComponent.mockReturnValue({ ports })
    const { result } = renderHook(() => useNodePorts("sort-idx"))
    expect(result.current.outputs[0].sortIndex).toBe(4)
  })
})

import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook } from "@testing-library/react"

const mockLibrary = vi.hoisted(() => ({
  isInitialized: vi.fn(() => true),
  getAllComponents: vi.fn(() => [
    { id: "pg", name: "PostgreSQL", category: "data-storage" },
  ]),
  getComponent: vi.fn((id: string) =>
    id === "pg" ? { id: "pg", name: "PostgreSQL" } : undefined,
  ),
  getComponentsByCategory: vi.fn(() => []),
  searchComponents: vi.fn(() => []),
}))

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: mockLibrary,
}))

import { useLibrary } from "@/hooks/useLibrary"

describe("useLibrary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns isReady based on library initialization", () => {
    const { result } = renderHook(() => useLibrary())
    expect(result.current.isReady).toBe(true)
  })

  it("returns components from the library", () => {
    const { result } = renderHook(() => useLibrary())
    expect(result.current.components).toHaveLength(1)
    expect(result.current.components[0].id).toBe("pg")
  })

  it("getComponentById returns correct component", () => {
    const { result } = renderHook(() => useLibrary())
    const comp = result.current.getComponentById("pg")
    expect(comp).toEqual({ id: "pg", name: "PostgreSQL" })
  })

  it("getComponentById returns undefined for unknown id", () => {
    const { result } = renderHook(() => useLibrary())
    expect(result.current.getComponentById("unknown")).toBeUndefined()
  })

  it("searchComponents delegates to componentLibrary", () => {
    const { result } = renderHook(() => useLibrary())
    result.current.searchComponents("test")
    expect(mockLibrary.searchComponents).toHaveBeenCalledWith("test")
  })

  it("getComponentsByCategory delegates to componentLibrary", () => {
    const { result } = renderHook(() => useLibrary())
    result.current.getComponentsByCategory("data-storage")
    expect(mockLibrary.getComponentsByCategory).toHaveBeenCalledWith("data-storage")
  })
})

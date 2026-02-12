import { describe, it, expect, beforeEach } from "vitest"
import { useUiStore } from "@/stores/uiStore"

describe("uiStore", () => {
  beforeEach(() => {
    useUiStore.setState({
      toolboxTab: "components",
      searchQuery: "",
      commandPaletteOpen: false,
    })
  })

  it("has correct default toolboxTab", () => {
    expect(useUiStore.getState().toolboxTab).toBe("components")
  })

  it("has correct default searchQuery", () => {
    expect(useUiStore.getState().searchQuery).toBe("")
  })

  it("has correct default commandPaletteOpen", () => {
    expect(useUiStore.getState().commandPaletteOpen).toBe(false)
  })

  it("setToolboxTab updates tab", () => {
    useUiStore.getState().setToolboxTab("stacks")
    expect(useUiStore.getState().toolboxTab).toBe("stacks")
  })

  it("setSearchQuery updates query", () => {
    useUiStore.getState().setSearchQuery("redis")
    expect(useUiStore.getState().searchQuery).toBe("redis")
  })

  it("setCommandPaletteOpen toggles open state", () => {
    useUiStore.getState().setCommandPaletteOpen(true)
    expect(useUiStore.getState().commandPaletteOpen).toBe(true)
    useUiStore.getState().setCommandPaletteOpen(false)
    expect(useUiStore.getState().commandPaletteOpen).toBe(false)
  })
})

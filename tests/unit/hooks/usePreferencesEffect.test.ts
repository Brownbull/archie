import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { usePreferencesEffect } from "@/hooks/usePreferencesEffect"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { FONT_SIZE_PRESETS, FONT_FAMILY_PRESETS } from "@/lib/constants"

describe("usePreferencesEffect", () => {
  const html = document.documentElement

  beforeEach(() => {
    html.classList.remove("dark")
    html.style.fontSize = ""
    html.style.removeProperty("--archie-font-family")
    usePreferencesStore.setState({
      theme: "dark",
      fontSize: "medium",
      fontFamily: "inter",
    })
  })

  afterEach(() => {
    html.classList.remove("dark")
    html.style.fontSize = ""
    html.style.removeProperty("--archie-font-family")
  })

  it("applies dark class to html element when theme is dark", () => {
    usePreferencesStore.setState({ theme: "dark" })
    renderHook(() => usePreferencesEffect())
    expect(html.classList.contains("dark")).toBe(true)
  })

  it("removes dark class from html element when theme is light", () => {
    html.classList.add("dark")
    usePreferencesStore.setState({ theme: "light" })
    renderHook(() => usePreferencesEffect())
    expect(html.classList.contains("dark")).toBe(false)
  })

  it("sets root font-size on html element", () => {
    usePreferencesStore.setState({ fontSize: "large" })
    renderHook(() => usePreferencesEffect())
    expect(html.style.fontSize).toBe(FONT_SIZE_PRESETS.large)
  })

  it("sets --archie-font-family CSS property on html element", () => {
    usePreferencesStore.setState({ fontFamily: "jetbrains-mono" })
    renderHook(() => usePreferencesEffect())
    expect(html.style.getPropertyValue("--archie-font-family")).toBe(
      FONT_FAMILY_PRESETS["jetbrains-mono"],
    )
  })

  it("applies current store values on initial mount", () => {
    usePreferencesStore.setState({
      theme: "dark",
      fontSize: "small",
      fontFamily: "system",
    })
    renderHook(() => usePreferencesEffect())

    expect(html.classList.contains("dark")).toBe(true)
    expect(html.style.fontSize).toBe(FONT_SIZE_PRESETS.small)
    expect(html.style.getPropertyValue("--archie-font-family")).toBe(
      FONT_FAMILY_PRESETS.system,
    )
  })

  it("reacts to store changes after mount", () => {
    const { rerender } = renderHook(() => usePreferencesEffect())
    expect(html.classList.contains("dark")).toBe(true)

    act(() => {
      usePreferencesStore.setState({ theme: "light" })
    })
    rerender()

    expect(html.classList.contains("dark")).toBe(false)
  })
})

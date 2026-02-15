import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SettingsMenu } from "@/components/layout/SettingsMenu"
import { usePreferencesStore } from "@/stores/preferencesStore"

describe("SettingsMenu", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    usePreferencesStore.setState({
      theme: "dark",
      fontSize: "medium",
      fontFamily: "inter",
    })
  })

  it("renders gear icon trigger button", () => {
    render(<SettingsMenu />)
    expect(screen.getByTestId("settings-menu-trigger")).toBeInTheDocument()
  })

  it("opens dropdown on click", async () => {
    const user = userEvent.setup()
    render(<SettingsMenu />)
    await user.click(screen.getByTestId("settings-menu-trigger"))
    expect(screen.getByTestId("settings-menu-content")).toBeInTheDocument()
  })

  it("shows theme options when dropdown is open", async () => {
    const user = userEvent.setup()
    render(<SettingsMenu />)
    await user.click(screen.getByTestId("settings-menu-trigger"))
    expect(screen.getByTestId("theme-option-dark")).toBeInTheDocument()
    expect(screen.getByTestId("theme-option-light")).toBeInTheDocument()
  })

  it("shows font size options when dropdown is open", async () => {
    const user = userEvent.setup()
    render(<SettingsMenu />)
    await user.click(screen.getByTestId("settings-menu-trigger"))
    expect(screen.getByTestId("font-size-small")).toBeInTheDocument()
    expect(screen.getByTestId("font-size-medium")).toBeInTheDocument()
    expect(screen.getByTestId("font-size-large")).toBeInTheDocument()
  })

  it("shows font family options when dropdown is open", async () => {
    const user = userEvent.setup()
    render(<SettingsMenu />)
    await user.click(screen.getByTestId("settings-menu-trigger"))
    expect(screen.getByTestId("font-family-inter")).toBeInTheDocument()
    expect(screen.getByTestId("font-family-outfit")).toBeInTheDocument()
    expect(screen.getByTestId("font-family-space-grotesk")).toBeInTheDocument()
    expect(screen.getByTestId("font-family-fira-sans")).toBeInTheDocument()
    expect(screen.getByTestId("font-family-dm-sans")).toBeInTheDocument()
    expect(screen.getByTestId("font-family-source-sans-3")).toBeInTheDocument()
    expect(screen.getByTestId("font-family-jetbrains-mono")).toBeInTheDocument()
    expect(screen.getByTestId("font-family-system")).toBeInTheDocument()
  })

  it("clicking theme option calls setTheme", async () => {
    const user = userEvent.setup()
    render(<SettingsMenu />)
    await user.click(screen.getByTestId("settings-menu-trigger"))
    await user.click(screen.getByTestId("theme-option-light"))
    expect(usePreferencesStore.getState().theme).toBe("light")
  })

  it("clicking font size option calls setFontSize", async () => {
    const user = userEvent.setup()
    render(<SettingsMenu />)
    await user.click(screen.getByTestId("settings-menu-trigger"))
    await user.click(screen.getByTestId("font-size-large"))
    expect(usePreferencesStore.getState().fontSize).toBe("large")
  })

  it("clicking font family option calls setFontFamily", async () => {
    const user = userEvent.setup()
    render(<SettingsMenu />)
    await user.click(screen.getByTestId("settings-menu-trigger"))
    await user.click(screen.getByTestId("font-family-jetbrains-mono"))
    expect(usePreferencesStore.getState().fontFamily).toBe("jetbrains-mono")
  })
})

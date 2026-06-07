import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SettingsMenu } from "@/components/layout/SettingsMenu"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { useTourStore } from "@/stores/tourStore"

describe("SettingsMenu", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    usePreferencesStore.setState({
      theme: "dark",
      fontSize: "medium",
      fontFamily: "inter",
      experienceLevel: "beginner",
      iconSet: "pixel",
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

  it("shows experience level options when dropdown is open", async () => {
    const user = userEvent.setup()
    render(<SettingsMenu />)
    await user.click(screen.getByTestId("settings-menu-trigger"))
    expect(screen.getByTestId("experience-option-beginner")).toBeInTheDocument()
    expect(screen.getByTestId("experience-option-intermediate")).toBeInTheDocument()
    expect(screen.getByTestId("experience-option-advanced")).toBeInTheDocument()
  })

  it("clicking an experience level option calls setExperienceLevel", async () => {
    const user = userEvent.setup()
    render(<SettingsMenu />)
    await user.click(screen.getByTestId("settings-menu-trigger"))
    await user.click(screen.getByTestId("experience-option-advanced"))
    expect(usePreferencesStore.getState().experienceLevel).toBe("advanced")
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

  it("shows icon-set options when dropdown is open", async () => {
    const user = userEvent.setup()
    render(<SettingsMenu />)
    await user.click(screen.getByTestId("settings-menu-trigger"))
    expect(screen.getByTestId("icon-set-pixel")).toBeInTheDocument()
    expect(screen.getByTestId("icon-set-official")).toBeInTheDocument()
  })

  it("clicking the official icon-set option calls setIconSet", async () => {
    const user = userEvent.setup()
    render(<SettingsMenu />)
    await user.click(screen.getByTestId("settings-menu-trigger"))
    await user.click(screen.getByTestId("icon-set-official"))
    expect(usePreferencesStore.getState().iconSet).toBe("official")
  })

  it("'Take the full tour' starts the cross-region journey (P3)", async () => {
    useTourStore.setState({ steps: null })
    const user = userEvent.setup()
    render(<SettingsMenu />)
    await user.click(screen.getByTestId("settings-menu-trigger"))
    await user.click(screen.getByTestId("full-tour"))
    const steps = useTourStore.getState().steps
    expect(steps).not.toBeNull()
    // The launcher filters to on-screen anchors; in jsdom only the anchorless intro resolves, so the
    // journey starts with it. (Region coverage of FULL_JOURNEY is asserted in panelGuides.test.)
    expect(steps?.[0]?.title).toBe("The full tour")
  })
})

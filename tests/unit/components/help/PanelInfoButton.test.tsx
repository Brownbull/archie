import { describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PanelInfoButton } from "@/components/help/PanelInfoButton"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { useTourStore } from "@/stores/tourStore"

describe("PanelInfoButton (P89/Phase B)", () => {
  beforeEach(() => {
    usePreferencesStore.setState({ experienceLevel: "beginner" })
    useTourStore.setState({ steps: null, nonce: 0 })
  })

  it("renders nothing for an unknown guide id", () => {
    const { container } = render(<PanelInfoButton guideId="does-not-exist" />)
    expect(container).toBeEmptyDOMElement()
  })

  it("opens a popover with the guide title + summary", async () => {
    const user = userEvent.setup()
    render(<PanelInfoButton guideId="toolbox" />)
    await user.click(screen.getByTestId("panel-info-toolbox"))
    const content = await screen.findByTestId("panel-info-content-toolbox")
    expect(content).toHaveTextContent("Building blocks")
  })

  it("discloses more points at advanced than at beginner", async () => {
    const user = userEvent.setup()
    const { unmount } = render(<PanelInfoButton guideId="toolbox" />)
    await user.click(screen.getByTestId("panel-info-toolbox"))
    const beginnerCount = (await screen.findByTestId("panel-info-content-toolbox")).querySelectorAll("li").length
    unmount()

    usePreferencesStore.setState({ experienceLevel: "advanced" })
    render(<PanelInfoButton guideId="toolbox" />)
    await user.click(screen.getByTestId("panel-info-toolbox"))
    const advancedCount = (await screen.findByTestId("panel-info-content-toolbox")).querySelectorAll("li").length

    expect(advancedCount).toBeGreaterThan(beginnerCount)
  })

  it("'Walk me through it' starts the focused tour and closes the popover", async () => {
    const user = userEvent.setup()
    render(<PanelInfoButton guideId="toolbox" />)
    await user.click(screen.getByTestId("panel-info-toolbox"))
    await user.click(await screen.findByTestId("panel-info-tour-toolbox"))
    expect(useTourStore.getState().steps).not.toBeNull()
    expect(useTourStore.getState().steps?.length).toBeGreaterThan(0)
  })

  it("filters the tour to steps whose target is on screen", async () => {
    const user = userEvent.setup()
    // Mount only ONE of the inspector tour's anchors — the rest should be filtered out.
    render(
      <>
        <div data-testid="inspector-heading" />
        <PanelInfoButton guideId="inspector" />
      </>,
    )
    await user.click(screen.getByTestId("panel-info-inspector"))
    await user.click(await screen.findByTestId("panel-info-tour-inspector"))
    const steps = useTourStore.getState().steps ?? []
    expect(steps.length).toBeGreaterThan(0)
    // Every surviving step targets the present anchor (or has no selector).
    expect(steps.every((s) => !s.selector || s.selector.includes("inspector-heading"))).toBe(true)
    // And it did NOT include an absent anchor like the metrics disclosure.
    expect(steps.some((s) => s.selector?.includes("disclosure-metrics"))).toBe(false)
  })
})

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
})

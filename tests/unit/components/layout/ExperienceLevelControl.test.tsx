import { describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ExperienceLevelControl } from "@/components/layout/ExperienceLevelControl"
import { usePreferencesStore } from "@/stores/preferencesStore"

describe("ExperienceLevelControl (P89 → dropdown P95)", () => {
  beforeEach(() => {
    usePreferencesStore.setState({ experienceLevel: "beginner" })
  })

  it("shows the current level on the trigger", () => {
    render(<ExperienceLevelControl />)
    expect(screen.getByTestId("experience-level-control")).toHaveTextContent("Beginner")
  })

  it("reflects the current store level on the trigger", () => {
    usePreferencesStore.setState({ experienceLevel: "advanced" })
    render(<ExperienceLevelControl />)
    expect(screen.getByTestId("experience-level-control")).toHaveTextContent("Advanced")
  })

  it("opens a menu with the three levels, current one checked", async () => {
    const user = userEvent.setup()
    render(<ExperienceLevelControl />)
    await user.click(screen.getByTestId("experience-level-control"))
    expect(await screen.findByTestId("experience-level-beginner")).toHaveAttribute("aria-checked", "true")
    expect(screen.getByTestId("experience-level-intermediate")).toHaveAttribute("aria-checked", "false")
    expect(screen.getByTestId("experience-level-advanced")).toHaveAttribute("aria-checked", "false")
  })

  it("selecting a level updates the global preference", async () => {
    const user = userEvent.setup()
    render(<ExperienceLevelControl />)
    await user.click(screen.getByTestId("experience-level-control"))
    await user.click(await screen.findByTestId("experience-level-advanced"))
    expect(usePreferencesStore.getState().experienceLevel).toBe("advanced")
  })
})

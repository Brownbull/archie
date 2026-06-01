import { describe, it, expect, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ExperienceLevelControl } from "@/components/layout/ExperienceLevelControl"
import { usePreferencesStore } from "@/stores/preferencesStore"

describe("ExperienceLevelControl (P89)", () => {
  beforeEach(() => {
    usePreferencesStore.setState({ experienceLevel: "beginner" })
  })

  it("renders three level radios with the current level checked", () => {
    render(<ExperienceLevelControl />)
    expect(screen.getByTestId("experience-level-beginner")).toHaveAttribute("aria-checked", "true")
    expect(screen.getByTestId("experience-level-intermediate")).toHaveAttribute("aria-checked", "false")
    expect(screen.getByTestId("experience-level-advanced")).toHaveAttribute("aria-checked", "false")
  })

  it("reflects the current store level", () => {
    usePreferencesStore.setState({ experienceLevel: "advanced" })
    render(<ExperienceLevelControl />)
    expect(screen.getByTestId("experience-level-advanced")).toHaveAttribute("aria-checked", "true")
  })

  it("clicking a level updates the global preference", () => {
    render(<ExperienceLevelControl />)
    fireEvent.click(screen.getByTestId("experience-level-intermediate"))
    expect(usePreferencesStore.getState().experienceLevel).toBe("intermediate")
    expect(screen.getByTestId("experience-level-intermediate")).toHaveAttribute("aria-checked", "true")
  })
})

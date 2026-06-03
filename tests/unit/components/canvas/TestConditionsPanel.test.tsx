import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { TestConditionsPanel } from "@/components/canvas/TestConditionsPanel"
import { useSimulationStore } from "@/stores/simulationStore"

// Isolate the panel's own collapse behavior — the selectors have their own store deps.
vi.mock("@/components/canvas/ScenarioSelector", () => ({
  ScenarioSelector: () => <div data-testid="scenario-selector-stub" />,
}))
vi.mock("@/components/canvas/FailureSelector", () => ({
  FailureSelector: () => <div data-testid="failure-selector-stub" />,
}))

describe("TestConditionsPanel", () => {
  beforeEach(() => {
    useSimulationStore.setState({ status: "idle" })
  })

  it("renders the label and selectors when the simulation is idle", () => {
    render(<TestConditionsPanel />)
    expect(screen.getByTestId("test-conditions")).toBeInTheDocument()
    expect(screen.getByTestId("scenario-selector-stub")).toBeInTheDocument()
    expect(screen.getByTestId("failure-selector-stub")).toBeInTheDocument()
  })

  it("does NOT render while a simulation is running", () => {
    useSimulationStore.setState({ status: "running" })
    render(<TestConditionsPanel />)
    expect(screen.queryByTestId("test-conditions")).not.toBeInTheDocument()
  })

  it("collapse toggle hides the selectors but keeps the label", () => {
    render(<TestConditionsPanel />)
    expect(screen.getByTestId("scenario-selector-stub")).toBeInTheDocument()

    fireEvent.click(screen.getByTestId("test-conditions-collapse-toggle"))

    expect(screen.queryByTestId("scenario-selector-stub")).not.toBeInTheDocument()
    expect(screen.queryByTestId("failure-selector-stub")).not.toBeInTheDocument()
    expect(screen.getByTestId("test-conditions-label")).toBeInTheDocument()

    fireEvent.click(screen.getByTestId("test-conditions-collapse-toggle"))
    expect(screen.getByTestId("scenario-selector-stub")).toBeInTheDocument()
  })

  it("collapse toggle button is clickable (pointer-events-auto) inside the pointer-events-none wrapper", () => {
    render(<TestConditionsPanel />)
    const toggle = screen.getByTestId("test-conditions-collapse-toggle")
    expect(toggle.getAttribute("class")).toContain("pointer-events-auto")
    expect(screen.getByTestId("test-conditions").getAttribute("class")).toContain("pointer-events-none")
  })
})

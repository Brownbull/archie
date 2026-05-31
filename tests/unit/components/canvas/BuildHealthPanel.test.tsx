import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { BuildHealthPanel } from "@/components/canvas/BuildHealthPanel"
import type { GuidanceCheck } from "@/hooks/useBuildGuidance"

let mockGuidance: { checks: GuidanceCheck[]; metCount: number; nodeCount: number }
let mockAttemptState: string

vi.mock("@/hooks/useBuildGuidance", () => ({
  useBuildGuidance: () => mockGuidance,
}))
vi.mock("@/stores/challengeStore", () => ({
  useChallengeStore: (sel: (s: { attemptState: string }) => unknown) => sel({ attemptState: mockAttemptState }),
}))

const checks: GuidanceCheck[] = [
  { id: "connected", label: "Everything is wired into the flow", met: false, nudge: "Lonely DB is placed but not connected to traffic." },
  { id: "compute", label: "Has a compute / service layer", met: true, nudge: "" },
  { id: "data", label: "Has a data layer", met: true, nudge: "" },
]

beforeEach(() => {
  mockGuidance = { checks, metCount: 2, nodeCount: 3 }
  mockAttemptState = "idle"
})

describe("BuildHealthPanel (P6)", () => {
  it("hides on an empty canvas (the empty state guides there)", () => {
    mockGuidance = { checks, metCount: 2, nodeCount: 0 }
    render(<BuildHealthPanel />)
    expect(screen.queryByTestId("build-health-panel")).toBeNull()
  })

  it("hides during a challenge (the challenge HUD guides there)", () => {
    mockAttemptState = "building"
    render(<BuildHealthPanel />)
    expect(screen.queryByTestId("build-health-panel")).toBeNull()
  })

  it("renders the checklist + score when building freely", () => {
    render(<BuildHealthPanel />)
    expect(screen.getByTestId("build-health-panel")).toBeInTheDocument()
    expect(screen.getByTestId("build-health-score")).toHaveTextContent("2/3")
    expect(screen.getByTestId("guidance-compute")).toHaveAttribute("data-met", "true")
    expect(screen.getByTestId("guidance-connected")).not.toHaveAttribute("data-met")
  })

  it("shows the nudge for an unmet check", () => {
    render(<BuildHealthPanel />)
    expect(screen.getByText("Lonely DB is placed but not connected to traffic.")).toBeInTheDocument()
  })

  it("collapses the checklist via the toggle", () => {
    render(<BuildHealthPanel />)
    expect(screen.getByTestId("guidance-compute")).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("build-health-toggle"))
    expect(screen.queryByTestId("guidance-compute")).toBeNull()
  })
})

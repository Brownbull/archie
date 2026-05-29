import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import type { Challenge } from "@/lib/challengeTypes"
import type { ComponentCategoryId } from "@/lib/constants"

// Control the total cost directly so the budget bar is exercised without depending on the
// component library resolving real per-variant costs in jsdom. All other helper exports
// (used by the architecture store) stay real via importActual.
let mockCost = 0
vi.mock("@/stores/architectureStoreHelpers", async (importActual) => {
  const actual = await importActual<typeof import("@/stores/architectureStoreHelpers")>()
  return { ...actual, computeTotalArchitectureCost: () => mockCost }
})

import { ChallengeHud } from "@/components/challenges/ChallengeHud"
import { useChallengeStore } from "@/stores/challengeStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { makeNode } from "../../../helpers/factories"

const challenge: Challenge = {
  id: "c1", title: "Two-Tier", brief: "Place a server behind a database.",
  difficulty: "beginner", budgetCap: 100, durationSeconds: 60,
  trafficCurve: [{ t: 0, rps: 0 }, { t: 60, rps: 100 }],
  requiredComponents: ["compute", "data-storage"],
  targetMetrics: { uptimePercent: 99, p99LatencyMs: 200 },
  scheduledEvents: [], hints: ["Use a managed database", "Right-size the compute variant"],
}

const cs = () => useChallengeStore.getState()

function setNodes(...categories: ComponentCategoryId[]) {
  useArchitectureStore.setState({
    nodes: categories.map((cat, i) => makeNode({ id: `n${i}`, data: { componentCategory: cat } })),
  })
}

describe("ChallengeHud (Epic 16)", () => {
  beforeEach(() => {
    mockCost = 0
    useChallengeStore.setState({ activeChallenge: null, attemptState: "idle", lastResult: null, bestStars: {} })
    useArchitectureStore.setState({ nodes: [] })
  })

  it("renders nothing outside challenge mode", () => {
    render(<ChallengeHud />)
    expect(screen.queryByTestId("challenge-hud")).not.toBeInTheDocument()
  })

  it("shows the brief, budget figures, and required-components checklist (green, well under cap)", () => {
    mockCost = 30
    cs().selectChallenge(challenge)
    setNodes("data-storage") // only one of the two required categories placed
    render(<ChallengeHud />)
    expect(screen.getByTestId("challenge-hud")).toHaveTextContent("Two-Tier")
    expect(screen.getByTestId("challenge-budget-label")).toHaveTextContent("$30/$100/mo")
    expect(screen.getByTestId("challenge-budget-label")).not.toHaveClass("text-red-400")
    const bar = screen.getByTestId("challenge-budget-bar")
    expect(bar).toHaveAttribute("data-tier", "ok")
    expect(bar).toHaveClass("bg-green-500")
    expect(bar).toHaveStyle({ width: "30%" })
    expect(bar).not.toHaveAttribute("data-over")
    expect(screen.getByTestId("req-data-storage")).toHaveAttribute("data-present", "true")
    expect(screen.getByTestId("req-compute")).not.toHaveAttribute("data-present")
  })

  it("turns the budget bar yellow once usage crosses the 80% threshold", () => {
    mockCost = 85
    cs().selectChallenge(challenge) // cap 100 → 85%
    render(<ChallengeHud />)
    const bar = screen.getByTestId("challenge-budget-bar")
    expect(bar).toHaveAttribute("data-tier", "warn")
    expect(bar).toHaveClass("bg-yellow-500")
    expect(bar).toHaveStyle({ width: "85%" })
    expect(bar).not.toHaveAttribute("data-over") // 85 ≤ cap is not over budget
  })

  it("treats cost exactly at the cap as warn (not over) and clamps the bar to 100%", () => {
    mockCost = 100
    cs().selectChallenge(challenge) // cap 100 → boundary
    render(<ChallengeHud />)
    const bar = screen.getByTestId("challenge-budget-bar")
    expect(bar).toHaveAttribute("data-tier", "warn") // 100 is not > 100
    expect(bar).not.toHaveAttribute("data-over")
    expect(bar).toHaveStyle({ width: "100%" })
  })

  it("marks the budget bar over-budget (red) and clamps width when cost exceeds the cap", () => {
    mockCost = 150
    cs().selectChallenge(challenge) // cap 100 → 150%
    setNodes("compute")
    render(<ChallengeHud />)
    const bar = screen.getByTestId("challenge-budget-bar")
    expect(bar).toHaveAttribute("data-tier", "over")
    expect(bar).toHaveAttribute("data-over", "true")
    expect(bar).toHaveClass("bg-red-500")
    expect(bar).toHaveStyle({ width: "100%" }) // clamped from 150%
    expect(screen.getByTestId("challenge-budget-label")).toHaveTextContent("$150/$100/mo")
    expect(screen.getByTestId("challenge-budget-label")).toHaveClass("text-red-400")
  })

  it("toggles hints open and closed, reflecting aria-expanded for assistive tech", () => {
    cs().selectChallenge(challenge)
    render(<ChallengeHud />)
    const toggle = screen.getByTestId("challenge-hints-toggle")
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(toggle).toHaveAttribute("aria-controls", "challenge-hints-list")
    expect(screen.queryByTestId("challenge-hints")).not.toBeInTheDocument()
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    const list = screen.getByTestId("challenge-hints")
    expect(list).toHaveTextContent("Use a managed database")
    expect(list).toHaveAttribute("id", "challenge-hints-list")
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByTestId("challenge-hints")).not.toBeInTheDocument()
  })

  it("exit button leaves challenge mode", () => {
    cs().selectChallenge(challenge)
    render(<ChallengeHud />)
    fireEvent.click(screen.getByTestId("challenge-exit"))
    expect(cs().activeChallenge).toBeNull()
  })
})

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }))
vi.mock("@/hooks/useCurrentUserId", () => ({ useCurrentUserId: () => "u1" }))

import { ChallengeTreeView } from "@/components/challenges/ChallengeTreeView"
import { useUserProgressStore } from "@/stores/userProgressStore"
import { useChallengeStore } from "@/stores/challengeStore"
import { getAllChallenges } from "@/services/challengeLoader"
import { CHALLENGE_TRACKS } from "@/lib/challengeTracks"

/**
 * P4-S6 (D94) Quest Log surfacing — rendered against the REAL challenge catalog:
 * expert wallet chip (wrench + orange, NOT a star), discipline color legend, the per-node
 * extra-challenge (break) corner badge, and the detail panel's Extra challenges section.
 */
const aBreakable = () => {
  const c = getAllChallenges().find((x) => (x.trafficSources?.length ?? 0) > 0 && (x.requires?.length ?? 0) === 0)
  if (!c) throw new Error("no root quest with authored traffic in the catalog")
  return c
}

describe("ChallengeTreeView — quest-log surfacing (P4-S6 / D94)", () => {
  beforeEach(() => {
    useUserProgressStore.setState({
      completedChallenges: [], trackXp: {}, expertCurrency: 0, breaksByChallenge: {}, requiredFilterUnlocked: {},
    })
    useChallengeStore.setState({ activeChallenge: null, attemptState: "idle", bestStars: {} })
  })

  it("shows the expert wallet in the header — wrench vocabulary, never a star", () => {
    useUserProgressStore.setState({ expertCurrency: 3 })
    render(<ChallengeTreeView open onOpenChange={() => {}} />)
    const chip = screen.getByTestId("quest-log-expert-count")
    expect(chip).toHaveTextContent("3 Expert")
    expect(chip.textContent).not.toMatch(/★|star/i)
  })

  it("renders the discipline color legend with every track name", () => {
    render(<ChallengeTreeView open onOpenChange={() => {}} />)
    const legend = screen.getByTestId("quest-log-track-legend")
    for (const track of CHALLENGE_TRACKS.values()) {
      expect(legend).toHaveTextContent(track.name)
    }
  })

  it("a completed breakable quest carries the corner badge with its collected count", () => {
    const c = aBreakable()
    useUserProgressStore.setState({
      completedChallenges: [c.id],
      breaksByChallenge: { [c.id]: { rps: true, workload: true } },
    })
    render(<ChallengeTreeView open onOpenChange={() => {}} />)
    const badge = screen.getByTestId(`break-badge-${c.id}`)
    expect(badge).toHaveTextContent("2")
  })

  it("no corner badge while the quest is uncompleted (the extras only exist post-clear)", () => {
    const c = aBreakable()
    render(<ChallengeTreeView open onOpenChange={() => {}} />)
    expect(screen.queryByTestId(`break-badge-${c.id}`)).toBeNull()
  })

  it("the detail panel lists the four dials with collected state on a completed quest", () => {
    const c = aBreakable()
    useUserProgressStore.setState({
      completedChallenges: [c.id],
      breaksByChallenge: { [c.id]: { rps: true } },
    })
    render(<ChallengeTreeView open onOpenChange={() => {}} />)
    fireEvent.click(screen.getByTestId(`tree-node-${c.id}`))
    const section = screen.getByTestId("quest-extra-challenges")
    expect(section).toHaveTextContent("Extra challenges")
    expect(section).toHaveTextContent("1 Expert")
    expect(screen.getByTestId("extra-break-rps")).toHaveAttribute("data-collected", "true")
    expect(screen.getByTestId("extra-break-kind")).not.toHaveAttribute("data-collected")
    expect(screen.getByTestId("extra-break-workload")).not.toHaveAttribute("data-collected")
    expect(screen.getByTestId("extra-break-origin")).not.toHaveAttribute("data-collected")
  })

  it("no extras section on an available (not yet completed) quest", () => {
    const c = aBreakable()
    render(<ChallengeTreeView open onOpenChange={() => {}} />)
    fireEvent.click(screen.getByTestId(`tree-node-${c.id}`))
    expect(screen.queryByTestId("quest-extra-challenges")).toBeNull()
  })
})

describe("resilience extras in the detail panel (P4-S7 / D94)", () => {
  it("lists authored conditions with cleared state on a completed curated quest", () => {
    const c = getAllChallenges().find((x) => (x.resilienceConditions?.length ?? 0) > 0)
    if (!c) throw new Error("no curated quest in the catalog")
    useUserProgressStore.setState({
      completedChallenges: [c.id],
      resilienceClears: { [c.id]: { [c.resilienceConditions![0]]: true } },
    })
    render(<ChallengeTreeView open onOpenChange={() => {}} />)
    fireEvent.click(screen.getByTestId(`tree-node-${c.id}`))
    const chip = screen.getByTestId(`extra-resilience-${c.resilienceConditions![0]}`)
    expect(chip).toHaveAttribute("data-cleared", "true")
    expect(chip).toHaveTextContent("✓")
  })
})

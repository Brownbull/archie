import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }))
vi.mock("@/hooks/useCurrentUserId", () => ({ useCurrentUserId: () => "u1" }))

import { ChallengeTreeView } from "@/components/challenges/ChallengeTreeView"
import { questBreakDials } from "@/lib/challengeBreakDials"
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

  it("the detail panel lists the QUEST'S collectible dials with collected state (2026-06-11: quest-level economy)", () => {
    const c = aBreakable()
    const dials = questBreakDials(c.id)
    useUserProgressStore.setState({
      completedChallenges: [c.id],
      breaksByChallenge: { [c.id]: { rps: true } },
    })
    render(<ChallengeTreeView open onOpenChange={() => {}} />)
    fireEvent.click(screen.getByTestId(`tree-node-${c.id}`))
    const section = screen.getByTestId("quest-extra-challenges")
    expect(section).toHaveTextContent("Extra challenges")
    expect(section).toHaveTextContent("1 Expert")
    expect(dials).toContain("rps") // rps is collectible on every breakable quest
    expect(screen.getByTestId("extra-break-rps")).toHaveAttribute("data-collected", "true")
    for (const d of dials.filter((x) => x !== "rps")) {
      expect(screen.getByTestId(`extra-break-${d}`)).not.toHaveAttribute("data-collected")
    }
    // dials OUTSIDE the quest's collectible set don't render at all
    for (const d of ["rps", "kind", "workload", "origin"].filter((x) => !dials.includes(x as never))) {
      expect(screen.queryByTestId(`extra-break-${d}`)).toBeNull()
    }
  })

  it("an AVAILABLE quest shows the extras section with after-3★ framing (Plan-2 P2 / D97)", () => {
    const c = aBreakable()
    render(<ChallengeTreeView open onOpenChange={() => {}} />)
    fireEvent.click(screen.getByTestId(`tree-node-${c.id}`))
    expect(screen.getByTestId("quest-extra-challenges")).toHaveTextContent(/After you 3★ this quest/)
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

describe("named chaos objectives (P5-S3 / D95)", () => {
  it("the detail panel names each event's target, time, and duration", () => {
    const c = getAllChallenges().find((x) => x.id === "observe-to-recover")
    if (!c) throw new Error("observe-to-recover missing")
    // Objectives only render on an unlocked quest — complete its prerequisites + grant the XP gate.
    useUserProgressStore.setState({ completedChallenges: [...c.requires], trackXp: { reliability: 1_000_000 } })
    render(<ChallengeTreeView open onOpenChange={() => {}} />)
    fireEvent.click(screen.getByTestId(`tree-node-${c.id}`))
    const panel = screen.getByTestId("tree-detail-panel")
    expect(panel).toHaveTextContent(/Survive: Zone outage on Compute at t=30s \(30s\)/)
    expect(panel).not.toHaveTextContent(/Survive 1 chaos event/)
  })
})

describe("chain panel in the quest detail (P5-S5 / D95)", () => {
  it("event-stream shows its stage, build parent, and the fork", () => {
    const c = getAllChallenges().find((x) => x.id === "event-stream")!
    useUserProgressStore.setState({ completedChallenges: [...c.requires], trackXp: { realtime: 1_000_000 } })
    render(<ChallengeTreeView open onOpenChange={() => {}} />)
    fireEvent.click(screen.getByTestId(`tree-node-${c.id}`))
    const chain = screen.getByTestId("quest-chain-info")
    expect(chain).toHaveTextContent(/stage 2 of 3/)
    expect(chain).toHaveTextContent(/Grows your .*Pipeline.* build/)
    expect(screen.getByTestId("quest-chain-forks")).toHaveTextContent(/Forks to:/)
  })
})

describe("chain & extras tree legibility (Plan-2 P2 / D97)", () => {
  it("chain members wear the stage badge at every state; non-members don't", () => {
    render(<ChallengeTreeView open onOpenChange={() => {}} />)
    expect(screen.getByTestId("chain-badge-first-service")).toHaveTextContent("1/3")
    expect(screen.getByTestId("chain-badge-scale-out")).toHaveTextContent("2/3")
    expect(screen.getByTestId("chain-badge-event-stream")).toHaveTextContent("2/3")
    expect(screen.queryByTestId("chain-badge-observe-baseline")).toBeNull()
  })

  it("chain-member edges are drawn distinctly (the continues_from link)", () => {
    render(<ChallengeTreeView open onOpenChange={() => {}} />)
    expect(screen.getByTestId("chain-edge-first-service-add-a-database")).toBeInTheDocument()
    expect(screen.getByTestId("chain-edge-first-service-scale-out")).toBeInTheDocument() // the fork
    expect(screen.getByTestId("chain-edge-dns-routing-edge-balance")).toBeInTheDocument()
  })

  it("resilience-extra quests wear the shield marker before completion", () => {
    render(<ChallengeTreeView open onOpenChange={() => {}} />)
    for (const id of ["edge-delivery", "edge-resilience", "follow-the-sun"]) {
      expect(screen.getByTestId(`resilience-marker-${id}`)).toBeInTheDocument()
    }
    expect(screen.queryByTestId("resilience-marker-first-service")).toBeNull()
  })
})

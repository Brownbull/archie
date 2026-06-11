import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("@/services/failureLoader", () => ({
  getAllFailurePresets: () => [
    { id: "failure-a", name: "Alpha Outage", description: "a", icon: "AlertTriangle", failureModifiers: {} },
    { id: "failure-b", name: "Beta Partition", description: "b", icon: "WifiOff", failureModifiers: {} },
  ],
}))
// The probe has its own tests (failureImpact + useFailureImpacts); control its output directly.
let mockBreaking: ReadonlySet<string> | null = null
vi.mock("@/hooks/useFailureImpacts", () => ({ useFailureImpacts: () => mockBreaking }))

import { FailureSelector } from "@/components/canvas/FailureSelector"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useChallengeStore } from "@/stores/challengeStore"
import type { Challenge } from "@/lib/challengeTypes"

const challenge = { id: "c1", title: "t" } as Challenge
const node = { id: "n1", type: "archie-component", position: { x: 0, y: 0 }, data: { archieComponentId: "x", activeConfigVariantId: "v", componentName: "X", componentCategory: "compute", replicaCount: 1 } }

describe("FailureSelector — quest gating + break glow (P4-S4 / D94)", () => {
  beforeEach(() => {
    mockBreaking = null
    useArchitectureStore.setState({ nodes: [node] as never, activeFailureScenarioId: null })
    useChallengeStore.setState({ activeChallenge: null, attemptState: "idle", bestStars: {} })
  })

  it("free mode: enabled, no lock badge (pre-S4 behavior intact)", () => {
    render(<FailureSelector />)
    expect(screen.queryByTestId("failure-locked-badge")).toBeNull()
    expect(screen.getByTestId("failure-selector-trigger")).not.toBeDisabled()
  })

  it("quest mode pre-3★: locked — disabled select + the D20 lock vocabulary", () => {
    useChallengeStore.setState({ activeChallenge: challenge, bestStars: {} })
    render(<FailureSelector />)
    expect(screen.getByTestId("failure-locked-badge")).toHaveTextContent("Reach 3★ to unlock")
    expect(screen.getByTestId("failure-selector-trigger")).toBeDisabled()
  })

  it("quest mode post-3★ (session): unlocked again", () => {
    useChallengeStore.setState({ activeChallenge: challenge, bestStars: { c1: 3 } })
    render(<FailureSelector />)
    expect(screen.queryByTestId("failure-locked-badge")).toBeNull()
    expect(screen.getByTestId("failure-selector-trigger")).not.toBeDisabled()
  })

  it("post-3★ with breaking presets: the hint announces the count", () => {
    useChallengeStore.setState({ activeChallenge: challenge, bestStars: { c1: 3 } })
    mockBreaking = new Set(["failure-a", "failure-b"])
    render(<FailureSelector />)
    expect(screen.getByTestId("failure-breaking-hint")).toHaveTextContent("2 conditions would break this build")
  })

  it("no hint when the probe is off (free mode / locked) or finds nothing", () => {
    mockBreaking = null
    const { unmount } = render(<FailureSelector />)
    expect(screen.queryByTestId("failure-breaking-hint")).toBeNull()
    unmount()
    mockBreaking = new Set()
    render(<FailureSelector />)
    expect(screen.queryByTestId("failure-breaking-hint")).toBeNull()
  })

  it("empty canvas still disables the select regardless of mode", () => {
    useArchitectureStore.setState({ nodes: [] })
    render(<FailureSelector />)
    expect(screen.getByTestId("failure-selector-trigger")).toBeDisabled()
  })
})

describe("per-block failure injection (P5-S3 / D95)", () => {
  const compute = { id: "n-api", type: "archie-component", position: { x: 0, y: 0 }, data: { archieComponentId: "x", activeConfigVariantId: "v", componentName: "API Server", componentCategory: "compute", replicaCount: 1 } }
  const traffic = { id: "n-t", type: "archie-component", position: { x: 0, y: 0 }, data: { archieComponentId: "w", activeConfigVariantId: "v", componentName: "Web Users", componentCategory: "traffic", replicaCount: 1 } }

  beforeEach(() => {
    useArchitectureStore.setState({ nodes: [traffic, compute] as never })
    useChallengeStore.setState({ activeChallenge: challenge, bestStars: { c1: 3 }, injectedBlockFailure: null })
  })

  it("post-3★ quest mode: the block-failure select appears (traffic excluded from options)", () => {
    render(<FailureSelector />)
    expect(screen.getByTestId("block-failure-select")).toBeInTheDocument()
  })

  it("hidden pre-3★ and in free mode", () => {
    useChallengeStore.setState({ bestStars: {} })
    const { unmount } = render(<FailureSelector />)
    expect(screen.queryByTestId("block-failure-select")).toBeNull()
    unmount()
    useChallengeStore.setState({ activeChallenge: null })
    render(<FailureSelector />)
    expect(screen.queryByTestId("block-failure-select")).toBeNull()
  })

  it("an active injection shows the next-run banner with the block's name", () => {
    useChallengeStore.setState({ injectedBlockFailure: "n-api" })
    render(<FailureSelector />)
    expect(screen.getByTestId("block-failure-banner")).toHaveTextContent("API Server fails mid-run")
  })
})

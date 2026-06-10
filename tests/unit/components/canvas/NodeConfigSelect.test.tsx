import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NodeConfigSelect } from "@/components/canvas/NodeConfigSelect"
import { useChallengeStore } from "@/stores/challengeStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import type { Challenge } from "@/lib/challengeTypes"

// NodeConfigSelect reads the component's config variants from the library singleton.
const mockGetComponent = vi.fn()
vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: { getComponent: (id: string) => mockGetComponent(id) },
}))

const comp = (variants: { id: string; name: string; description?: string }[]) => ({
  id: "node-express",
  name: "Node.js + Express",
  category: "compute",
  configVariants: variants.map((v) => ({ ...v, metrics: [], monthlyCost: 50, maxRPS: 1000, baseLatencyMs: 20 })),
})

describe("NodeConfigSelect (Fluidity P1 — config tier on the canvas block)", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Default to free mode (the disclosure gate is open) so the existing render tests are unaffected.
    useChallengeStore.setState({ activeChallenge: null })
    usePreferencesStore.setState({ experienceLevel: "beginner" })
  })

  it("renders the tier picker showing the active variant when the provider has multiple tiers", () => {
    mockGetComponent.mockReturnValue(comp([{ id: "single-process", name: "Single process" }, { id: "cluster-mode", name: "Cluster mode" }]))
    render(<NodeConfigSelect nodeId="n1" componentId="node-express" activeVariantId="cluster-mode" />)
    const trigger = screen.getByTestId("archie-node-config-trigger")
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveTextContent("Cluster mode") // the active tier is shown on the block
  })

  it("renders nothing when the provider has a single tier (no choice to make)", () => {
    mockGetComponent.mockReturnValue(comp([{ id: "only", name: "Only" }]))
    const { container } = render(<NodeConfigSelect nodeId="n1" componentId="node-express" activeVariantId="only" />)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByTestId("archie-node-config")).not.toBeInTheDocument()
  })

  it("falls back to the first tier when the active id is unknown (defensive)", () => {
    mockGetComponent.mockReturnValue(comp([{ id: "a", name: "Alpha" }, { id: "b", name: "Beta" }]))
    render(<NodeConfigSelect nodeId="n1" componentId="node-express" activeVariantId="missing" />)
    expect(screen.getByTestId("archie-node-config-trigger")).toHaveTextContent("Alpha")
  })

  it("P3c: gates the tier picker in a beginner-difficulty quest behind a locked hint, reveals it at intermediate+", () => {
    mockGetComponent.mockReturnValue(comp([{ id: "a", name: "Alpha" }, { id: "b", name: "Beta" }]))
    // In a quest, experienceLevel tracks the challenge difficulty. At beginner the config tier is gated —
    // P1/T7: a compact locked hint renders instead of nothing (a vanished control read as a bug).
    useChallengeStore.setState({ activeChallenge: { id: "c1" } as unknown as Challenge })
    usePreferencesStore.setState({ experienceLevel: "beginner" })
    const { rerender } = render(
      <NodeConfigSelect nodeId="n1" componentId="node-express" activeVariantId="a" />,
    )
    expect(screen.queryByTestId("archie-node-config-trigger")).not.toBeInTheDocument()
    expect(screen.getByTestId("archie-node-config-locked")).toHaveTextContent("Tuning unlocks later")

    // …and revealed once the quest difficulty (or the player) reaches intermediate.
    usePreferencesStore.setState({ experienceLevel: "intermediate" })
    rerender(<NodeConfigSelect nodeId="n1" componentId="node-express" activeVariantId="a" />)
    expect(screen.getByTestId("archie-node-config-trigger")).toBeInTheDocument()
    expect(screen.queryByTestId("archie-node-config-locked")).not.toBeInTheDocument()
  })
})

describe("tier descriptions in the dropdown (Phase 3 S1 / D92)", () => {
  it("renders a variant's description subrow when authored, omits it when absent", async () => {
    const user = userEvent.setup()
    mockGetComponent.mockReturnValue(comp([
      { id: "a", name: "Alpha", description: "Cheap single node — no failover." },
      { id: "b", name: "Beta" }, // pre-reseed variant: no description
    ]))
    render(<NodeConfigSelect nodeId="n1" componentId="node-express" activeVariantId="a" />)
    await user.click(screen.getByTestId("archie-node-config-trigger"))
    expect(screen.getByTestId("variant-description-a")).toHaveTextContent("Cheap single node — no failover.")
    expect(screen.queryByTestId("variant-description-b")).not.toBeInTheDocument()
  })
})

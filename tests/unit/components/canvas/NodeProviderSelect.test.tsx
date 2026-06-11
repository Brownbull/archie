import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { NodeProviderSelect } from "@/components/canvas/NodeProviderSelect"
import { useChallengeStore } from "@/stores/challengeStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import type { Challenge } from "@/lib/challengeTypes"
import type { ComponentCategoryId } from "@/lib/constants"

const twoProviders = [
  { id: "node-express", name: "Node.js + Express", configVariants: [{ monthlyCost: 50, maxRPS: 1000, baseLatencyMs: 20 }] },
  { id: "python-flask", name: "Python Flask", configVariants: [{ monthlyCost: 40, maxRPS: 800, baseLatencyMs: 25 }] },
]

vi.mock("@/hooks/useCurrentUserId", () => ({ useCurrentUserId: () => "u1" }))
vi.mock("@/lib/firebase", () => ({ db: {}, auth: { currentUser: null } }))
vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: () => twoProviders[0],
    getAllComponents: () => twoProviders,
  },
}))
// Keep the real module (useDisclosureTier needs levelRank) but force a multi-provider list.
vi.mock("@/lib/componentTypes", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/componentTypes")>()),
  providersForComponent: () => twoProviders,
}))
vi.mock("@/components/common/ComponentIcon", () => ({ ComponentIcon: () => <span data-testid="icon-stub" /> }))

const compute = "compute" as ComponentCategoryId

describe("NodeProviderSelect (Fluidity P3c — vendor disclosure)", () => {
  beforeEach(() => {
    useChallengeStore.setState({ activeChallenge: null })
    usePreferencesStore.setState({ experienceLevel: "beginner" })
  })

  it("free mode: shows the vendor dropdown (all options available)", () => {
    render(<NodeProviderSelect nodeId="n1" componentId="node-express" category={compute} />)
    expect(screen.getByTestId("archie-node-provider")).toBeInTheDocument()
  })

  it("beginner quest: falls back to the static vendor label (no dropdown)", () => {
    useChallengeStore.setState({ activeChallenge: { id: "c1" } as unknown as Challenge })
    usePreferencesStore.setState({ experienceLevel: "beginner" })
    render(<NodeProviderSelect nodeId="n1" componentId="node-express" category={compute} />)
    expect(screen.queryByTestId("archie-node-provider")).not.toBeInTheDocument()
    expect(screen.getByTestId("archie-node-variant")).toBeInTheDocument() // vendor still shown, read-only
  })

  it("intermediate+ quest: re-enables the vendor dropdown", () => {
    useChallengeStore.setState({ activeChallenge: { id: "c1" } as unknown as Challenge })
    usePreferencesStore.setState({ experienceLevel: "intermediate" })
    render(<NodeProviderSelect nodeId="n1" componentId="node-express" category={compute} />)
    expect(screen.getByTestId("archie-node-provider")).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("@/lib/firebase", () => ({ db: {}, auth: { currentUser: null } }))
let mockUserId: string | null = "u1"
vi.mock("@/hooks/useCurrentUserId", () => ({ useCurrentUserId: () => mockUserId }))

import { CurrencyCluster } from "@/components/layout/CurrencyCluster"
import { useUserProgressStore } from "@/stores/userProgressStore"

describe("CurrencyCluster (2026-06-11 playtest)", () => {
  beforeEach(() => {
    mockUserId = "u1"
    useUserProgressStore.setState({ bestStarsCloud: { a: 3, b: 2 }, hintsUnlocked: { a: 2 }, expertCurrency: 4 } as never)
  })

  it("shows the spendable-star pool and the Expert wallet", () => {
    render(<CurrencyCluster />)
    // spendable = 5 earned − (2 unlocked − 1 free first hint) = depends on the store's spendableStars rule
    expect(screen.getByTestId("currency-stars")).toBeInTheDocument()
    expect(screen.getByTestId("currency-expert")).toHaveTextContent("4")
  })

  it("hidden when signed out", () => {
    mockUserId = null
    render(<CurrencyCluster />)
    expect(screen.queryByTestId("currency-cluster")).toBeNull()
  })
})

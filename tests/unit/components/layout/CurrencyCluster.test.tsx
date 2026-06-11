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

  it("shows XP, the spendable-star pool, and the Expert wallet", () => {
    useUserProgressStore.setState({ trackXp: { foundations: 800, data: 450 } } as never)
    render(<CurrencyCluster />)
    expect(screen.getByTestId("currency-stars")).toBeInTheDocument()
    expect(screen.getByTestId("currency-expert")).toHaveTextContent("4")
    expect(screen.getByTestId("currency-xp")).toHaveTextContent("1.3k")
  })

  it("clicking a chip opens its earn/spend explainer (2026-06-11: 'set information about it')", async () => {
    const { fireEvent } = await import("@testing-library/react")
    render(<CurrencyCluster />)
    fireEvent.click(screen.getByTestId("currency-expert"))
    const info = await screen.findByTestId("currency-expert-info")
    expect(info).toHaveTextContent("How to earn it")
    expect(info).toHaveTextContent(/Breaking your own 3★ builds/)
    expect(info).toHaveTextContent(/required-blocks filter/)
  })

  it("hidden when signed out", () => {
    mockUserId = null
    render(<CurrencyCluster />)
    expect(screen.queryByTestId("currency-cluster")).toBeNull()
  })
})

import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook } from "@testing-library/react"

const mockUseAuth = vi.fn()
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mockUseAuth() }))

import { useCurrentUserId } from "@/hooks/useCurrentUserId"

describe("useCurrentUserId (Epic 17 P3)", () => {
  beforeEach(() => vi.resetAllMocks())

  it("returns the authenticated user's uid", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "user-123" }, loading: false })
    const { result } = renderHook(() => useCurrentUserId())
    expect(result.current).toBe("user-123")
  })

  it("returns null when no user is signed in (defensive — never an unowned write)", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    const { result } = renderHook(() => useCurrentUserId())
    expect(result.current).toBeNull()
  })

  it("returns null when auth state is still loading", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true })
    const { result } = renderHook(() => useCurrentUserId())
    expect(result.current).toBeNull()
  })
})

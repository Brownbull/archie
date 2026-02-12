import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"

const mockOnAuthStateChanged = vi.fn()
const mockSignInWithPopup = vi.fn()
const mockSignOut = vi.fn()

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  GoogleAuthProvider: vi.fn(),
}))

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
}))

import { useAuth } from "@/hooks/useAuth"

describe("useAuth", () => {
  let authCallback: ((user: unknown) => void) | null = null
  const mockUnsubscribe = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    authCallback = null

    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: (user: unknown) => void) => {
      authCallback = callback
      return mockUnsubscribe
    })
  })

  it("starts in loading state with null user", () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it("sets user when onAuthStateChanged fires with a user", () => {
    const { result } = renderHook(() => useAuth())
    const mockUser = { uid: "123", displayName: "Test User" }

    act(() => {
      authCallback?.(mockUser)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.user).toEqual(mockUser)
  })

  it("sets user to null when onAuthStateChanged fires with null", () => {
    const { result } = renderHook(() => useAuth())

    act(() => {
      authCallback?.(null)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it("calls signInWithPopup when signIn is called", async () => {
    mockSignInWithPopup.mockResolvedValue({ user: { uid: "123" } })
    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.signIn()
    })

    expect(mockSignInWithPopup).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything()
    )
  })

  it("calls Firebase signOut when signOut is called", async () => {
    mockSignOut.mockResolvedValue(undefined)
    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.signOut()
    })

    expect(mockSignOut).toHaveBeenCalledWith(expect.anything())
  })

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useAuth())
    unmount()
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
  })

  it("sets error on signIn failure", async () => {
    const error = new Error("auth/popup-closed-by-user")
    Object.assign(error, { code: "auth/popup-closed-by-user" })
    mockSignInWithPopup.mockRejectedValue(error)

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.signIn()
    })

    expect(result.current.error).toBe("Sign-in was cancelled.")
  })
})

import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { createElement, type ReactNode } from "react"

const {
  mockOnAuthStateChanged,
  mockSignInWithPopup,
  mockSignOut,
  mockAuth,
} = vi.hoisted(() => ({
  mockOnAuthStateChanged: vi.fn(),
  mockSignInWithPopup: vi.fn(),
  mockSignOut: vi.fn(),
  mockAuth: { currentUser: null },
}))

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  GoogleAuthProvider: vi.fn(),
}))

vi.mock("@/lib/firebase", () => ({
  auth: mockAuth,
}))

import { useAuth, AuthProvider } from "@/hooks/useAuth"

function wrapper({ children }: { children: ReactNode }) {
  return createElement(AuthProvider, null, children)
}

describe("useAuth", () => {
  let authCallback: ((user: unknown) => void) | null = null
  let errorCallback: ((error: unknown) => void) | null = null
  const mockUnsubscribe = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    authCallback = null
    errorCallback = null

    mockOnAuthStateChanged.mockImplementation(
      (_auth: unknown, onNext: (user: unknown) => void, onError: (error: unknown) => void) => {
        authCallback = onNext
        errorCallback = onError
        return mockUnsubscribe
      }
    )
  })

  it("starts in loading state with null user", () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it("sets user when onAuthStateChanged fires with a user", () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    const mockUser = { uid: "123", displayName: "Test User" }

    act(() => {
      authCallback?.(mockUser)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.user).toEqual(mockUser)
  })

  it("sets user to null when onAuthStateChanged fires with null", () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    act(() => {
      authCallback?.(null)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it("calls signInWithPopup with auth and GoogleAuthProvider", async () => {
    mockSignInWithPopup.mockResolvedValue({ user: { uid: "123" } })
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.signIn()
    })

    expect(mockSignInWithPopup).toHaveBeenCalledWith(
      mockAuth,
      expect.any(Object)
    )
  })

  it("calls Firebase signOut with auth", async () => {
    mockSignOut.mockResolvedValue(undefined)
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.signOut()
    })

    expect(mockSignOut).toHaveBeenCalledWith(mockAuth)
  })

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useAuth(), { wrapper })
    unmount()
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
  })

  it("sets error on signIn failure", async () => {
    const error = new Error("auth/popup-closed-by-user")
    Object.assign(error, { code: "auth/popup-closed-by-user" })
    mockSignInWithPopup.mockRejectedValue(error)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.signIn()
    })

    expect(result.current.error).toBe("Sign-in was cancelled.")
  })

  it("sets error on signOut failure", async () => {
    const error = new Error("auth/network-request-failed")
    Object.assign(error, { code: "auth/network-request-failed" })
    mockSignOut.mockRejectedValue(error)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.signOut()
    })

    expect(result.current.error).toBe("Network error. Please check your connection and try again.")
  })

  it("sets error when onAuthStateChanged error callback fires", () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    const firebaseError = new Error("network error")
    Object.assign(firebaseError, { code: "auth/network-request-failed" })

    act(() => {
      errorCallback?.(firebaseError)
    })

    expect(result.current.error).toBe("Network error. Please check your connection and try again.")
    expect(result.current.loading).toBe(false)
  })

  it("throws when used outside AuthProvider", () => {
    expect(() => {
      renderHook(() => useAuth())
    }).toThrow("useAuth must be used within an AuthProvider")
  })

  it("passes onAuthStateChanged both success and error callbacks", () => {
    renderHook(() => useAuth(), { wrapper })

    expect(mockOnAuthStateChanged).toHaveBeenCalledWith(
      mockAuth,
      expect.any(Function),
      expect.any(Function)
    )
  })
})

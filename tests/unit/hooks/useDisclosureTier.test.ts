import { describe, it, expect, beforeEach } from "vitest"
import { renderHook } from "@testing-library/react"
import { useDisclosureTier } from "@/hooks/useDisclosureTier"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { useChallengeStore } from "@/stores/challengeStore"
import type { Challenge } from "@/lib/challengeTypes"

// isChallengeMode only checks activeChallenge !== null — a minimal stub is enough for these tests.
const stubChallenge = { id: "c1" } as unknown as Challenge

describe("useDisclosureTier (Fluidity P3c)", () => {
  beforeEach(() => {
    usePreferencesStore.setState({ experienceLevel: "beginner" })
    useChallengeStore.setState({ activeChallenge: null })
  })

  it("free mode: always shows on-node config, even at beginner level", () => {
    usePreferencesStore.setState({ experienceLevel: "beginner" })
    useChallengeStore.setState({ activeChallenge: null })
    const { result } = renderHook(() => useDisclosureTier())
    expect(result.current.isQuest).toBe(false)
    expect(result.current.tier).toBe("beginner")
    expect(result.current.showOnNodeConfig).toBe(true)
  })

  it("quest mode: hides on-node config at beginner-difficulty", () => {
    usePreferencesStore.setState({ experienceLevel: "beginner" })
    useChallengeStore.setState({ activeChallenge: stubChallenge })
    const { result } = renderHook(() => useDisclosureTier())
    expect(result.current.isQuest).toBe(true)
    expect(result.current.showOnNodeConfig).toBe(false)
  })

  it("quest mode: reveals on-node config at intermediate+", () => {
    usePreferencesStore.setState({ experienceLevel: "intermediate" })
    useChallengeStore.setState({ activeChallenge: stubChallenge })
    const { result } = renderHook(() => useDisclosureTier())
    expect(result.current.isQuest).toBe(true)
    expect(result.current.showOnNodeConfig).toBe(true)

    usePreferencesStore.setState({ experienceLevel: "advanced" })
    const { result: adv } = renderHook(() => useDisclosureTier())
    expect(adv.current.showOnNodeConfig).toBe(true)
  })
})

import { describe, it, expect, afterEach } from "vitest"
import { useGuestStore } from "@/stores/guestStore"

describe("guestStore", () => {
  afterEach(() => {
    useGuestStore.getState().exitGuest()
  })

  it("defaults to not a guest", () => {
    expect(useGuestStore.getState().isGuest).toBe(false)
  })

  it("enterGuest flips the flag; exitGuest clears it", () => {
    useGuestStore.getState().enterGuest()
    expect(useGuestStore.getState().isGuest).toBe(true)

    useGuestStore.getState().exitGuest()
    expect(useGuestStore.getState().isGuest).toBe(false)
  })

  it("persists the flag to sessionStorage (survives an in-tab refresh, not the tab close)", () => {
    useGuestStore.getState().enterGuest()
    const raw = sessionStorage.getItem("archie-guest")
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw as string).state.isGuest).toBe(true)
  })
})

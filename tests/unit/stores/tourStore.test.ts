import { describe, it, expect, beforeEach } from "vitest"
import { useTourStore } from "@/stores/tourStore"

const steps = [{ title: "A", body: "a" }, { title: "B", body: "b" }]

describe("tourStore (P89/Phase B)", () => {
  beforeEach(() => useTourStore.setState({ steps: null, nonce: 0 }))

  it("starts with no active tour", () => {
    expect(useTourStore.getState().steps).toBeNull()
  })

  it("start() sets the steps and bumps the nonce", () => {
    useTourStore.getState().start(steps)
    expect(useTourStore.getState().steps).toEqual(steps)
    expect(useTourStore.getState().nonce).toBe(1)
  })

  it("each start() increments the nonce so the renderer remounts fresh", () => {
    useTourStore.getState().start(steps)
    useTourStore.getState().start(steps)
    expect(useTourStore.getState().nonce).toBe(2)
  })

  it("close() clears the active tour", () => {
    useTourStore.getState().start(steps)
    useTourStore.getState().close()
    expect(useTourStore.getState().steps).toBeNull()
  })
})

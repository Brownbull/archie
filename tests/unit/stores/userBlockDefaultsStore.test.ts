import { describe, it, expect, beforeEach, vi } from "vitest"

vi.mock("@/lib/firebase", () => ({ db: {} }))
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => "server-ts"),
}))

import { getDoc, setDoc } from "firebase/firestore"
import { useUserBlockDefaultsStore } from "@/stores/userBlockDefaultsStore"

const getDocMock = vi.mocked(getDoc)
const setDocMock = vi.mocked(setDoc)

describe("useUserBlockDefaultsStore", () => {
  beforeEach(() => {
    useUserBlockDefaultsStore.getState().reset()
    getDocMock.mockReset()
    setDocMock.mockReset()
    setDocMock.mockResolvedValue(undefined as never)
  })

  it("getDefault returns undefined when nothing saved", () => {
    expect(useUserBlockDefaultsStore.getState().getDefault("relational-db")).toBeUndefined()
  })

  it("saveDefault optimistically sets the default locally and persists it", async () => {
    await useUserBlockDefaultsStore.getState().saveDefault("u1", "relational-db", "postgresql", "primary-replica")

    expect(useUserBlockDefaultsStore.getState().getDefault("relational-db")).toEqual({
      providerId: "postgresql",
      variantId: "primary-replica",
    })
    // Persisted with merge + a server timestamp
    expect(setDocMock).toHaveBeenCalledTimes(1)
    const [, payload, options] = setDocMock.mock.calls[0]
    expect(payload).toMatchObject({
      defaults: { "relational-db": { providerId: "postgresql", variantId: "primary-replica" } },
      updatedAt: "server-ts",
    })
    expect(options).toEqual({ merge: true })
  })

  it("saveDefault is a no-op with a missing userId or field", async () => {
    await useUserBlockDefaultsStore.getState().saveDefault("", "relational-db", "postgresql", "v1")
    await useUserBlockDefaultsStore.getState().saveDefault("u1", "", "postgresql", "v1")
    expect(setDocMock).not.toHaveBeenCalled()
    expect(useUserBlockDefaultsStore.getState().defaults).toEqual({})
  })

  it("saveDefault keeps the optimistic value even if the write fails", async () => {
    setDocMock.mockRejectedValueOnce(new Error("network"))
    await useUserBlockDefaultsStore.getState().saveDefault("u1", "cache", "redis", "cluster")
    expect(useUserBlockDefaultsStore.getState().getDefault("cache")).toEqual({ providerId: "redis", variantId: "cluster" })
    expect(useUserBlockDefaultsStore.getState().error).toBeTruthy()
  })

  it("loadDefaults hydrates from an existing doc", async () => {
    getDocMock.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ defaults: { cache: { providerId: "dragonfly", variantId: "standard" } } }),
    } as never)
    await useUserBlockDefaultsStore.getState().loadDefaults("u1")
    expect(useUserBlockDefaultsStore.getState().getDefault("cache")).toEqual({ providerId: "dragonfly", variantId: "standard" })
    expect(useUserBlockDefaultsStore.getState().loading).toBe(false)
  })

  it("loadDefaults clears to empty for a missing doc", async () => {
    getDocMock.mockResolvedValueOnce({ exists: () => false } as never)
    useUserBlockDefaultsStore.setState({ defaults: { x: { providerId: "p", variantId: "v" } } })
    await useUserBlockDefaultsStore.getState().loadDefaults("u1")
    expect(useUserBlockDefaultsStore.getState().defaults).toEqual({})
  })

  it("loadDefaults with empty userId resets without a fetch", async () => {
    await useUserBlockDefaultsStore.getState().loadDefaults("")
    expect(getDocMock).not.toHaveBeenCalled()
    expect(useUserBlockDefaultsStore.getState().defaults).toEqual({})
  })

  it("reset clears defaults", () => {
    useUserBlockDefaultsStore.setState({ defaults: { cache: { providerId: "redis", variantId: "x" } } })
    useUserBlockDefaultsStore.getState().reset()
    expect(useUserBlockDefaultsStore.getState().defaults).toEqual({})
  })
})

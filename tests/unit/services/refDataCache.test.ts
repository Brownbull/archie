import { describe, it, expect, vi, beforeEach } from "vitest"

const { getDocMock } = vi.hoisted(() => ({ getDocMock: vi.fn() }))

vi.mock("@/lib/firebase", () => ({ db: {} }))
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({})),
  getDoc: getDocMock,
}))

import { isCacheValid, readCached, writeCache, stampCache, clearCache } from "@/services/refDataCache"

describe("refDataCache", () => {
  beforeEach(() => {
    localStorage.clear()
    getDocMock.mockReset()
  })

  it("readCached returns null when nothing stored", () => {
    expect(readCached("components")).toBeNull()
  })

  it("writeCache + readCached round-trips data", () => {
    writeCache("components", [{ id: "redis" }])
    expect(readCached("components")).toEqual([{ id: "redis" }])
  })

  it("readCached returns null on corrupt JSON", () => {
    localStorage.setItem("archie-refdata-components", "not json")
    expect(readCached("components")).toBeNull()
  })

  it("isCacheValid returns false when no local meta exists", async () => {
    expect(await isCacheValid()).toBe(false)
  })

  it("isCacheValid returns true when local and remote match", async () => {
    stampCache("1.0.0", "2026-06-12T00:00:00Z")
    getDocMock.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ version: "1.0.0", seededAt: "2026-06-12T00:00:00Z" }),
    })
    expect(await isCacheValid()).toBe(true)
  })

  it("isCacheValid returns false when versions differ", async () => {
    stampCache("1.0.0", "2026-06-12T00:00:00Z")
    getDocMock.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ version: "2.0.0", seededAt: "2026-06-12T00:00:00Z" }),
    })
    expect(await isCacheValid()).toBe(false)
  })

  it("isCacheValid returns false when seededAt differs (re-seed)", async () => {
    stampCache("1.0.0", "2026-06-12T00:00:00Z")
    getDocMock.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ version: "1.0.0", seededAt: "2026-06-13T00:00:00Z" }),
    })
    expect(await isCacheValid()).toBe(false)
  })

  it("isCacheValid returns true on Firestore error if local cache exists (offline-friendly)", async () => {
    stampCache("1.0.0", "2026-06-12T00:00:00Z")
    getDocMock.mockRejectedValueOnce(new Error("offline"))
    expect(await isCacheValid()).toBe(true)
  })

  it("clearCache removes all keys", () => {
    writeCache("components", [{ id: "a" }])
    writeCache("stacks", [{ id: "b" }])
    stampCache("1.0.0", "now")
    clearCache()
    expect(readCached("components")).toBeNull()
    expect(readCached("stacks")).toBeNull()
    expect(localStorage.getItem("archie-refdata-meta")).toBeNull()
  })
})

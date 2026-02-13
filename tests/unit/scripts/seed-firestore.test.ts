import { describe, it, expect, vi, beforeEach } from "vitest"
import { seedToFirestore } from "../../../scripts/seed-firestore"
import { createMockDb, makeComponent } from "./seed-helpers"

// Mock node:fs — partial mock with explicit default export
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>()
  const mocked = {
    ...actual,
    existsSync: vi.fn(() => true),
    readdirSync: vi.fn(),
    readFileSync: vi.fn(),
    statSync: vi.fn(() => ({ size: 100 })),
  }
  return { ...mocked, default: mocked }
})

// Mock firebase-admin (script imports these at top level)
vi.mock("firebase-admin/app", () => ({
  initializeApp: vi.fn(),
  cert: vi.fn(),
}))

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: vi.fn(),
}))

beforeEach(() => {
  vi.resetAllMocks()
})

describe("seedToFirestore", () => {
  it("writes components in a single batch when count < 500", async () => {
    const { db, mocks } = createMockDb()
    const components = Array.from({ length: 3 }, (_, i) => makeComponent(`comp-${i}`))

    await seedToFirestore(db, components)

    // 1 batch: 3 components + 1 metadata = 4 operations
    expect(mocks.batchFn).toHaveBeenCalledTimes(1)
    expect(mocks.setFn).toHaveBeenCalledTimes(4)
    expect(mocks.commitFn).toHaveBeenCalledTimes(1)
  })

  it("chunks into multiple batches when count > 499", async () => {
    const consoleSpy = vi.spyOn(console, "log")
    const { db, mocks } = createMockDb()
    const components = Array.from({ length: 501 }, (_, i) => makeComponent(`comp-${i}`))

    await seedToFirestore(db, components)

    // 501 components + 1 metadata = 502 ops → 2 batches (500 + 2)
    expect(mocks.batchFn).toHaveBeenCalledTimes(2)
    expect(mocks.commitFn).toHaveBeenCalledTimes(2)
    expect(mocks.setFn).toHaveBeenCalledTimes(502)

    // Verify batch split logged correctly
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Batch 1/2 committed (500 operations)"))
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Batch 2/2 committed (2 operations)"))
    consoleSpy.mockRestore()
  })

  it("includes metadata in chunk accounting (499 components fits in 1 batch)", async () => {
    const { db, mocks } = createMockDb()
    const components = Array.from({ length: 499 }, (_, i) => makeComponent(`comp-${i}`))

    await seedToFirestore(db, components)

    // 499 + 1 metadata = 500 → exactly 1 batch
    expect(mocks.batchFn).toHaveBeenCalledTimes(1)
    expect(mocks.setFn).toHaveBeenCalledTimes(500)
    expect(mocks.commitFn).toHaveBeenCalledTimes(1)
  })

  it("handles exactly 500 components (metadata forces 2nd batch)", async () => {
    const { db, mocks } = createMockDb()
    const components = Array.from({ length: 500 }, (_, i) => makeComponent(`comp-${i}`))

    await seedToFirestore(db, components)

    // 500 components + 1 metadata = 501 ops → 2 batches (499 + 2)
    expect(mocks.batchFn).toHaveBeenCalledTimes(2)
    expect(mocks.commitFn).toHaveBeenCalledTimes(2)
    expect(mocks.setFn).toHaveBeenCalledTimes(501)
  })

  it("logs chunk progress", async () => {
    const consoleSpy = vi.spyOn(console, "log")
    const { db } = createMockDb()
    const components = Array.from({ length: 2 }, (_, i) => makeComponent(`comp-${i}`))

    await seedToFirestore(db, components)

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Batch 1/1 committed"))
    consoleSpy.mockRestore()
  })

  it("returns the count of written components", async () => {
    const { db } = createMockDb()
    const components = Array.from({ length: 3 }, (_, i) => makeComponent(`comp-${i}`))

    const result = await seedToFirestore(db, components)
    expect(result).toBe(3)
  })

  it("rejects when batch commit fails", async () => {
    const { db, mocks } = createMockDb()
    mocks.commitFn.mockRejectedValueOnce(new Error("Firestore unavailable"))

    const components = Array.from({ length: 2 }, (_, i) => makeComponent(`comp-${i}`))

    await expect(seedToFirestore(db, components)).rejects.toThrow("Firestore unavailable")
  })

  it("throws on write count mismatch", async () => {
    const { db, mocks } = createMockDb()
    const components = Array.from({ length: 2 }, (_, i) => makeComponent(`comp-${i}`))

    // Simulate external mutation during commit — components array grows
    // after the write loop finishes, causing writtenIds.length < components.length
    mocks.commitFn.mockImplementation(async () => {
      components.push(makeComponent("sneaky"))
    })

    await expect(seedToFirestore(db, components)).rejects.toThrow("Write count mismatch")
  })

  it("writes metadata document in the last batch", async () => {
    const { db, mocks } = createMockDb()
    const components = [makeComponent("comp-0")]

    await seedToFirestore(db, components)

    // Metadata call is the second set() call
    expect(mocks.collectionFn).toHaveBeenCalledWith("_metadata")
    expect(mocks.setFn).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        version: "1.0.0",
        componentCount: 1,
      }),
    )
  })

  it("writes metadata with valid ISO timestamp in seededAt", async () => {
    const { db, mocks } = createMockDb()
    const components = [makeComponent("comp-0")]

    await seedToFirestore(db, components)

    const metadataCall = mocks.setFn.mock.calls.find(
      (args) => args[1]?.seededAt !== undefined,
    )
    expect(metadataCall).toBeDefined()
    const seededAt = metadataCall![1].seededAt as string
    expect(new Date(seededAt).toISOString()).toBe(seededAt)
  })

  it("handles empty components array (writes only metadata)", async () => {
    const { db, mocks } = createMockDb()

    const result = await seedToFirestore(db, [])

    expect(result).toBe(0)
    // 1 batch with only metadata
    expect(mocks.batchFn).toHaveBeenCalledTimes(1)
    expect(mocks.commitFn).toHaveBeenCalledTimes(1)
    // Only metadata set, no component sets
    expect(mocks.setFn).toHaveBeenCalledTimes(1)
    expect(mocks.collectionFn).toHaveBeenCalledWith("_metadata")
  })
})

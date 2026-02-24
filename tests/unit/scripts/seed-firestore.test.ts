import { describe, it, expect, vi, beforeEach } from "vitest"
import "./seed-mocks"
import { seedToFirestore, seedBlueprintsToFirestore } from "../../../scripts/seed-firestore"
import { createMockDb, makeComponent, makeBlueprintFull, noopLogger } from "./seed-helpers"

function createSpyLogger() {
  return { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe("seedToFirestore", () => {
  it("writes components in a single batch when count < 500", async () => {
    const { db, mocks } = createMockDb()
    const components = Array.from({ length: 3 }, (_, i) => makeComponent(`comp-${i}`))

    await seedToFirestore(db, components, noopLogger)

    // 2 batches: 1 for 3 components, 1 for metadata — 4 set operations total
    expect(mocks.batchFn).toHaveBeenCalledTimes(2)
    expect(mocks.setFn).toHaveBeenCalledTimes(4)
    expect(mocks.commitFn).toHaveBeenCalledTimes(2)
  })

  it("chunks into multiple batches when count > 499", async () => {
    const logger = createSpyLogger()
    const { db, mocks } = createMockDb()
    const components = Array.from({ length: 501 }, (_, i) => makeComponent(`comp-${i}`))

    await seedToFirestore(db, components, logger)

    // 501 components in 2 chunks (500+1) + 1 metadata batch = 3 batches, 502 set operations
    expect(mocks.batchFn).toHaveBeenCalledTimes(3)
    expect(mocks.commitFn).toHaveBeenCalledTimes(3)
    expect(mocks.setFn).toHaveBeenCalledTimes(502)

    // Verify batch split logged correctly
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Batch 1/2 committed (500 operations)"))
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Batch 2/2 committed (1 operations)"))
  })

  it("writes 499 components in 1 chunk with metadata in separate batch", async () => {
    const { db, mocks } = createMockDb()
    const components = Array.from({ length: 499 }, (_, i) => makeComponent(`comp-${i}`))

    await seedToFirestore(db, components, noopLogger)

    // 499 components in 1 chunk + metadata in separate batch = 2 batches, 500 set operations
    expect(mocks.batchFn).toHaveBeenCalledTimes(2)
    expect(mocks.setFn).toHaveBeenCalledTimes(500)
    expect(mocks.commitFn).toHaveBeenCalledTimes(2)
  })

  it("handles exactly 500 components (metadata forces 2nd batch)", async () => {
    const { db, mocks } = createMockDb()
    const components = Array.from({ length: 500 }, (_, i) => makeComponent(`comp-${i}`))

    await seedToFirestore(db, components, noopLogger)

    // 500 components in 1 chunk + metadata in separate batch = 2 batches (500 + 1), 501 set operations
    expect(mocks.batchFn).toHaveBeenCalledTimes(2)
    expect(mocks.commitFn).toHaveBeenCalledTimes(2)
    expect(mocks.setFn).toHaveBeenCalledTimes(501)
  })

  it("logs chunk progress", async () => {
    const logger = createSpyLogger()
    const { db } = createMockDb()
    const components = Array.from({ length: 2 }, (_, i) => makeComponent(`comp-${i}`))

    await seedToFirestore(db, components, logger)

    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Batch 1/1 committed"))
  })

  it("returns the count of written components", async () => {
    const { db } = createMockDb()
    const components = Array.from({ length: 3 }, (_, i) => makeComponent(`comp-${i}`))

    const result = await seedToFirestore(db, components, noopLogger)
    expect(result).toBe(3)
  })

  it("rejects when batch commit fails", async () => {
    const { db, mocks } = createMockDb()
    mocks.commitFn.mockRejectedValueOnce(new Error("Firestore unavailable"))

    const components = Array.from({ length: 2 }, (_, i) => makeComponent(`comp-${i}`))

    await expect(seedToFirestore(db, components, noopLogger)).rejects.toThrow("Firestore unavailable")
  })

  it("writes metadata document in the last batch", async () => {
    const { db, mocks } = createMockDb()
    const components = [makeComponent("comp-0")]

    await seedToFirestore(db, components, noopLogger)

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

    await seedToFirestore(db, components, noopLogger)

    const metadataCall = mocks.setFn.mock.calls.find(
      (args) => args[1]?.seededAt !== undefined,
    )
    expect(metadataCall).toBeDefined()
    const seededAt = metadataCall![1].seededAt as string
    expect(new Date(seededAt).toISOString()).toBe(seededAt)
  })

  it("handles empty components array (writes only metadata)", async () => {
    const { db, mocks } = createMockDb()

    const result = await seedToFirestore(db, [], noopLogger)

    expect(result).toBe(0)
    // 1 batch with only metadata
    expect(mocks.batchFn).toHaveBeenCalledTimes(1)
    expect(mocks.commitFn).toHaveBeenCalledTimes(1)
    // Only metadata set, no component sets
    expect(mocks.setFn).toHaveBeenCalledTimes(1)
    expect(mocks.collectionFn).toHaveBeenCalledWith("_metadata")
  })
})

describe("seedBlueprintsToFirestore", () => {
  it("writes blueprints to blueprints collection", async () => {
    const { db, mocks } = createMockDb()
    const blueprints = [makeBlueprintFull("whatsapp-messaging"), makeBlueprintFull("telegram-messaging")]

    await seedBlueprintsToFirestore(db, blueprints, noopLogger)

    expect(mocks.collectionFn).toHaveBeenCalledWith("blueprints")
    expect(mocks.setFn).toHaveBeenCalledTimes(2)
    expect(mocks.commitFn).toHaveBeenCalledTimes(1)
  })

  it("uses blueprint id as document ID", async () => {
    const { db, mocks } = createMockDb()
    const blueprints = [makeBlueprintFull("whatsapp-messaging")]

    await seedBlueprintsToFirestore(db, blueprints, noopLogger)

    expect(mocks.docFn).toHaveBeenCalledWith("whatsapp-messaging")
  })

  it("calls batch.set() once per blueprint and returns N", async () => {
    const { db, mocks } = createMockDb()
    const blueprints = [makeBlueprintFull("bp-1"), makeBlueprintFull("bp-2")]

    const result = await seedBlueprintsToFirestore(db, blueprints, noopLogger)

    expect(result).toBe(2)
    expect(mocks.setFn).toHaveBeenCalledTimes(2)
  })

  it("rejects when batch commit fails", async () => {
    const { db, mocks } = createMockDb()
    mocks.commitFn.mockRejectedValueOnce(new Error("Firestore unavailable"))

    await expect(
      seedBlueprintsToFirestore(db, [makeBlueprintFull("bp-1")], noopLogger),
    ).rejects.toThrow("Firestore unavailable")
  })

  it("logs 'No blueprints to seed.' and returns 0 for empty input", async () => {
    const logger = createSpyLogger()
    const { db, mocks } = createMockDb()

    const result = await seedBlueprintsToFirestore(db, [], logger)

    expect(result).toBe(0)
    expect(mocks.batchFn).not.toHaveBeenCalled()
    expect(logger.log).toHaveBeenCalledWith("No blueprints to seed.")
    expect(logger.warn).not.toHaveBeenCalled()
    expect(logger.error).not.toHaveBeenCalled()
  })

  it("chunks into multiple batches when blueprint count exceeds BATCH_LIMIT", async () => {
    const logger = createSpyLogger()
    const { db, mocks } = createMockDb()
    // 501 = BATCH_LIMIT (500) + 1 — forces 2 chunks: chunk 1 = 500, chunk 2 = 1
    const blueprints = Array.from({ length: 501 }, (_, i) => makeBlueprintFull(`bp-${i}`))

    await seedBlueprintsToFirestore(db, blueprints, logger)

    expect(mocks.batchFn).toHaveBeenCalledTimes(2)
    expect(mocks.commitFn).toHaveBeenCalledTimes(2)
    expect(mocks.setFn).toHaveBeenCalledTimes(501)
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Blueprint batch 1/2 committed (500 operations)"))
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Blueprint batch 2/2 committed (1 operations)"))
  })
})

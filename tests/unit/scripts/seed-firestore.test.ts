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

    // 1 batch for 3 components — 3 set operations (metadata now in main)
    expect(mocks.batchFn).toHaveBeenCalledTimes(1)
    expect(mocks.setFn).toHaveBeenCalledTimes(3)
    expect(mocks.commitFn).toHaveBeenCalledTimes(1)
  })

  it("chunks into multiple batches when count > 499", async () => {
    const logger = createSpyLogger()
    const { db, mocks } = createMockDb()
    const components = Array.from({ length: 501 }, (_, i) => makeComponent(`comp-${i}`))

    await seedToFirestore(db, components, logger)

    // 501 components in 2 chunks (500+1) = 2 batches, 501 set operations (metadata now in main)
    expect(mocks.batchFn).toHaveBeenCalledTimes(2)
    expect(mocks.commitFn).toHaveBeenCalledTimes(2)
    expect(mocks.setFn).toHaveBeenCalledTimes(501)

    // Verify batch split logged correctly
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Batch 1/2 committed (500 operations)"))
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Batch 2/2 committed (1 operations)"))
  })

  it("writes 499 components in 1 chunk", async () => {
    const { db, mocks } = createMockDb()
    const components = Array.from({ length: 499 }, (_, i) => makeComponent(`comp-${i}`))

    await seedToFirestore(db, components, noopLogger)

    // 499 components in 1 chunk = 1 batch, 499 set operations (metadata now in main)
    expect(mocks.batchFn).toHaveBeenCalledTimes(1)
    expect(mocks.setFn).toHaveBeenCalledTimes(499)
    expect(mocks.commitFn).toHaveBeenCalledTimes(1)
  })

  it("handles exactly 500 components in 1 batch", async () => {
    const { db, mocks } = createMockDb()
    const components = Array.from({ length: 500 }, (_, i) => makeComponent(`comp-${i}`))

    await seedToFirestore(db, components, noopLogger)

    // 500 components in 1 chunk = 1 batch, 500 set operations (metadata now in main)
    expect(mocks.batchFn).toHaveBeenCalledTimes(1)
    expect(mocks.commitFn).toHaveBeenCalledTimes(1)
    expect(mocks.setFn).toHaveBeenCalledTimes(500)
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

  it("handles empty components array (no writes)", async () => {
    const { db, mocks } = createMockDb()

    const result = await seedToFirestore(db, [], noopLogger)

    expect(result).toBe(0)
    expect(mocks.batchFn).not.toHaveBeenCalled()
    expect(mocks.setFn).not.toHaveBeenCalled()
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

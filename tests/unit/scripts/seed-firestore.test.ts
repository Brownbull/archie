import { describe, it, expect, vi, beforeEach } from "vitest"
import { dump } from "js-yaml"
import { loadAndValidateComponents, seedToFirestore } from "../../../scripts/seed-firestore"

// Mock node:fs — partial mock with explicit default export
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>()
  const mocked = {
    ...actual,
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

import { readdirSync, readFileSync } from "node:fs"

const mockedReaddirSync = vi.mocked(readdirSync)
const mockedReadFileSync = vi.mocked(readFileSync)

// Helper: minimal valid component YAML (snake_case for ComponentYamlSchema)
function makeComponentYaml(id: string) {
  return dump({
    id,
    name: `Component ${id}`,
    category: "data-storage",
    description: `Description for ${id}`,
    is: `A test component ${id}`,
    gain: ["Fast"],
    cost: ["Expensive"],
    tags: ["test"],
    base_metrics: [
      { id: "latency", value: "low", numeric_value: 3, category: "performance" },
    ],
    config_variants: [
      {
        id: "default",
        name: "Default",
        metrics: [
          { id: "latency", value: "low", numeric_value: 3, category: "performance" },
        ],
      },
    ],
  })
}

// Helper: create a mock Firestore db
function createMockDb() {
  const commitFn = vi.fn().mockResolvedValue(undefined)
  const setFn = vi.fn()
  const batchFn = vi.fn(() => ({ set: setFn, commit: commitFn }))
  const docFn = vi.fn((docId: string) => ({ id: docId }))
  const collectionFn = vi.fn(() => ({ doc: docFn }))

  return {
    db: { batch: batchFn, collection: collectionFn } as unknown as Parameters<typeof seedToFirestore>[0],
    mocks: { commitFn, setFn, batchFn, docFn, collectionFn },
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe("loadAndValidateComponents", () => {
  it("loads and validates valid YAML files", () => {
    mockedReaddirSync.mockReturnValue(["comp-a.yaml", "comp-b.yaml"] as unknown as ReturnType<typeof readdirSync>)
    mockedReadFileSync.mockImplementation((filePath) => {
      const path = String(filePath)
      if (path.includes("comp-a")) return makeComponentYaml("comp-a")
      if (path.includes("comp-b")) return makeComponentYaml("comp-b")
      return ""
    })

    const result = loadAndValidateComponents("/fake/data")
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe("comp-a")
    expect(result[1].id).toBe("comp-b")
  })

  it("ignores non-YAML files", () => {
    mockedReaddirSync.mockReturnValue(["comp.yaml", "readme.md", "data.json"] as unknown as ReturnType<typeof readdirSync>)
    mockedReadFileSync.mockReturnValue(makeComponentYaml("comp"))

    const result = loadAndValidateComponents("/fake/data")
    expect(result).toHaveLength(1)
    expect(mockedReadFileSync).toHaveBeenCalledTimes(1)
  })

  it("throws on malformed YAML syntax", () => {
    mockedReaddirSync.mockReturnValue(["bad.yaml"] as unknown as ReturnType<typeof readdirSync>)
    mockedReadFileSync.mockReturnValue("invalid: yaml: [unterminated")

    expect(() => loadAndValidateComponents("/fake/data")).toThrow("Validation failed")
  })

  it("throws on Zod validation failure (missing required fields)", () => {
    mockedReaddirSync.mockReturnValue(["incomplete.yaml"] as unknown as ReturnType<typeof readdirSync>)
    mockedReadFileSync.mockReturnValue(dump({ id: "incomplete" }))

    expect(() => loadAndValidateComponents("/fake/data")).toThrow("Validation failed")
  })

  it("returns empty array when no YAML files exist", () => {
    mockedReaddirSync.mockReturnValue([] as unknown as ReturnType<typeof readdirSync>)

    const result = loadAndValidateComponents("/fake/data")
    expect(result).toHaveLength(0)
  })

  it("rejects YAML with empty required string fields", () => {
    mockedReaddirSync.mockReturnValue(["empty-name.yaml"] as unknown as ReturnType<typeof readdirSync>)
    mockedReadFileSync.mockReturnValue(dump({
      id: "test",
      name: "",
      category: "data-storage",
      description: "A description",
      is: "Something",
      gain: ["Fast"],
      cost: ["Expensive"],
      tags: ["test"],
      base_metrics: [{ id: "latency", value: "low", numeric_value: 3, category: "performance" }],
      config_variants: [{ id: "default", name: "Default", metrics: [{ id: "latency", value: "low", numeric_value: 3, category: "performance" }] }],
    }))

    expect(() => loadAndValidateComponents("/fake/data")).toThrow("Validation failed")
  })
})

describe("seedToFirestore", () => {
  it("writes components in a single batch when count < 500", async () => {
    const { db, mocks } = createMockDb()
    const components = Array.from({ length: 3 }, (_, i) => ({
      id: `comp-${i}`,
      name: `Component ${i}`,
      category: "data-storage",
      description: `Desc ${i}`,
      is: `Is ${i}`,
      gain: ["Fast"],
      cost: ["Expensive"],
      tags: ["test"],
      baseMetrics: [{ id: "latency", value: "low" as const, numericValue: 3, category: "performance" }],
      configVariants: [{ id: "default", name: "Default", metrics: [{ id: "latency", value: "low" as const, numericValue: 3, category: "performance" }] }],
    }))

    await seedToFirestore(db, components)

    // 1 batch: 3 components + 1 metadata = 4 operations
    expect(mocks.batchFn).toHaveBeenCalledTimes(1)
    expect(mocks.setFn).toHaveBeenCalledTimes(4)
    expect(mocks.commitFn).toHaveBeenCalledTimes(1)
  })

  it("chunks into multiple batches when count > 499", async () => {
    const { db, mocks } = createMockDb()
    const components = Array.from({ length: 501 }, (_, i) => ({
      id: `comp-${i}`,
      name: `Component ${i}`,
      category: "data-storage",
      description: `Desc ${i}`,
      is: `Is ${i}`,
      gain: ["Fast"],
      cost: ["Expensive"],
      tags: ["test"],
      baseMetrics: [{ id: "latency", value: "low" as const, numericValue: 3, category: "performance" }],
      configVariants: [{ id: "default", name: "Default", metrics: [{ id: "latency", value: "low" as const, numericValue: 3, category: "performance" }] }],
    }))

    await seedToFirestore(db, components)

    // 501 components + 1 metadata = 502 ops → 2 batches (500 + 2)
    expect(mocks.batchFn).toHaveBeenCalledTimes(2)
    expect(mocks.commitFn).toHaveBeenCalledTimes(2)
    // Total set calls: 501 components + 1 metadata = 502
    expect(mocks.setFn).toHaveBeenCalledTimes(502)

    // Verify batch split: first batch gets 500 component ops, second gets 1 component + 1 metadata
    const consoleSpy = vi.spyOn(console, "log")
    await seedToFirestore(db, components)
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Batch 1/2 committed (500 operations)"))
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Batch 2/2 committed (2 operations)"))
    consoleSpy.mockRestore()
  })

  it("includes metadata in chunk accounting (499 components fits in 1 batch)", async () => {
    const { db, mocks } = createMockDb()
    const components = Array.from({ length: 499 }, (_, i) => ({
      id: `comp-${i}`,
      name: `Component ${i}`,
      category: "data-storage",
      description: `Desc ${i}`,
      is: `Is ${i}`,
      gain: ["Fast"],
      cost: ["Expensive"],
      tags: ["test"],
      baseMetrics: [{ id: "latency", value: "low" as const, numericValue: 3, category: "performance" }],
      configVariants: [{ id: "default", name: "Default", metrics: [{ id: "latency", value: "low" as const, numericValue: 3, category: "performance" }] }],
    }))

    await seedToFirestore(db, components)

    // 499 + 1 metadata = 500 → exactly 1 batch
    expect(mocks.batchFn).toHaveBeenCalledTimes(1)
    expect(mocks.setFn).toHaveBeenCalledTimes(500)
    expect(mocks.commitFn).toHaveBeenCalledTimes(1)
  })

  it("handles exactly 500 components (metadata forces 2nd batch)", async () => {
    const { db, mocks } = createMockDb()
    const components = Array.from({ length: 500 }, (_, i) => ({
      id: `comp-${i}`,
      name: `Component ${i}`,
      category: "data-storage",
      description: `Desc ${i}`,
      is: `Is ${i}`,
      gain: ["Fast"],
      cost: ["Expensive"],
      tags: ["test"],
      baseMetrics: [{ id: "latency", value: "low" as const, numericValue: 3, category: "performance" }],
      configVariants: [{ id: "default", name: "Default", metrics: [{ id: "latency", value: "low" as const, numericValue: 3, category: "performance" }] }],
    }))

    await seedToFirestore(db, components)

    // 500 components + 1 metadata = 501 ops → 2 batches (499 + 2)
    expect(mocks.batchFn).toHaveBeenCalledTimes(2)
    expect(mocks.commitFn).toHaveBeenCalledTimes(2)
    expect(mocks.setFn).toHaveBeenCalledTimes(501)
  })

  it("logs chunk progress", async () => {
    const consoleSpy = vi.spyOn(console, "log")
    const { db } = createMockDb()
    const components = Array.from({ length: 2 }, (_, i) => ({
      id: `comp-${i}`,
      name: `Component ${i}`,
      category: "data-storage",
      description: `Desc ${i}`,
      is: `Is ${i}`,
      gain: ["Fast"],
      cost: ["Expensive"],
      tags: ["test"],
      baseMetrics: [{ id: "latency", value: "low" as const, numericValue: 3, category: "performance" }],
      configVariants: [{ id: "default", name: "Default", metrics: [{ id: "latency", value: "low" as const, numericValue: 3, category: "performance" }] }],
    }))

    await seedToFirestore(db, components)

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Batch 1/1 committed"))
    consoleSpy.mockRestore()
  })

  it("writes metadata document in the last batch", async () => {
    const { db, mocks } = createMockDb()
    const components = Array.from({ length: 1 }, (_, i) => ({
      id: `comp-${i}`,
      name: `Component ${i}`,
      category: "data-storage",
      description: `Desc ${i}`,
      is: `Is ${i}`,
      gain: ["Fast"],
      cost: ["Expensive"],
      tags: ["test"],
      baseMetrics: [{ id: "latency", value: "low" as const, numericValue: 3, category: "performance" }],
      configVariants: [{ id: "default", name: "Default", metrics: [{ id: "latency", value: "low" as const, numericValue: 3, category: "performance" }] }],
    }))

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
})

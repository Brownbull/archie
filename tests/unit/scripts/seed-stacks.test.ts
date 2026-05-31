import { describe, it, expect, vi, beforeEach } from "vitest"
import "./seed-mocks"
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs"
import {
  loadAndValidateStacks,
  validateStackReferences,
  computeStackTradeOffProfile,
  seedStacksToFirestore,
} from "../../../scripts/seed-firestore"
import {
  createMockDb,
  makeComponent,
  makeStack,
  makeStackYaml,
  noopLogger,
  mockDirEntries,
  mockStatResult,
  assertFailFastBehavior,
} from "./seed-helpers"
import type { Component } from "@/schemas/componentSchema"

beforeEach(() => {
  vi.resetAllMocks()
})

describe("loadAndValidateStacks", () => {
  it("loads and validates stack YAML files (profile defaults to [])", () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readdirSync).mockReturnValue(mockDirEntries("s1.yaml", "s2.yaml"))
    vi.mocked(statSync).mockReturnValue(mockStatResult(500))
    vi.mocked(readFileSync).mockImplementation((p) =>
      makeStackYaml(String(p).includes("s1") ? "stack-one" : "stack-two"),
    )

    const stacks = loadAndValidateStacks("/fake/stacks", noopLogger)

    expect(stacks).toHaveLength(2)
    expect(stacks.map((s) => s.id).sort()).toEqual(["stack-one", "stack-two"])
    expect(stacks[0].tradeOffProfile).toEqual([])
  })

  it("returns [] (warns) when the directory is missing", () => {
    vi.mocked(existsSync).mockReturnValue(false)
    const warn = vi.fn()

    const stacks = loadAndValidateStacks("/missing", { log: vi.fn(), warn, error: vi.fn() })

    expect(stacks).toEqual([])
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("not found"))
  })

  it("returns [] when the directory has no YAML files", () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readdirSync).mockReturnValue(mockDirEntries())

    expect(loadAndValidateStacks("/empty", noopLogger)).toEqual([])
  })

  it("throws and returns no partial result on invalid YAML (fail-fast)", () => {
    vi.mocked(existsSync).mockReturnValue(true)
    assertFailFastBehavior(
      (dir, logger) => loadAndValidateStacks(dir, logger),
      makeStackYaml("good-stack"),
      "id: bad-stack\nname: Bad\n", // missing required components/connections
    )
  })
})

describe("validateStackReferences", () => {
  it("returns 0 when all component/variant references resolve", () => {
    const components = [makeComponent("comp-a"), makeComponent("comp-b")]
    expect(validateStackReferences([makeStack("s1")], components, noopLogger)).toBe(0)
  })

  it("warns on an unknown component id", () => {
    const components = [makeComponent("comp-a")] // comp-b missing
    const warn = vi.fn()

    const n = validateStackReferences([makeStack("s1")], components, { log: vi.fn(), warn, error: vi.fn() })

    expect(n).toBe(1)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("unknown component 'comp-b'"))
  })

  it("warns on an unknown variant id", () => {
    const components = [makeComponent("comp-a"), makeComponent("comp-b")]
    const stack = makeStack("s1", {
      components: [
        { componentId: "comp-a", variantId: "nope", relativePosition: { x: 0, y: 0 } },
        { componentId: "comp-b", variantId: "default", relativePosition: { x: 240, y: 0 } },
      ],
    })
    const warn = vi.fn()

    const n = validateStackReferences([stack], components, { log: vi.fn(), warn, error: vi.fn() })

    expect(n).toBe(1)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("unknown variant 'nope'"))
  })
})

describe("computeStackTradeOffProfile", () => {
  it("averages metric numericValues per category", () => {
    const components = [makeComponent("comp-a"), makeComponent("comp-b")]
    const profile = computeStackTradeOffProfile(makeStack("s1"), components)
    const perf = profile.find((p) => p.categoryId === "performance")

    expect(perf).toMatchObject({ score: 3, metricCount: 2, hasData: true })
  })

  it("only includes categories that have data", () => {
    const components = [makeComponent("comp-a"), makeComponent("comp-b")]
    const profile = computeStackTradeOffProfile(makeStack("s1"), components)

    // makeComponent only carries a 'performance' metric
    expect(profile.map((p) => p.categoryId)).toEqual(["performance"])
  })

  it("lets the active variant's metrics override base metrics by id", () => {
    const comp: Component = {
      ...makeComponent("comp-a"),
      baseMetrics: [{ id: "latency", value: "high" as const, numericValue: 9, category: "performance" }],
      configVariants: [
        { id: "fast", name: "Fast", metrics: [{ id: "latency", value: "low" as const, numericValue: 1, category: "performance" }] },
      ],
    }
    const stack = makeStack("s1", {
      components: [{ componentId: "comp-a", variantId: "fast", relativePosition: { x: 0, y: 0 } }],
      connections: [],
    })

    const profile = computeStackTradeOffProfile(stack, [comp])
    expect(profile.find((p) => p.categoryId === "performance")!.score).toBe(1)
  })

  it("skips unknown components", () => {
    const stack = makeStack("s1", {
      components: [{ componentId: "ghost", variantId: "default", relativePosition: { x: 0, y: 0 } }],
      connections: [],
    })
    expect(computeStackTradeOffProfile(stack, [])).toEqual([])
  })
})

describe("seedStacksToFirestore", () => {
  it("writes each stack to the 'stacks' collection by id", async () => {
    const { db, mocks } = createMockDb()
    const components = [makeComponent("comp-a"), makeComponent("comp-b")]

    const n = await seedStacksToFirestore(db, [makeStack("s1"), makeStack("s2")], components, noopLogger)

    expect(n).toBe(2)
    expect(mocks.collectionFn).toHaveBeenCalledWith("stacks")
    expect(mocks.docFn).toHaveBeenCalledWith("s1")
    expect(mocks.docFn).toHaveBeenCalledWith("s2")
    expect(mocks.commitFn).toHaveBeenCalled()
  })

  it("computes the trade-off profile when the stack carries none", async () => {
    const { db, mocks } = createMockDb()
    const components = [makeComponent("comp-a"), makeComponent("comp-b")]

    await seedStacksToFirestore(db, [makeStack("s1")], components, noopLogger)

    const written = mocks.setFn.mock.calls[0][1] as { tradeOffProfile: Array<{ categoryId: string }> }
    expect(written.tradeOffProfile.length).toBeGreaterThan(0)
    expect(written.tradeOffProfile[0].categoryId).toBe("performance")
  })

  it("preserves an explicitly authored trade-off profile", async () => {
    const { db, mocks } = createMockDb()
    const explicit = [{ categoryId: "performance" as const, categoryName: "Performance", score: 7, metricCount: 1, hasData: true }]

    await seedStacksToFirestore(db, [makeStack("s1", { tradeOffProfile: explicit })], [], noopLogger)

    const written = mocks.setFn.mock.calls[0][1] as { tradeOffProfile: unknown }
    expect(written.tradeOffProfile).toEqual(explicit)
  })

  it("returns 0 and writes nothing for an empty array", async () => {
    const { db, mocks } = createMockDb()

    const n = await seedStacksToFirestore(db, [], [], noopLogger)

    expect(n).toBe(0)
    expect(mocks.commitFn).not.toHaveBeenCalled()
  })
})

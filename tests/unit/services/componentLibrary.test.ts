import { describe, it, expect, vi, beforeEach } from "vitest"
import type { Component } from "@/schemas/componentSchema"
import type { BlueprintFull } from "@/schemas/blueprintSchema"
import type { MetricCategory } from "@/schemas/metricCategorySchema"

const { mockComponentRepo, mockStackRepo, mockBlueprintRepo, mockMetricCategoryRepo } = vi.hoisted(() => ({
  mockComponentRepo: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getByCategory: vi.fn(),
  },
  mockStackRepo: {
    getAll: vi.fn(),
  },
  mockBlueprintRepo: {
    getAll: vi.fn(),
  },
  mockMetricCategoryRepo: {
    getAll: vi.fn(),
  },
}))

vi.mock("@/repositories/componentRepository", () => ({
  componentRepository: mockComponentRepo,
}))

vi.mock("@/repositories/stackRepository", () => ({
  stackRepository: mockStackRepo,
}))

vi.mock("@/repositories/blueprintRepository", () => ({
  blueprintRepository: mockBlueprintRepo,
}))

vi.mock("@/repositories/metricCategoryRepository", () => ({
  metricCategoryRepository: mockMetricCategoryRepo,
}))

import { componentLibrary } from "@/services/componentLibrary"

const mockComponent: Component = {
  id: "postgresql",
  name: "PostgreSQL",
  category: "data-storage",
  description: "Relational database",
  is: "An open-source relational database",
  gain: ["ACID compliance"],
  cost: ["Higher memory"],
  tags: ["database", "sql"],
  baseMetrics: [{ id: "latency", value: "medium", numericValue: 5, category: "performance" }],
  configVariants: [
    { id: "default", name: "Default", metrics: [{ id: "latency", value: "low", numericValue: 3, category: "performance" }] },
  ],
}

const mockComponent2: Component = {
  id: "redis",
  name: "Redis",
  category: "caching",
  description: "In-memory data store",
  is: "A fast in-memory key-value store",
  gain: ["Sub-millisecond latency"],
  cost: ["Memory-bound"],
  tags: ["cache", "nosql"],
  baseMetrics: [{ id: "latency", value: "low", numericValue: 2, category: "performance" }],
  configVariants: [
    { id: "default", name: "Default", metrics: [{ id: "latency", value: "low", numericValue: 2, category: "performance" }] },
  ],
}

describe("componentLibrary", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    componentLibrary.reset()
    mockComponentRepo.getAll.mockResolvedValue([mockComponent, mockComponent2])
    mockStackRepo.getAll.mockResolvedValue([])
    mockBlueprintRepo.getAll.mockResolvedValue([])
    mockMetricCategoryRepo.getAll.mockResolvedValue([])
  })

  it("isInitialized returns false before init", () => {
    expect(componentLibrary.isInitialized()).toBe(false)
  })

  it("isInitialized returns true after init", async () => {
    await componentLibrary.initialize()
    expect(componentLibrary.isInitialized()).toBe(true)
  })

  it("initialize populates data from repositories", async () => {
    await componentLibrary.initialize()
    expect(mockComponentRepo.getAll).toHaveBeenCalledTimes(1)
    expect(componentLibrary.getAllComponents()).toHaveLength(2)
  })

  it("getComponent returns correct component by ID", async () => {
    await componentLibrary.initialize()
    const comp = componentLibrary.getComponent("postgresql")
    expect(comp?.name).toBe("PostgreSQL")
  })

  it("getComponent returns undefined for unknown ID", async () => {
    await componentLibrary.initialize()
    expect(componentLibrary.getComponent("nonexistent")).toBeUndefined()
  })

  it("getComponentsByCategory returns correct subset", async () => {
    await componentLibrary.initialize()
    const storage = componentLibrary.getComponentsByCategory("data-storage")
    expect(storage).toHaveLength(1)
    expect(storage[0].id).toBe("postgresql")
  })

  it("getComponentsByCategory returns empty for unknown category", async () => {
    await componentLibrary.initialize()
    expect(componentLibrary.getComponentsByCategory("unknown")).toEqual([])
  })

  it("searchComponents matches by name (case-insensitive)", async () => {
    await componentLibrary.initialize()
    const results = componentLibrary.searchComponents("postgres")
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe("postgresql")
  })

  it("searchComponents matches by tag", async () => {
    await componentLibrary.initialize()
    const results = componentLibrary.searchComponents("nosql")
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe("redis")
  })

  it("searchComponents returns empty for no matches", async () => {
    await componentLibrary.initialize()
    expect(componentLibrary.searchComponents("graphql")).toEqual([])
  })

  it("double initialize does not duplicate data", async () => {
    await componentLibrary.initialize()
    await componentLibrary.initialize()
    expect(mockComponentRepo.getAll).toHaveBeenCalledTimes(1)
    expect(componentLibrary.getAllComponents()).toHaveLength(2)
  })

  it("reset clears state", async () => {
    await componentLibrary.initialize()
    expect(componentLibrary.isInitialized()).toBe(true)
    componentLibrary.reset()
    expect(componentLibrary.isInitialized()).toBe(false)
    expect(componentLibrary.getAllComponents()).toEqual([])
  })

  it("getStacks returns stacks from repository", async () => {
    const mockStacks = [{ id: "mean", name: "MEAN Stack", components: ["mongodb", "express", "angular", "node"], description: "Full-stack JS", tags: ["javascript"], baseMetrics: [], configVariants: [{ id: "default", name: "Default", componentOverrides: {} }] }]
    mockStackRepo.getAll.mockResolvedValue(mockStacks)
    await componentLibrary.initialize()
    expect(componentLibrary.getStacks()).toEqual(mockStacks)
  })

  it("getBlueprints returns blueprints from repository", async () => {
    const mockBlueprints = [{ id: "chat-app", name: "Chat App", description: "WhatsApp-like", tags: ["messaging"], components: [], connections: [], positions: {} }]
    mockBlueprintRepo.getAll.mockResolvedValue(mockBlueprints)
    await componentLibrary.initialize()
    expect(componentLibrary.getBlueprints()).toEqual(mockBlueprints)
  })

  it("getAllBlueprints returns all blueprints with skeleton from repository", async () => {
    const mockBlueprintFull: BlueprintFull = {
      id: "whatsapp-messaging",
      name: "WhatsApp-style Messaging",
      description: "High-throughput messaging",
      skeleton: { schemaVersion: "1.0.0", nodes: [], edges: [] },
    }
    mockBlueprintRepo.getAll.mockResolvedValue([mockBlueprintFull])
    await componentLibrary.initialize()
    const result = componentLibrary.getAllBlueprints()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("whatsapp-messaging")
  })

  it("getBlueprint returns correct blueprint by ID", async () => {
    const mockBlueprintFull: BlueprintFull = {
      id: "whatsapp-messaging",
      name: "WhatsApp-style Messaging",
      description: "High-throughput messaging",
      skeleton: { schemaVersion: "1.0.0", nodes: [], edges: [] },
    }
    mockBlueprintRepo.getAll.mockResolvedValue([mockBlueprintFull])
    await componentLibrary.initialize()
    const bp = componentLibrary.getBlueprint("whatsapp-messaging")
    expect(bp?.name).toBe("WhatsApp-style Messaging")
    expect(bp?.skeleton.schemaVersion).toBe("1.0.0")
  })

  it("getBlueprint returns undefined for unknown ID", async () => {
    const mockBlueprintFull: BlueprintFull = {
      id: "whatsapp-messaging",
      name: "WhatsApp-style Messaging",
      description: "High-throughput messaging",
      skeleton: { schemaVersion: "1.0.0", nodes: [], edges: [] },
    }
    mockBlueprintRepo.getAll.mockResolvedValue([mockBlueprintFull])
    await componentLibrary.initialize()
    expect(componentLibrary.getBlueprint("nonexistent")).toBeUndefined()
  })

  it("getAllBlueprints returns empty array before initialization", () => {
    expect(componentLibrary.getAllBlueprints()).toEqual([])
  })

  it("allows retry after initialization failure", async () => {
    mockComponentRepo.getAll.mockRejectedValueOnce(new Error("Network error"))
    await expect(componentLibrary.initialize()).rejects.toThrow("Network error")
    expect(componentLibrary.isInitialized()).toBe(false)

    // Retry should work after failure
    mockComponentRepo.getAll.mockResolvedValue([mockComponent])
    await componentLibrary.initialize()
    expect(componentLibrary.isInitialized()).toBe(true)
    expect(componentLibrary.getAllComponents()).toHaveLength(1)
  })

  it("searchComponents matches by category", async () => {
    await componentLibrary.initialize()
    const results = componentLibrary.searchComponents("caching")
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe("redis")
  })

  describe("metricCategories", () => {
    const mockMetricCategories: MetricCategory[] = [
      {
        id: "performance",
        name: "Performance",
        description: "Measures response times",
        whyItMatters: "Performance matters",
        icon: "Gauge",
        scoreInterpretations: [
          { minScore: 0, maxScore: 3.99, text: "Critical" },
          { minScore: 4, maxScore: 6.99, text: "Moderate" },
          { minScore: 7, maxScore: 10, text: "Strong" },
        ],
      },
      {
        id: "reliability",
        name: "Reliability",
        description: "Measures uptime",
        whyItMatters: "Reliability matters",
        icon: "ShieldCheck",
        scoreInterpretations: [
          { minScore: 0, maxScore: 3.99, text: "Critical" },
          { minScore: 4, maxScore: 6.99, text: "Moderate" },
          { minScore: 7, maxScore: 10, text: "Strong" },
        ],
      },
    ]

    it("initialize caches metricCategories from repository", async () => {
      mockMetricCategoryRepo.getAll.mockResolvedValue(mockMetricCategories)
      await componentLibrary.initialize()
      expect(mockMetricCategoryRepo.getAll).toHaveBeenCalledTimes(1)
      expect(componentLibrary.getAllMetricCategories()).toHaveLength(2)
    })

    it("getMetricCategory returns correct category by ID", async () => {
      mockMetricCategoryRepo.getAll.mockResolvedValue(mockMetricCategories)
      await componentLibrary.initialize()
      const cat = componentLibrary.getMetricCategory("performance")
      expect(cat?.name).toBe("Performance")
      expect(cat?.scoreInterpretations).toHaveLength(3)
    })

    it("getMetricCategory returns undefined for unknown ID", async () => {
      mockMetricCategoryRepo.getAll.mockResolvedValue(mockMetricCategories)
      await componentLibrary.initialize()
      expect(componentLibrary.getMetricCategory("nonexistent")).toBeUndefined()
    })

    it("reset clears metricCategories", async () => {
      mockMetricCategoryRepo.getAll.mockResolvedValue(mockMetricCategories)
      await componentLibrary.initialize()
      expect(componentLibrary.getAllMetricCategories()).toHaveLength(2)
      componentLibrary.reset()
      expect(componentLibrary.getAllMetricCategories()).toEqual([])
    })

    it("getAllMetricCategories returns empty array before initialization", () => {
      expect(componentLibrary.getAllMetricCategories()).toEqual([])
    })
  })
})

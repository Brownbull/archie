import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockGetDocs, mockCollection } = vi.hoisted(() => ({
  mockGetDocs: vi.fn(),
  mockCollection: vi.fn(),
}))

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}))

vi.mock("@/lib/firebase", () => ({
  db: {},
}))

import { metricCategoryRepository } from "@/repositories/metricCategoryRepository"
import { RepositoryError } from "@/repositories/metricCategoryRepository"

const validCategory = {
  id: "performance",
  name: "Performance",
  description: "Measures response times, throughput, and resource utilization.",
  whyItMatters: "Performance directly impacts user experience and operational cost.",
  icon: "Gauge",
  scoreInterpretations: [
    { minScore: 0, maxScore: 3.99, text: "Critical" },
    { minScore: 4, maxScore: 6.99, text: "Moderate" },
    { minScore: 7, maxScore: 10, text: "Strong" },
  ],
}

function createMockDoc(id: string, data: Record<string, unknown>) {
  return { id, data: () => data, exists: () => true }
}

function createMockSnapshot(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    docs: docs.map((d) => createMockDoc(d.id, d.data)),
    empty: docs.length === 0,
  }
}

describe("metricCategoryRepository", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockCollection.mockReturnValue("metricCategories-ref")
  })

  describe("getAll", () => {
    it("returns validated categories from Firestore", async () => {
      mockGetDocs.mockResolvedValue(createMockSnapshot([
        { id: "performance", data: validCategory },
      ]))

      const result = await metricCategoryRepository.getAll()
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe("performance")
      expect(result[0].name).toBe("Performance")
    })

    it("filters out invalid documents", async () => {
      mockGetDocs.mockResolvedValue(createMockSnapshot([
        { id: "performance", data: validCategory },
        { id: "bad", data: { id: "bad" } },
      ]))

      const result = await metricCategoryRepository.getAll()
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe("performance")
    })

    it("throws RepositoryError on Firestore getDocs failure", async () => {
      mockGetDocs.mockRejectedValue(new Error("Firestore unavailable"))

      await expect(metricCategoryRepository.getAll()).rejects.toThrow(RepositoryError)
      await expect(metricCategoryRepository.getAll()).rejects.toThrow(
        "Failed to fetch metricCategories from Firestore",
      )
    })

    it("RepositoryError wraps the original cause", async () => {
      const originalError = new Error("Firestore unavailable")
      mockGetDocs.mockRejectedValue(originalError)

      try {
        await metricCategoryRepository.getAll()
        expect.fail("Should have thrown")
      } catch (err) {
        expect(err).toBeInstanceOf(RepositoryError)
        expect((err as RepositoryError).cause).toBe(originalError)
      }
    })

    it("returns empty array when collection is empty", async () => {
      mockGetDocs.mockResolvedValue(createMockSnapshot([]))

      const result = await metricCategoryRepository.getAll()
      expect(result).toEqual([])
    })
  })
})

import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockGetDocs, mockGetDoc, mockCollection, mockDoc, mockQuery, mockWhere } = vi.hoisted(() => ({
  mockGetDocs: vi.fn(),
  mockGetDoc: vi.fn(),
  mockCollection: vi.fn(),
  mockDoc: vi.fn(),
  mockQuery: vi.fn(),
  mockWhere: vi.fn(),
}))

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
}))

vi.mock("@/lib/firebase", () => ({
  db: {},
}))

import { componentRepository } from "@/repositories/componentRepository"

const validComponent = {
  id: "postgresql",
  name: "PostgreSQL",
  category: "data-storage",
  description: "Relational database",
  is: "An open-source relational database",
  gain: ["ACID compliance"],
  cost: ["Higher memory"],
  tags: ["database"],
  baseMetrics: [{ id: "latency", value: "medium", numericValue: 5, category: "performance" }],
  configVariants: [
    { id: "default", name: "Default", metrics: [{ id: "latency", value: "low", numericValue: 3, category: "performance" }] },
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

describe("componentRepository", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockCollection.mockReturnValue("components-ref")
    mockQuery.mockReturnValue("query-ref")
    mockWhere.mockReturnValue("where-clause")
  })

  describe("getAll", () => {
    it("returns validated components from Firestore", async () => {
      mockGetDocs.mockResolvedValue(createMockSnapshot([
        { id: "postgresql", data: validComponent },
      ]))

      const result = await componentRepository.getAll()
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe("postgresql")
      expect(result[0].name).toBe("PostgreSQL")
    })

    it("filters out invalid documents", async () => {
      mockGetDocs.mockResolvedValue(createMockSnapshot([
        { id: "postgresql", data: validComponent },
        { id: "bad", data: { id: "bad" } }, // Missing required fields
      ]))

      const result = await componentRepository.getAll()
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe("postgresql")
    })

    it("throws on Firestore error", async () => {
      mockGetDocs.mockRejectedValue(new Error("Firestore unavailable"))

      await expect(componentRepository.getAll()).rejects.toThrow("Firestore unavailable")
    })

    it("returns empty array when collection is empty", async () => {
      mockGetDocs.mockResolvedValue(createMockSnapshot([]))

      const result = await componentRepository.getAll()
      expect(result).toEqual([])
    })
  })

  describe("getById", () => {
    it("returns a validated component by ID", async () => {
      mockGetDoc.mockResolvedValue(createMockDoc("postgresql", validComponent))

      const result = await componentRepository.getById("postgresql")
      expect(result).not.toBeNull()
      expect(result?.id).toBe("postgresql")
    })

    it("returns null for non-existent document", async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false, data: () => null })

      const result = await componentRepository.getById("nonexistent")
      expect(result).toBeNull()
    })

    it("returns null for invalid document data", async () => {
      mockGetDoc.mockResolvedValue(createMockDoc("bad", { id: "bad" }))

      const result = await componentRepository.getById("bad")
      expect(result).toBeNull()
    })

    it("throws on Firestore error", async () => {
      mockGetDoc.mockRejectedValue(new Error("Firestore unavailable"))

      await expect(componentRepository.getById("postgresql")).rejects.toThrow("Firestore unavailable")
    })
  })

  describe("getByCategory", () => {
    it("returns components filtered by category", async () => {
      mockGetDocs.mockResolvedValue(createMockSnapshot([
        { id: "postgresql", data: validComponent },
      ]))

      const result = await componentRepository.getByCategory("data-storage")
      expect(result).toHaveLength(1)
      expect(mockWhere).toHaveBeenCalledWith("category", "==", "data-storage")
    })

    it("throws on Firestore error", async () => {
      mockGetDocs.mockRejectedValue(new Error("Firestore unavailable"))

      await expect(componentRepository.getByCategory("data-storage")).rejects.toThrow("Firestore unavailable")
    })
  })
})

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

import { stackRepository } from "@/repositories/stackRepository"

const validStack = {
  id: "mean-stack",
  name: "MEAN Stack",
  description: "MongoDB, Express, Angular, Node.js",
  componentIds: ["mongodb", "node-express"],
  tags: ["fullstack"],
}

function createMockSnapshot(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    docs: docs.map((d) => ({ id: d.id, data: () => d.data, exists: () => true })),
    empty: docs.length === 0,
  }
}

describe("stackRepository", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockCollection.mockReturnValue("stacks-ref")
  })

  describe("getAll", () => {
    it("returns validated stacks", async () => {
      mockGetDocs.mockResolvedValue(createMockSnapshot([{ id: "mean-stack", data: validStack }]))

      const result = await stackRepository.getAll()
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe("MEAN Stack")
    })

    it("filters out invalid documents", async () => {
      mockGetDocs.mockResolvedValue(createMockSnapshot([
        { id: "mean-stack", data: validStack },
        { id: "bad", data: { id: "bad" } },
      ]))

      const result = await stackRepository.getAll()
      expect(result).toHaveLength(1)
    })

    it("throws on Firestore error", async () => {
      mockGetDocs.mockRejectedValue(new Error("Firestore error"))

      await expect(stackRepository.getAll()).rejects.toThrow("Firestore error")
    })
  })
})

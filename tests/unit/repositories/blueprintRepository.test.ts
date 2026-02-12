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

import { blueprintRepository } from "@/repositories/blueprintRepository"

const validBlueprint = {
  id: "whatsapp-clone",
  name: "WhatsApp Clone",
  description: "A messaging app architecture",
}

function createMockSnapshot(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    docs: docs.map((d) => ({ id: d.id, data: () => d.data, exists: () => true })),
    empty: docs.length === 0,
  }
}

describe("blueprintRepository", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockCollection.mockReturnValue("blueprints-ref")
  })

  describe("getAll", () => {
    it("returns validated blueprints", async () => {
      mockGetDocs.mockResolvedValue(createMockSnapshot([{ id: "whatsapp-clone", data: validBlueprint }]))

      const result = await blueprintRepository.getAll()
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe("WhatsApp Clone")
    })

    it("filters out invalid documents", async () => {
      mockGetDocs.mockResolvedValue(createMockSnapshot([
        { id: "whatsapp-clone", data: validBlueprint },
        { id: "bad", data: { id: "bad" } },
      ]))

      const result = await blueprintRepository.getAll()
      expect(result).toHaveLength(1)
    })

    it("throws on Firestore error", async () => {
      mockGetDocs.mockRejectedValue(new Error("Firestore error"))

      await expect(blueprintRepository.getAll()).rejects.toThrow("Firestore error")
    })
  })
})

import { describe, it, expect } from "vitest"
import { ComponentSchema, ComponentYamlSchema } from "@/schemas/componentSchema"

// D14: the RUNTIME reader (ComponentSchema, used to validate Firestore docs) must be
// forward-compatible — an already-deployed older reader must tolerate a re-seed that added a
// new field, rather than rejecting every doc (which briefly broke prod during P5's typeId
// re-seed). The YAML authoring schema stays strict so typos are still caught at seed time.

const validComponent = {
  id: "postgresql",
  name: "PostgreSQL",
  category: "data-storage",
  typeId: "relational-db",
  description: "Relational database management system",
  is: "An advanced open-source relational database",
  gain: ["ACID compliance"],
  cost: ["Higher memory usage"],
  tags: ["database", "sql"],
  baseMetrics: [{ id: "latency", value: "medium" as const, numericValue: 5, category: "performance" }],
  configVariants: [{ id: "standard", name: "Standard", metrics: [] }],
}

describe("ComponentSchema forward-compatibility (D14)", () => {
  it("accepts a doc carrying an unknown future top-level field, and strips it", () => {
    const result = ComponentSchema.safeParse({ ...validComponent, futureFieldV7: { x: 1 } })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe("postgresql")
      expect((result.data as Record<string, unknown>).futureFieldV7).toBeUndefined()
    }
  })

  it("still enforces required fields + types on known fields", () => {
    const { id: _omit, ...missingId } = validComponent
    expect(ComponentSchema.safeParse(missingId).success).toBe(false)
    expect(ComponentSchema.safeParse({ ...validComponent, gain: "not-an-array" }).success).toBe(false)
  })

  it("keeps the YAML authoring schema strict (rejects unknown keys to catch typos)", () => {
    const yamlDoc = {
      id: "x",
      name: "X",
      category: "data-storage",
      description: "d",
      is: "i",
      gain: ["g"],
      cost: ["c"],
      tags: [],
      base_metrics: [],
      config_variants: [{ id: "v", name: "V", metrics: [] }],
      typoo_field: true,
    }
    expect(ComponentYamlSchema.safeParse(yamlDoc).success).toBe(false)
  })
})

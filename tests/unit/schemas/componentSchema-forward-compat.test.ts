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

describe("nested ConfigVariant forward-compatibility (Phase 3 S1 — the P5-class trap fix)", () => {
  it("accepts a doc whose VARIANT carries an unknown future field, and strips it", () => {
    // Pre-S1, the nested .strict() made this drop the WHOLE component (variant fails → doc fails) —
    // a reseed adding any variant field would have emptied the library on deployed readers.
    const result = ComponentSchema.safeParse({
      ...validComponent,
      configVariants: [{ id: "standard", name: "Standard", metrics: [], futureVariantFieldV8: 42 }],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data.configVariants[0] as Record<string, unknown>).futureVariantFieldV8).toBeUndefined()
    }
  })

  it("parses the Phase-3 fields when present (description + https docsUrl)", () => {
    const result = ComponentSchema.safeParse({
      ...validComponent,
      configVariants: [{ id: "standard", name: "Standard", metrics: [], description: "Single node — cheap, no failover.", docsUrl: "https://example.com/docs" }],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.configVariants[0].description).toBe("Single node — cheap, no failover.")
      expect(result.data.configVariants[0].docsUrl).toBe("https://example.com/docs")
    }
  })

  it("rejects a non-https docsUrl (http and javascript: URIs never reach an href)", () => {
    for (const bad of ["http://example.com/docs", "javascript:alert(1)"]) {
      const result = ComponentSchema.safeParse({
        ...validComponent,
        configVariants: [{ id: "standard", name: "Standard", metrics: [], docsUrl: bad }],
      })
      expect(result.success, `${bad} must be rejected`).toBe(false)
    }
  })

  it("YAML schema maps docs_url → docsUrl and enforces https + the 240-char description cap", () => {
    const yamlVariant = { id: "standard", name: "Standard", metrics: [], description: "Tier meaning.", docs_url: "https://example.com/d" }
    const yamlDoc = {
      id: "x", name: "X", category: "compute", description: "d", is: "i",
      gain: ["g"], cost: ["c"], tags: [], base_metrics: [],
      config_variants: [yamlVariant],
    }
    const ok = ComponentYamlSchema.safeParse(yamlDoc)
    expect(ok.success).toBe(true)
    if (ok.success) expect(ok.data.configVariants[0].docsUrl).toBe("https://example.com/d")

    expect(ComponentYamlSchema.safeParse({
      ...yamlDoc,
      config_variants: [{ ...yamlVariant, docs_url: "http://example.com" }],
    }).success).toBe(false)
    expect(ComponentYamlSchema.safeParse({
      ...yamlDoc,
      config_variants: [{ ...yamlVariant, description: "x".repeat(241) }],
    }).success).toBe(false)
  })
})

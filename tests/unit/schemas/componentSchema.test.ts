import { describe, it, expect } from "vitest"
import {
  ComponentSchema,
  ConfigVariantSchema,
  ConnectionPropertiesSchema,
  ComponentYamlSchema,
  CodeSnippetSchema,
  MAX_REASON_LENGTH,
  MAX_FACTOR_LENGTH,
  MAX_LANGUAGE_LENGTH,
  MAX_CODE_LENGTH,
} from "@/schemas/componentSchema"

const validVariant = {
  id: "default",
  name: "Default Configuration",
  metrics: [
    { id: "latency", value: "low" as const, numericValue: 3, category: "performance" },
  ],
}

const validComponent = {
  id: "postgresql",
  name: "PostgreSQL",
  category: "data-storage",
  description: "Relational database management system",
  is: "An advanced open-source relational database",
  gain: ["ACID compliance", "Extensible with plugins"],
  cost: ["Higher memory usage", "Complex configuration"],
  tags: ["database", "sql", "relational"],
  baseMetrics: [
    { id: "latency", value: "medium" as const, numericValue: 5, category: "performance" },
  ],
  configVariants: [validVariant],
}

describe("ConfigVariantSchema", () => {
  it("accepts valid variant", () => {
    const result = ConfigVariantSchema.safeParse(validVariant)
    expect(result.success).toBe(true)
  })

  it("accepts variant with optional codeSnippet", () => {
    const result = ConfigVariantSchema.safeParse({
      ...validVariant,
      codeSnippet: { language: "sql", code: "SELECT 1;" },
    })
    expect(result.success).toBe(true)
  })

  it("accepts variant with optional metricExplanations", () => {
    const result = ConfigVariantSchema.safeParse({
      ...validVariant,
      metricExplanations: {
        latency: { reason: "Connection pooling reduces overhead", contributingFactors: ["pooling"] },
      },
    })
    expect(result.success).toBe(true)
  })

  it("rejects variant without metrics", () => {
    const { metrics: _metrics, ...withoutMetrics } = validVariant
    const result = ConfigVariantSchema.safeParse(withoutMetrics)
    expect(result.success).toBe(false)
  })

  it("rejects metricExplanation reason exceeding max length with too_big error code", () => {
    const result = ConfigVariantSchema.safeParse({
      ...validVariant,
      metricExplanations: {
        latency: {
          reason: "a".repeat(MAX_REASON_LENGTH + 1),
          contributingFactors: ["pooling"],
        },
      },
    })
    expect(result.success).toBe(false)
    expect(result.success ? null : result.error.issues[0].code).toBe("too_big")
  })

  it("rejects metricExplanation contributingFactor item exceeding max length with too_big error code", () => {
    const result = ConfigVariantSchema.safeParse({
      ...validVariant,
      metricExplanations: {
        latency: {
          reason: "Valid reason",
          contributingFactors: ["a".repeat(MAX_FACTOR_LENGTH + 1)],
        },
      },
    })
    expect(result.success).toBe(false)
    expect(result.success ? null : result.error.issues[0].code).toBe("too_big")
  })

  it("accepts metricExplanation reason at exactly max length", () => {
    const result = ConfigVariantSchema.safeParse({
      ...validVariant,
      metricExplanations: {
        latency: {
          reason: "a".repeat(MAX_REASON_LENGTH),
          contributingFactors: ["pooling"],
        },
      },
    })
    expect(result.success).toBe(true)
  })

  it("accepts metricExplanation contributingFactor item at exactly max length", () => {
    const result = ConfigVariantSchema.safeParse({
      ...validVariant,
      metricExplanations: {
        latency: {
          reason: "Valid reason",
          contributingFactors: ["a".repeat(MAX_FACTOR_LENGTH)],
        },
      },
    })
    expect(result.success).toBe(true)
  })
})

describe("CodeSnippetSchema", () => {
  it("accepts valid code snippet", () => {
    const result = CodeSnippetSchema.safeParse({ language: "typescript", code: "const x = 1;" })
    expect(result.success).toBe(true)
  })

  it("rejects empty language", () => {
    const result = CodeSnippetSchema.safeParse({ language: "", code: "const x = 1;" })
    expect(result.success).toBe(false)
  })

  it("rejects empty code", () => {
    const result = CodeSnippetSchema.safeParse({ language: "typescript", code: "" })
    expect(result.success).toBe(false)
  })

  it("rejects language exceeding max length with too_big error code", () => {
    const result = CodeSnippetSchema.safeParse({
      language: "a".repeat(MAX_LANGUAGE_LENGTH + 1),
      code: "const x = 1;",
    })
    expect(result.success).toBe(false)
    expect(result.success ? null : result.error.issues[0].code).toBe("too_big")
  })

  it("rejects code exceeding max length with too_big error code", () => {
    const result = CodeSnippetSchema.safeParse({
      language: "typescript",
      code: "a".repeat(MAX_CODE_LENGTH + 1),
    })
    expect(result.success).toBe(false)
    expect(result.success ? null : result.error.issues[0].code).toBe("too_big")
  })

  it("accepts language at exactly max length", () => {
    const result = CodeSnippetSchema.safeParse({
      language: "a".repeat(MAX_LANGUAGE_LENGTH),
      code: "const x = 1;",
    })
    expect(result.success).toBe(true)
  })

  it("accepts code at exactly max length", () => {
    const result = CodeSnippetSchema.safeParse({
      language: "typescript",
      code: "a".repeat(MAX_CODE_LENGTH),
    })
    expect(result.success).toBe(true)
  })
})

describe("ConnectionPropertiesSchema", () => {
  const validConnection = {
    protocol: "TCP",
    communicationPatterns: ["request-response", "streaming"],
    typicalLatency: "1-5ms",
    coLocationPotential: true,
  }

  it("accepts valid connection properties", () => {
    const result = ConnectionPropertiesSchema.safeParse(validConnection)
    expect(result.success).toBe(true)
  })

  it("rejects missing protocol", () => {
    const { protocol: _protocol, ...withoutProtocol } = validConnection
    const result = ConnectionPropertiesSchema.safeParse(withoutProtocol)
    expect(result.success).toBe(false)
  })
})

describe("ComponentSchema", () => {
  it("accepts valid component data", () => {
    const result = ComponentSchema.safeParse(validComponent)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe("postgresql")
      expect(result.data.name).toBe("PostgreSQL")
    }
  })

  it("accepts component with optional compatibility", () => {
    const result = ComponentSchema.safeParse({
      ...validComponent,
      compatibility: { redis: "excellent" },
    })
    expect(result.success).toBe(true)
  })

  it("accepts component with optional connectionProperties", () => {
    const result = ComponentSchema.safeParse({
      ...validComponent,
      connectionProperties: {
        protocol: "TCP",
        communicationPatterns: ["request-response"],
        typicalLatency: "1-5ms",
        coLocationPotential: true,
      },
    })
    expect(result.success).toBe(true)
  })

  it("rejects component with missing required fields", () => {
    const result = ComponentSchema.safeParse({ id: "test" })
    expect(result.success).toBe(false)
  })

  it("rejects empty gain array", () => {
    const result = ComponentSchema.safeParse({ ...validComponent, gain: [] })
    expect(result.success).toBe(false)
  })

  it("rejects empty cost array", () => {
    const result = ComponentSchema.safeParse({ ...validComponent, cost: [] })
    expect(result.success).toBe(false)
  })

  it("rejects empty configVariants", () => {
    const result = ComponentSchema.safeParse({ ...validComponent, configVariants: [] })
    expect(result.success).toBe(false)
  })

  it("rejects unknown keys with strict mode", () => {
    const result = ComponentSchema.safeParse({ ...validComponent, unknownField: "nope" })
    expect(result.success).toBe(false)
  })
})

describe("ComponentYamlSchema (snake_case to camelCase)", () => {
  const yamlInput = {
    id: "postgresql",
    name: "PostgreSQL",
    category: "data-storage",
    description: "Relational database",
    is: "An open-source relational database",
    gain: ["ACID compliance"],
    cost: ["Higher memory"],
    tags: ["database"],
    base_metrics: [
      { id: "latency", value: "medium", numeric_value: 5, category: "performance" },
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
  }

  it("transforms snake_case to camelCase", () => {
    const result = ComponentYamlSchema.safeParse(yamlInput)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.baseMetrics).toBeDefined()
      expect(result.data.configVariants).toBeDefined()
      expect(result.data.baseMetrics[0].numericValue).toBe(5)
    }
  })

  it("rejects invalid yaml data", () => {
    const result = ComponentYamlSchema.safeParse({ id: "incomplete" })
    expect(result.success).toBe(false)
  })

  it("transforms snake_case optional fields (code_snippet, connection_properties)", () => {
    const result = ComponentYamlSchema.safeParse({
      ...yamlInput,
      config_variants: [
        {
          id: "default",
          name: "Default",
          metrics: [{ id: "latency", value: "low", numeric_value: 3, category: "performance" }],
          code_snippet: { language: "sql", code: "SELECT 1;" },
          metric_explanations: {
            latency: { reason: "Connection pooling", contributing_factors: ["pooling"] },
          },
        },
      ],
      connection_properties: {
        protocol: "TCP",
        communication_patterns: ["request-response"],
        typical_latency: "1-5ms",
        co_location_potential: true,
      },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.configVariants[0].codeSnippet).toEqual({ language: "sql", code: "SELECT 1;" })
      expect(result.data.configVariants[0].metricExplanations?.latency.contributingFactors).toEqual(["pooling"])
      expect(result.data.connectionProperties?.communicationPatterns).toEqual(["request-response"])
      expect(result.data.connectionProperties?.typicalLatency).toBe("1-5ms")
      expect(result.data.connectionProperties?.coLocationPotential).toBe(true)
    }
  })

  it("rejects YAML metric_explanations reason exceeding max length", () => {
    const result = ComponentYamlSchema.safeParse({
      ...yamlInput,
      config_variants: [
        {
          id: "default",
          name: "Default",
          metrics: [{ id: "latency", value: "low", numeric_value: 3, category: "performance" }],
          metric_explanations: {
            latency: { reason: "a".repeat(MAX_REASON_LENGTH + 1), contributing_factors: ["pooling"] },
          },
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it("rejects YAML metric_explanations contributing_factor item exceeding max length", () => {
    const result = ComponentYamlSchema.safeParse({
      ...yamlInput,
      config_variants: [
        {
          id: "default",
          name: "Default",
          metrics: [{ id: "latency", value: "low", numeric_value: 3, category: "performance" }],
          metric_explanations: {
            latency: { reason: "Valid", contributing_factors: ["a".repeat(MAX_FACTOR_LENGTH + 1)] },
          },
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it("round-trip: YAML output matches ComponentSchema shape", () => {
    const result = ComponentYamlSchema.safeParse(yamlInput)
    expect(result.success).toBe(true)
    if (result.success) {
      const baseResult = ComponentSchema.safeParse(result.data)
      expect(baseResult.success).toBe(true)
      if (baseResult.success) {
        expect(baseResult.data).toEqual(result.data)
      }
    }
  })
})

describe("ComponentSchema — empty string rejection", () => {
  it("rejects empty id", () => {
    const result = ComponentSchema.safeParse({ ...validComponent, id: "" })
    expect(result.success).toBe(false)
  })

  it("rejects empty name", () => {
    const result = ComponentSchema.safeParse({ ...validComponent, name: "" })
    expect(result.success).toBe(false)
  })

  it("rejects empty category", () => {
    const result = ComponentSchema.safeParse({ ...validComponent, category: "" })
    expect(result.success).toBe(false)
  })

  it("rejects empty description", () => {
    const result = ComponentSchema.safeParse({ ...validComponent, description: "" })
    expect(result.success).toBe(false)
  })

  it("rejects empty is", () => {
    const result = ComponentSchema.safeParse({ ...validComponent, is: "" })
    expect(result.success).toBe(false)
  })
})

describe("ComponentSchema — null rejection", () => {
  it("rejects null id", () => {
    const result = ComponentSchema.safeParse({ ...validComponent, id: null })
    expect(result.success).toBe(false)
  })

  it("rejects null name", () => {
    const result = ComponentSchema.safeParse({ ...validComponent, name: null })
    expect(result.success).toBe(false)
  })

  it("rejects null description", () => {
    const result = ComponentSchema.safeParse({ ...validComponent, description: null })
    expect(result.success).toBe(false)
  })
})

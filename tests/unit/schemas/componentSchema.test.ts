import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"
import { load } from "js-yaml"
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
  MAX_PROTOCOL_LENGTH,
  MAX_LATENCY_LENGTH,
  MAX_PATTERN_LENGTH,
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

  it("rejects empty contributingFactor item", () => {
    const result = ConfigVariantSchema.safeParse({
      ...validVariant,
      metricExplanations: {
        latency: {
          reason: "Valid reason",
          contributingFactors: [""],
        },
      },
    })
    expect(result.success).toBe(false)
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

  it("rejects protocol exceeding max length", () => {
    const result = ConnectionPropertiesSchema.safeParse({
      ...validConnection,
      protocol: "a".repeat(MAX_PROTOCOL_LENGTH + 1),
    })
    expect(result.success).toBe(false)
    expect(result.success ? null : result.error.issues[0].code).toBe("too_big")
  })

  it("rejects typicalLatency exceeding max length", () => {
    const result = ConnectionPropertiesSchema.safeParse({
      ...validConnection,
      typicalLatency: "a".repeat(MAX_LATENCY_LENGTH + 1),
    })
    expect(result.success).toBe(false)
    expect(result.success ? null : result.error.issues[0].code).toBe("too_big")
  })

  it("rejects communicationPatterns item exceeding max length", () => {
    const result = ConnectionPropertiesSchema.safeParse({
      ...validConnection,
      communicationPatterns: ["a".repeat(MAX_PATTERN_LENGTH + 1)],
    })
    expect(result.success).toBe(false)
    expect(result.success ? null : result.error.issues[0].code).toBe("too_big")
  })

  it("rejects empty communicationPatterns item", () => {
    const result = ConnectionPropertiesSchema.safeParse({
      ...validConnection,
      communicationPatterns: [""],
    })
    expect(result.success).toBe(false)
  })

  it("accepts protocol at exactly max length", () => {
    const result = ConnectionPropertiesSchema.safeParse({
      ...validConnection,
      protocol: "a".repeat(MAX_PROTOCOL_LENGTH),
    })
    expect(result.success).toBe(true)
  })

  it("accepts typicalLatency at exactly max length", () => {
    const result = ConnectionPropertiesSchema.safeParse({
      ...validConnection,
      typicalLatency: "a".repeat(MAX_LATENCY_LENGTH),
    })
    expect(result.success).toBe(true)
  })

  it("accepts communicationPatterns item at exactly max length", () => {
    const result = ConnectionPropertiesSchema.safeParse({
      ...validConnection,
      communicationPatterns: ["a".repeat(MAX_PATTERN_LENGTH)],
    })
    expect(result.success).toBe(true)
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
      // Snake_case keys must not survive the transform
      expect(result.data.connectionProperties).not.toHaveProperty("communication_patterns")
      expect(result.data.connectionProperties).not.toHaveProperty("typical_latency")
      expect(result.data.connectionProperties).not.toHaveProperty("co_location_potential")
    }
  })

  it("transforms YAML metric_explanations contributing_factors to contributingFactors", () => {
    const result = ComponentYamlSchema.safeParse({
      ...yamlInput,
      config_variants: [
        {
          id: "default",
          name: "Default",
          metrics: [{ id: "latency", value: "low", numeric_value: 3, category: "performance" }],
          metric_explanations: {
            latency: { reason: "Pooling helps", contributing_factors: ["connection pooling"] },
          },
        },
      ],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      const explanations = result.data.configVariants[0].metricExplanations
      expect(explanations?.latency.contributingFactors).toEqual(["connection pooling"])
      expect(explanations?.latency).not.toHaveProperty("contributing_factors")
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

describe("ComponentSchema — demandResponses", () => {
  it("accepts component without demandResponses (backward compatibility)", () => {
    const result = ComponentSchema.safeParse(validComponent)
    expect(result.success).toBe(true)
  })

  it("accepts component with valid demandResponses", () => {
    const result = ComponentSchema.safeParse({
      ...validComponent,
      demandResponses: {
        "traffic-volume": {
          high: { "read-latency": 0.7 },
          extreme: { "read-latency": 0.5, "write-throughput": 0.6 },
        },
      },
    })
    expect(result.success).toBe(true)
  })

  it("rejects component with invalid demandResponses (unknown variable)", () => {
    const result = ComponentSchema.safeParse({
      ...validComponent,
      demandResponses: {
        "disk-speed": { high: { perf: 0.7 } },
      },
    })
    expect(result.success).toBe(false)
  })

  it("rejects component with demandResponses multiplier out of range", () => {
    const result = ComponentSchema.safeParse({
      ...validComponent,
      demandResponses: {
        "traffic-volume": { high: { perf: 1.5 } },
      },
    })
    expect(result.success).toBe(false)
  })
})

describe("ComponentYamlSchema — demand_responses", () => {
  const yamlInputForDemand = {
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

  it("transforms demand_responses to demandResponses", () => {
    const result = ComponentYamlSchema.safeParse({
      ...yamlInputForDemand,
      demand_responses: {
        "traffic-volume": { high: { "read-latency": 0.7 } },
      },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.demandResponses).toBeDefined()
      expect((result.data as Record<string, unknown>)["demand_responses"]).toBeUndefined()
    }
  })

  it("round-trip: YAML with demand_responses matches ComponentSchema shape", () => {
    const result = ComponentYamlSchema.safeParse({
      ...yamlInputForDemand,
      demand_responses: {
        "traffic-volume": { high: { "read-latency": 0.7 } },
      },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      const baseResult = ComponentSchema.safeParse(result.data)
      expect(baseResult.success).toBe(true)
    }
  })

  it("rejects invalid demand_responses through ComponentYamlSchema path", () => {
    const result = ComponentYamlSchema.safeParse({
      ...yamlInputForDemand,
      demand_responses: {
        "disk-speed": { high: { perf: 0.7 } },
      },
    })
    expect(result.success).toBe(false)
  })

  it("accepts empty demand_responses through ComponentYamlSchema", () => {
    const result = ComponentYamlSchema.safeParse({
      ...yamlInputForDemand,
      demand_responses: {},
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.demandResponses).toEqual({})
    }
  })
})

// --- Component YAML files — demand_responses validation (AC-1, AC-3, AC-4) ---

describe("Component YAML files — demand_responses validation", () => {
  const componentDir = join(__dirname, "../../../src/data/components")
  const componentFiles = [
    "cloudflare-cdn.yaml",
    "kafka.yaml",
    "nginx.yaml",
    "node-express.yaml",
    "postgresql.yaml",
    "prometheus.yaml",
    "rabbitmq.yaml",
    "redis-cache.yaml",
    "redis.yaml",
    "websocket-server.yaml",
  ]

  function loadComponent(filename: string) {
    const content = readFileSync(join(componentDir, filename), "utf-8")
    return load(content) as Record<string, unknown>
  }

  function parseComponent(filename: string) {
    const raw = loadComponent(filename)
    return ComponentYamlSchema.safeParse(raw)
  }

  for (const filename of componentFiles) {
    it(`${filename} passes ComponentYamlSchema validation with demand_responses`, () => {
      const result = parseComponent(filename)
      expect(result.success).toBe(true)
    })
  }

  it("all 10 components define demand_responses for at least 2 variables (AC-1)", () => {
    for (const filename of componentFiles) {
      const result = parseComponent(filename)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.demandResponses).toBeDefined()
        const variableCount = Object.keys(result.data.demandResponses!).length
        expect(variableCount).toBeGreaterThanOrEqual(2)
      }
    }
  })

  // AC-3 worst-multiplier strategy: Math.min across all metric multipliers gives
  // the single harshest degradation for a component at a given level. This is the
  // right comparison because "degrades less" means even the worst-affected metric
  // of the resilient component is still better than the worst-affected metric of
  // the non-resilient one. Named-metric assertions are added where available.
  it("redis-cache degrades less on traffic-volume:extreme than redis data store (AC-3)", () => {
    const cache = parseComponent("redis-cache.yaml")
    const store = parseComponent("redis.yaml")
    expect(cache.success && store.success).toBe(true)
    if (!cache.success || !store.success) return

    const cacheTraffic = cache.data.demandResponses?.["traffic-volume"]?.["extreme"]
    const storeTraffic = store.data.demandResponses?.["traffic-volume"]?.["extreme"]

    const cacheWorstMultiplier = cacheTraffic
      ? Math.min(...Object.values(cacheTraffic))
      : 1.0
    const storeWorstMultiplier = storeTraffic
      ? Math.min(...Object.values(storeTraffic))
      : 1.0
    expect(cacheWorstMultiplier).toBeGreaterThan(storeWorstMultiplier)
  })

  it("nginx degrades less on traffic-volume:extreme than node-express (AC-3)", () => {
    const nginx = parseComponent("nginx.yaml")
    const node = parseComponent("node-express.yaml")
    expect(nginx.success && node.success).toBe(true)
    if (!nginx.success || !node.success) return

    const nginxTraffic = nginx.data.demandResponses?.["traffic-volume"]?.["extreme"]
    const nodeTraffic = node.data.demandResponses?.["traffic-volume"]?.["extreme"]

    const nginxWorst = nginxTraffic ? Math.min(...Object.values(nginxTraffic)) : 1.0
    const nodeWorst = nodeTraffic ? Math.min(...Object.values(nodeTraffic)) : 1.0
    expect(nginxWorst).toBeGreaterThan(nodeWorst)
  })

  it("kafka degrades less on traffic-volume:extreme than rabbitmq (AC-3)", () => {
    const kafka = parseComponent("kafka.yaml")
    const rabbit = parseComponent("rabbitmq.yaml")
    expect(kafka.success && rabbit.success).toBe(true)
    if (!kafka.success || !rabbit.success) return

    const kafkaTraffic = kafka.data.demandResponses?.["traffic-volume"]?.["extreme"]
    const rabbitTraffic = rabbit.data.demandResponses?.["traffic-volume"]?.["extreme"]

    const kafkaWorst = kafkaTraffic ? Math.min(...Object.values(kafkaTraffic)) : 1.0
    const rabbitWorst = rabbitTraffic ? Math.min(...Object.values(rabbitTraffic)) : 1.0
    expect(kafkaWorst).toBeGreaterThan(rabbitWorst)
  })

  it("kafka degrades less on data-size:extreme than postgresql (AC-3, data-size)", () => {
    const kafka = parseComponent("kafka.yaml")
    const pg = parseComponent("postgresql.yaml")
    expect(kafka.success && pg.success).toBe(true)
    if (!kafka.success || !pg.success) return

    const kafkaDataSize = kafka.data.demandResponses?.["data-size"]?.["extreme"]
    const pgDataSize = pg.data.demandResponses?.["data-size"]?.["extreme"]

    const kafkaWorst = kafkaDataSize ? Math.min(...Object.values(kafkaDataSize)) : 1.0
    const pgWorst = pgDataSize ? Math.min(...Object.values(pgDataSize)) : 1.0
    // Kafka (streaming-optimized) degrades less under extreme data-size than PostgreSQL
    expect(kafkaWorst).toBeGreaterThan(pgWorst)
  })

  it("round-trip: all YAML components match ComponentSchema after transform", () => {
    for (const filename of componentFiles) {
      const yamlResult = parseComponent(filename)
      expect(yamlResult.success).toBe(true)
      if (yamlResult.success) {
        const baseResult = ComponentSchema.safeParse(yamlResult.data)
        expect(baseResult.success).toBe(true)
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

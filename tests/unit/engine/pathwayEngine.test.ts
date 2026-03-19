import { describe, it, expect } from "vitest"
import { computePathwaySuggestions } from "@/engine/pathwayEngine"
import type { Component } from "@/schemas/componentSchema"
import type { MetricValue } from "@/schemas/metricSchema"
import type { TierRequirement } from "@/lib/tierDefinitions"
import type { WeightProfile, Constraint, DataContextItem } from "@/lib/constants"
import { DEFAULT_WEIGHT_PROFILE } from "@/lib/constants"

// --- Test Helpers ---

function makeMetric(
  category: string,
  numericValue: number,
  id?: string,
): MetricValue {
  return {
    id: id ?? `${category}-metric`,
    name: `${category} metric`,
    value: numericValue >= 7 ? "high" : numericValue >= 4 ? "medium" : "low",
    numericValue,
    category,
  }
}

function makeComponent(overrides?: Partial<Component> & { metrics?: MetricValue[] }): Component {
  const metrics = overrides?.metrics ?? [
    makeMetric("performance", 7),
    makeMetric("reliability", 6),
    makeMetric("scalability", 5),
  ]
  const { metrics: _metrics, ...rest } = overrides ?? {}
  return {
    id: "comp-1",
    name: "Test Component",
    category: "compute",
    description: "A test component",
    is: "A compute unit",
    gain: ["Fast processing"],
    cost: ["Resource intensive"],
    tags: ["test"],
    baseMetrics: metrics,
    configVariants: [
      {
        id: "default",
        name: "Default",
        metrics,
      },
    ],
    ...rest,
  }
}

function makeConstraint(overrides?: Partial<Constraint>): Constraint {
  return {
    id: "constraint-1",
    categoryId: "cost-efficiency",
    operator: "lte",
    threshold: 7,
    label: "Cost must not exceed 7.0",
    ...overrides,
  }
}

function makeDataContextItem(overrides?: Partial<DataContextItem>): DataContextItem {
  return {
    id: "dci-1",
    name: "User Sessions",
    accessPattern: "read-heavy",
    averageSize: "medium",
    structureType: "simple-kv",
    ...overrides,
  }
}

// Default weight profile (all 1.0)
const defaultWeights: WeightProfile = { ...DEFAULT_WEIGHT_PROFILE }

// --- Tests ---

describe("computePathwaySuggestions", () => {
  describe("AC-1: Gap-to-Suggestion Mapping", () => {
    it("4.1: required_categories gap produces candidates from missing category", () => {
      const monitoringComp = makeComponent({
        id: "prometheus",
        name: "Prometheus",
        category: "monitoring",
        metrics: [
          makeMetric("performance", 7),
          makeMetric("reliability", 8),
        ],
      })
      const computeComp = makeComponent({
        id: "nginx",
        name: "Nginx",
        category: "compute",
      })

      const requirements: TierRequirement[] = [
        {
          type: "required_categories",
          requiredCategories: ["monitoring"],
          description: "Monitoring component present",
        },
      ]

      const result = computePathwaySuggestions(
        requirements,
        [monitoringComp, computeComp],
        new Set(["compute"]),          // monitoring not present
        new Set(["nginx"]),            // nginx already placed
        defaultWeights,
        [],
        [],
        new Map(),
      )

      expect(result.length).toBeGreaterThan(0)
      // Only monitoring components should be suggested
      expect(result.every((s) => s.category === "monitoring")).toBe(true)
      // Prometheus should be in the suggestions
      expect(result.some((s) => s.componentId === "prometheus")).toBe(true)
    })

    it("4.2: components already on canvas are excluded", () => {
      const comp1 = makeComponent({
        id: "prometheus",
        name: "Prometheus",
        category: "monitoring",
      })
      const comp2 = makeComponent({
        id: "grafana",
        name: "Grafana",
        category: "monitoring",
      })

      const requirements: TierRequirement[] = [
        {
          type: "required_categories",
          requiredCategories: ["monitoring"],
          description: "Monitoring component present",
        },
      ]

      const result = computePathwaySuggestions(
        requirements,
        [comp1, comp2],
        new Set(["compute"]),              // monitoring not yet present
        new Set(["prometheus"]),           // prometheus already on canvas
        defaultWeights,
        [],
        [],
        new Map(),
      )

      // Prometheus should be excluded, only Grafana suggested
      expect(result.some((s) => s.componentId === "prometheus")).toBe(false)
      expect(result.some((s) => s.componentId === "grafana")).toBe(true)
    })
  })

  describe("AC-2: Weight-Aware Ranking", () => {
    it("4.3: weight profile changes ranking order", () => {
      const scalabilityStrong = makeComponent({
        id: "kafka",
        name: "Kafka",
        category: "messaging",
        metrics: [
          makeMetric("scalability", 9),
          makeMetric("cost-efficiency", 3),
          makeMetric("performance", 6),
        ],
      })
      const costStrong = makeComponent({
        id: "rabbitmq",
        name: "RabbitMQ",
        category: "messaging",
        metrics: [
          makeMetric("scalability", 4),
          makeMetric("cost-efficiency", 9),
          makeMetric("performance", 6),
        ],
      })

      const requirements: TierRequirement[] = [
        {
          type: "min_distinct_categories",
          minCount: 3,
          description: "Components from at least 3 categories",
        },
      ]

      // Heavy scalability weight, low cost weight
      const scalabilityWeights: WeightProfile = {
        ...defaultWeights,
        scalability: 1.0,
        "cost-efficiency": 0.2,
      }

      const result = computePathwaySuggestions(
        requirements,
        [scalabilityStrong, costStrong],
        new Set(["compute", "data-storage"]),  // messaging not present
        new Set(["redis"]),
        scalabilityWeights,
        [],
        [],
        new Map(),
      )

      // Both are in messaging category — only the best per category for min_distinct_categories
      // With scalability=1.0 and cost=0.2, Kafka (scalability=9) should rank above RabbitMQ
      const messagingSuggestions = result.filter((s) => s.category === "messaging")
      expect(messagingSuggestions.length).toBeGreaterThan(0)
      expect(messagingSuggestions[0].componentId).toBe("kafka")
    })
  })

  describe("AC-3: Constraint Heuristic Filter", () => {
    it("4.4: constraint-unsafe candidate flagged with warning", () => {
      const expensiveComp = makeComponent({
        id: "aurora",
        name: "Aurora",
        category: "data-storage",
        metrics: [
          makeMetric("cost-efficiency", 8),   // exceeds lte threshold of 7
          makeMetric("performance", 9),
        ],
      })

      const requirements: TierRequirement[] = [
        {
          type: "required_categories",
          requiredCategories: ["data-storage"],
          description: "Data storage component present",
        },
      ]

      const constraints: Constraint[] = [
        makeConstraint({
          categoryId: "cost-efficiency",
          operator: "lte",
          threshold: 7,
          label: "Cost must not exceed 7.0",
        }),
      ]

      const result = computePathwaySuggestions(
        requirements,
        [expensiveComp],
        new Set(["compute"]),
        new Set(),
        defaultWeights,
        constraints,
        [],
        new Map(),
      )

      expect(result.length).toBe(1)
      expect(result[0].isConstraintSafe).toBe(false)
      expect(result[0].constraintWarning).toBe("Cost must not exceed 7.0")
    })

    it("gte constraint operator flags low-scoring candidate", () => {
      const weakComp = makeComponent({
        id: "weak-db",
        name: "Weak DB",
        category: "data-storage",
        metrics: [
          makeMetric("performance", 3),  // below gte threshold of 6
          makeMetric("reliability", 7),
        ],
      })

      const requirements: TierRequirement[] = [
        {
          type: "required_categories",
          requiredCategories: ["data-storage"],
          description: "Data storage component present",
        },
      ]

      const constraints: Constraint[] = [
        makeConstraint({
          categoryId: "performance",
          operator: "gte",
          threshold: 6,
          label: "Performance must be at least 6.0",
        }),
      ]

      const result = computePathwaySuggestions(
        requirements,
        [weakComp],
        new Set(["compute"]),
        new Set(),
        defaultWeights,
        constraints,
        [],
        new Map(),
      )

      expect(result.length).toBe(1)
      expect(result[0].isConstraintSafe).toBe(false)
      expect(result[0].constraintWarning).toBe("Performance must be at least 6.0")
    })

    it("constraint-safe candidate has isConstraintSafe true and no warning", () => {
      const safeComp = makeComponent({
        id: "safe-db",
        name: "Safe DB",
        category: "data-storage",
        metrics: [
          makeMetric("cost-efficiency", 5),  // within lte threshold of 7
          makeMetric("performance", 8),
        ],
      })

      const requirements: TierRequirement[] = [
        {
          type: "required_categories",
          requiredCategories: ["data-storage"],
          description: "Data storage component present",
        },
      ]

      const constraints: Constraint[] = [
        makeConstraint({
          categoryId: "cost-efficiency",
          operator: "lte",
          threshold: 7,
          label: "Cost must not exceed 7.0",
        }),
      ]

      const result = computePathwaySuggestions(
        requirements,
        [safeComp],
        new Set(["compute"]),
        new Set(),
        defaultWeights,
        constraints,
        [],
        new Map(),
      )

      expect(result.length).toBe(1)
      expect(result[0].isConstraintSafe).toBe(true)
      expect(result[0].constraintWarning).toBeUndefined()
    })
  })

  describe("AC-4: Data Context Fit Scoring", () => {
    it("4.5: data context fit scoring populates fitLevel", () => {
      const comp = makeComponent({
        id: "redis",
        name: "Redis",
        category: "caching",
        configVariants: [
          {
            id: "default",
            name: "Default",
            metrics: [makeMetric("performance", 8)],
            dataFitProfile: {
              "read-heavy": "great",
              medium: "good",
              "simple-kv": "great",
            },
          },
        ],
      })

      const requirements: TierRequirement[] = [
        {
          type: "required_categories",
          requiredCategories: ["caching"],
          description: "Caching component present",
        },
      ]

      const dataContextItems = [makeDataContextItem()]

      const result = computePathwaySuggestions(
        requirements,
        [comp],
        new Set(["compute"]),
        new Set(),
        defaultWeights,
        [],
        dataContextItems,
        new Map(),
      )

      expect(result.length).toBe(1)
      expect(result[0].fitLevel).toBe("great-fit")
      expect(result[0].fitExplanation).toContain("great fit")
    })

    it("4.6: no data context items -> fitLevel undefined", () => {
      const comp = makeComponent({
        id: "redis",
        name: "Redis",
        category: "caching",
      })

      const requirements: TierRequirement[] = [
        {
          type: "required_categories",
          requiredCategories: ["caching"],
          description: "Caching component present",
        },
      ]

      const result = computePathwaySuggestions(
        requirements,
        [comp],
        new Set(["compute"]),
        new Set(),
        defaultWeights,
        [],
        [],     // no data context items
        new Map(),
      )

      expect(result.length).toBe(1)
      expect(result[0].fitLevel).toBeUndefined()
    })

    it("worst-case fit aggregation across multiple data context items", () => {
      const comp = makeComponent({
        id: "redis",
        name: "Redis",
        category: "caching",
        configVariants: [
          {
            id: "default",
            name: "Default",
            metrics: [makeMetric("performance", 8)],
            dataFitProfile: {
              "read-heavy": "great",
              medium: "good",
              "simple-kv": "great",
              "write-heavy": "poor",
              large: "poor",
              "binary-blob": "incompatible",
            },
          },
        ],
      })

      const requirements: TierRequirement[] = [
        {
          type: "required_categories",
          requiredCategories: ["caching"],
          description: "Caching component present",
        },
      ]

      // First item: great fit. Second item: poor fit (write-heavy + large + binary-blob)
      const dataContextItems = [
        makeDataContextItem(), // read-heavy, medium, simple-kv → great-fit
        makeDataContextItem({
          id: "dci-2",
          name: "Blob Store",
          accessPattern: "write-heavy",
          averageSize: "large",
          structureType: "binary-blob",
        }), // write-heavy, large, binary-blob → risky
      ]

      const result = computePathwaySuggestions(
        requirements,
        [comp],
        new Set(["compute"]),
        new Set(),
        defaultWeights,
        [],
        dataContextItems,
        new Map(),
      )

      expect(result.length).toBe(1)
      // Worst-case aggregation: risky should win over great-fit
      expect(result[0].fitLevel).toBe("risky")
    })

    it("component without dataFitProfile falls back to trade-off when DCIs present", () => {
      const comp = makeComponent({
        id: "generic",
        name: "Generic Cache",
        category: "caching",
        // No dataFitProfile on configVariants — default makeComponent has none
      })

      const requirements: TierRequirement[] = [
        {
          type: "required_categories",
          requiredCategories: ["caching"],
          description: "Caching component present",
        },
      ]

      const result = computePathwaySuggestions(
        requirements,
        [comp],
        new Set(["compute"]),
        new Set(),
        defaultWeights,
        [],
        [makeDataContextItem()],
        new Map(),
      )

      expect(result.length).toBe(1)
      expect(result[0].fitLevel).toBe("trade-off")
    })
  })

  describe("AC-6: Deduplication", () => {
    it("4.7: deduplication merges same component from multiple gaps", () => {
      // Component that satisfies both required_categories AND min_category_score
      const monitoringComp = makeComponent({
        id: "datadog",
        name: "Datadog",
        category: "monitoring",
        metrics: [
          makeMetric("monitoring", 9, "monitoring-main"),
          makeMetric("performance", 8),
        ],
      })

      const requirements: TierRequirement[] = [
        {
          type: "required_categories",
          requiredCategories: ["monitoring"],
          description: "Monitoring component present",
        },
        {
          type: "min_category_score",
          categoryId: "monitoring",
          minScore: 5,
          description: "Monitoring score of 5+",
        },
      ]

      const result = computePathwaySuggestions(
        requirements,
        [monitoringComp],
        new Set(["compute"]),       // monitoring not present
        new Set(),
        defaultWeights,
        [],
        [],
        new Map([["monitoring", 3]]),  // monitoring score below 5
      )

      // Datadog should appear only once despite matching 2 gaps
      const datadogSuggestions = result.filter((s) => s.componentId === "datadog")
      expect(datadogSuggestions).toHaveLength(1)
      // The primary gap should be required_categories (higher priority)
      expect(datadogSuggestions[0].gapClosed).toBe("Monitoring component present")
    })

    it("deduplication reason includes 'Also closes:' for secondary gaps", () => {
      const monitoringComp = makeComponent({
        id: "datadog",
        name: "Datadog",
        category: "monitoring",
        metrics: [
          makeMetric("monitoring", 9, "monitoring-main"),
          makeMetric("performance", 8),
        ],
      })

      const requirements: TierRequirement[] = [
        {
          type: "required_categories",
          requiredCategories: ["monitoring"],
          description: "Monitoring component present",
        },
        {
          type: "min_category_score",
          categoryId: "monitoring",
          minScore: 5,
          description: "Monitoring score of 5+",
        },
      ]

      const result = computePathwaySuggestions(
        requirements,
        [monitoringComp],
        new Set(["compute"]),
        new Set(),
        defaultWeights,
        [],
        [],
        new Map([["monitoring", 3]]),
      )

      expect(result).toHaveLength(1)
      expect(result[0].reason).toContain("Also closes:")
      expect(result[0].reason).toContain("Monitoring score of 5+")
    })
  })

  describe("Edge Cases", () => {
    it("min_component_count as sole gap produces suggestions", () => {
      const comp1 = makeComponent({
        id: "nginx",
        name: "Nginx",
        category: "compute",
        metrics: [makeMetric("performance", 8)],
      })
      const comp2 = makeComponent({
        id: "redis",
        name: "Redis",
        category: "caching",
        metrics: [makeMetric("performance", 7)],
      })

      const requirements: TierRequirement[] = [
        {
          type: "min_component_count",
          minCount: 5,
          description: "At least 5 components",
        },
      ]

      const result = computePathwaySuggestions(
        requirements,
        [comp1, comp2],
        new Set(["data-storage"]),  // neither comp category present
        new Set(),                   // none placed
        defaultWeights,
        [],
        [],
        new Map(),
      )

      expect(result.length).toBeGreaterThan(0)
      expect(result.every((s) => s.gapClosed === "At least 5 components")).toBe(true)
    })

    it("4.8: empty gaps -> empty suggestions", () => {
      const result = computePathwaySuggestions(
        [],           // no requirements
        [makeComponent()],
        new Set(),
        new Set(),
        defaultWeights,
        [],
        [],
        new Map(),
      )

      expect(result).toEqual([])
    })
  })

  describe("AC-5: Performance", () => {
    it("4.9: 30 components, 6 gaps < 50ms", () => {
      // Generate 30 components across different categories
      const categories = [
        "compute", "data-storage", "caching", "messaging",
        "delivery-network", "real-time", "auth-security",
        "monitoring", "search", "devops",
      ]
      const components: Component[] = []
      for (let i = 0; i < 30; i++) {
        components.push(
          makeComponent({
            id: `comp-${i}`,
            name: `Component ${i}`,
            category: categories[i % categories.length],
            metrics: [
              makeMetric("performance", (i % 9) + 1),
              makeMetric("reliability", ((i + 2) % 9) + 1),
              makeMetric("scalability", ((i + 4) % 9) + 1),
              makeMetric("cost-efficiency", ((i + 6) % 9) + 1),
            ],
          }),
        )
      }

      // 6 tier requirements (gaps)
      const requirements: TierRequirement[] = [
        { type: "min_component_count", minCount: 10, description: "At least 10 components" },
        { type: "min_distinct_categories", minCount: 6, description: "6 categories" },
        { type: "min_category_score", categoryId: "performance", minScore: 7, description: "Perf 7+" },
        { type: "min_category_score", categoryId: "reliability", minScore: 6, description: "Rel 6+" },
        { type: "min_category_score", categoryId: "scalability", minScore: 6, description: "Scale 6+" },
        { type: "required_categories", requiredCategories: ["monitoring"], description: "Monitoring present" },
      ]

      const constraints: Constraint[] = [
        makeConstraint({ id: "c1", categoryId: "cost-efficiency", operator: "lte", threshold: 8 }),
      ]
      const dataContextItems = [makeDataContextItem()]

      const args = [
        requirements,
        components,
        new Set(["compute", "data-storage"]),  // only 2 of 6 required categories
        new Set(["comp-0", "comp-1"]),          // 2 placed
        defaultWeights,
        constraints,
        dataContextItems,
        new Map([["performance", 4], ["reliability", 3]]),
        "Resilient",
      ] as const

      // Warm-up pass (JIT compilation)
      computePathwaySuggestions(...args)

      // Measured pass
      const start = performance.now()
      const result = computePathwaySuggestions(...args)
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(50)
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe("Additional Coverage", () => {
    it("4.10: all requirements met -> empty suggestions", () => {
      const requirements: TierRequirement[] = [
        { type: "min_component_count", minCount: 3, description: "3 components" },
        { type: "min_distinct_categories", minCount: 2, description: "2 categories" },
      ]

      const result = computePathwaySuggestions(
        requirements,
        [makeComponent()],
        new Set(["compute", "data-storage", "caching"]),   // 3 categories
        new Set(["a", "b", "c"]),                           // 3 components
        defaultWeights,
        [],
        [],
        new Map(),
      )

      // All requirements are met — no suggestions needed
      expect(result).toEqual([])
    })

    it("min_category_score gap with zero current score handles gracefully", () => {
      const comp = makeComponent({
        id: "pg",
        name: "PostgreSQL",
        category: "data-storage",
        metrics: [
          makeMetric("performance", 7),
          makeMetric("reliability", 8),
        ],
      })

      const requirements: TierRequirement[] = [
        {
          type: "min_category_score",
          categoryId: "performance",
          minScore: 5,
          description: "Performance score of 5+",
        },
      ]

      // performance score is 0 (no nodes with performance metrics on canvas yet)
      const result = computePathwaySuggestions(
        requirements,
        [comp],
        new Set(["compute"]),
        new Set(),
        defaultWeights,
        [],
        [],
        new Map(),  // no performance score → defaults to 0
      )

      expect(result.length).toBeGreaterThan(0)
      expect(result[0].reason).toContain("0")
    })
  })
})

import { describe, it, expect } from "vitest"
import {
  generateArchitectureReport,
  type ReportData,
  type ReportComponentData,
  type ReportViolation,
  type ReportScenarioComparison,
} from "@/services/reportGenerator"

// --- Fixtures ---

function makeComponent(overrides: Partial<ReportComponentData> = {}): ReportComponentData {
  return {
    nodeId: "node-1",
    componentName: "Redis",
    category: "Caching",
    activeVariantId: "redis-cluster",
    overallScore: 7.2,
    heatmapStatus: "healthy",
    topMetrics: [
      { name: "Read Latency", category: "performance", numericValue: 8 },
      { name: "Horizontal Scalability", category: "scalability", numericValue: 7 },
      { name: "Data Durability", category: "reliability", numericValue: 6 },
    ],
    ...overrides,
  }
}

function makeViolation(overrides: Partial<ReportViolation> = {}): ReportViolation {
  return {
    constraintLabel: "Min reliability",
    nodeComponentName: "PostgreSQL",
    categoryName: "Reliability",
    operator: "gte",
    actualScore: 3.2,
    threshold: 5,
    ...overrides,
  }
}

function makeScenarioComparison(overrides: Partial<ReportScenarioComparison> = {}): ReportScenarioComparison {
  return {
    componentName: "API Gateway",
    overallScore: 4.1,
    heatmapStatus: "warning",
    ...overrides,
  }
}

function makeReportData(overrides: Partial<ReportData> = {}): ReportData {
  return {
    architectureName: "WhatsApp Clone",
    componentCount: 5,
    connectionCount: 4,
    tierName: "Foundation",
    overallScore: 6.8,
    activeScenarioName: null,
    activeFailureScenarioName: null,
    components: [makeComponent()],
    violations: [],
    scenarioComparison: [],
    generatedAt: new Date("2026-03-30T12:00:00Z"),
    ...overrides,
  }
}

// --- Tests ---

describe("generateArchitectureReport", () => {
  describe("executive summary (AC-2)", () => {
    it("includes architecture name in header", () => {
      const report = generateArchitectureReport(makeReportData())
      expect(report).toContain("# Architecture Report: WhatsApp Clone")
    })

    it("includes component count", () => {
      const report = generateArchitectureReport(makeReportData({ componentCount: 8 }))
      expect(report).toContain("8")
    })

    it("includes connection count", () => {
      const report = generateArchitectureReport(makeReportData({ connectionCount: 12 }))
      expect(report).toContain("12")
    })

    it("includes tier name", () => {
      const report = generateArchitectureReport(makeReportData({ tierName: "Professional" }))
      expect(report).toContain("Professional")
    })

    it("shows 'Not Evaluated' when tier is null", () => {
      const report = generateArchitectureReport(makeReportData({ tierName: null }))
      expect(report).toContain("Not Evaluated")
    })

    it("includes overall score", () => {
      const report = generateArchitectureReport(makeReportData({ overallScore: 7.3 }))
      expect(report).toContain("7.3")
    })

    it("shows scenario names when active", () => {
      const report = generateArchitectureReport(makeReportData({
        activeScenarioName: "High Traffic",
        activeFailureScenarioName: "Database Failure",
      }))
      expect(report).toContain("High Traffic")
      expect(report).toContain("Database Failure")
    })

    it("shows 'None' for scenarios when not active", () => {
      const report = generateArchitectureReport(makeReportData())
      expect(report).toMatch(/None/)
    })
  })

  describe("per-component details (AC-3)", () => {
    it("lists each component by name", () => {
      const data = makeReportData({
        components: [
          makeComponent({ componentName: "Redis" }),
          makeComponent({ nodeId: "node-2", componentName: "PostgreSQL", category: "Data Storage" }),
        ],
      })
      const report = generateArchitectureReport(data)
      expect(report).toContain("Redis")
      expect(report).toContain("PostgreSQL")
    })

    it("includes category for each component", () => {
      const report = generateArchitectureReport(makeReportData({
        components: [makeComponent({ category: "Data Storage" })],
      }))
      expect(report).toContain("Data Storage")
    })

    it("includes active variant", () => {
      const report = generateArchitectureReport(makeReportData({
        components: [makeComponent({ activeVariantId: "redis-sentinel" })],
      }))
      expect(report).toContain("redis-sentinel")
    })

    it("includes top 3 metric scores", () => {
      const report = generateArchitectureReport(makeReportData({
        components: [makeComponent({
          topMetrics: [
            { name: "Read Latency", category: "performance", numericValue: 9 },
            { name: "Scalability", category: "scalability", numericValue: 7 },
            { name: "Durability", category: "reliability", numericValue: 5 },
          ],
        })],
      }))
      expect(report).toContain("Read Latency")
      expect(report).toContain("Scalability")
      expect(report).toContain("Durability")
    })

    it("includes heatmap status", () => {
      const report = generateArchitectureReport(makeReportData({
        components: [makeComponent({ heatmapStatus: "bottleneck" })],
      }))
      expect(report).toContain("bottleneck")
    })

    it("handles components with fewer than 3 metrics", () => {
      const report = generateArchitectureReport(makeReportData({
        components: [makeComponent({
          topMetrics: [{ name: "Latency", category: "performance", numericValue: 8 }],
        })],
      }))
      expect(report).toContain("Latency")
    })
  })

  describe("constraint violations (AC-4)", () => {
    it("lists violations with all fields", () => {
      const report = generateArchitectureReport(makeReportData({
        violations: [makeViolation()],
      }))
      expect(report).toContain("Min reliability")
      expect(report).toContain("PostgreSQL")
      expect(report).toContain("Reliability")
      expect(report).toContain("3.2")
      expect(report).toContain("5")
    })

    it("shows 'no violations' text when empty", () => {
      const report = generateArchitectureReport(makeReportData({ violations: [] }))
      expect(report).toMatch(/[Nn]o constraint violations/)
    })
  })

  describe("scenario impact (AC-5)", () => {
    it("lists top 5 lowest-scoring components when scenario is active", () => {
      const report = generateArchitectureReport(makeReportData({
        activeScenarioName: "High Traffic",
        scenarioComparison: [
          makeScenarioComparison({ componentName: "API Gateway", overallScore: 3.1 }),
          makeScenarioComparison({ componentName: "Load Balancer", overallScore: 4.2 }),
        ],
      }))
      expect(report).toContain("API Gateway")
      expect(report).toContain("Load Balancer")
    })

    it("omits scenario section when no scenario is active", () => {
      const report = generateArchitectureReport(makeReportData({
        activeScenarioName: null,
        activeFailureScenarioName: null,
        scenarioComparison: [],
      }))
      expect(report).toMatch(/[Nn]o demand or failure scenario/)
    })
  })

  describe("provenance footer (AC-8)", () => {
    it("includes AI-generated data disclaimer", () => {
      const report = generateArchitectureReport(makeReportData())
      expect(report).toMatch(/AI-generated/)
      expect(report).toMatch(/directional/)
    })

    it("includes note about estimates not being benchmarks", () => {
      const report = generateArchitectureReport(makeReportData())
      expect(report).toMatch(/not.*precise|not.*benchmark/i)
    })
  })

  describe("general", () => {
    it("returns a string", () => {
      const report = generateArchitectureReport(makeReportData())
      expect(typeof report).toBe("string")
    })

    it("includes generated timestamp", () => {
      const report = generateArchitectureReport(makeReportData({
        generatedAt: new Date("2026-03-30T12:00:00Z"),
      }))
      expect(report).toContain("2026-03-30")
    })

    it("handles empty components array gracefully", () => {
      const report = generateArchitectureReport(makeReportData({
        componentCount: 0,
        components: [],
      }))
      expect(report).toContain("Architecture Report")
    })
  })

  describe("performance (AC-6)", () => {
    it("generates report for 15 components in under 3 seconds", () => {
      const components = Array.from({ length: 15 }, (_, i) =>
        makeComponent({
          nodeId: `node-${i}`,
          componentName: `Component ${i}`,
          overallScore: (i * 0.65) % 10,
        }),
      )
      const data = makeReportData({
        componentCount: 15,
        connectionCount: 20,
        components,
        violations: [makeViolation(), makeViolation({ constraintLabel: "Max cost" })],
      })

      const start = performance.now()
      generateArchitectureReport(data)
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(3000)
    })
  })
})

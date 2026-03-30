import type { HeatmapStatus } from "@/engine/heatmapCalculator"

// --- Types ---

export interface ReportMetric {
  name: string
  category: string
  numericValue: number
}

export interface ReportComponentData {
  nodeId: string
  componentName: string
  category: string
  activeVariantId: string
  overallScore: number
  heatmapStatus: HeatmapStatus
  topMetrics: ReportMetric[]
}

export interface ReportViolation {
  constraintLabel: string
  nodeComponentName: string
  categoryName: string
  operator: "lte" | "gte"
  actualScore: number
  threshold: number
}

export interface ReportScenarioComparison {
  componentName: string
  overallScore: number
  heatmapStatus: HeatmapStatus
}

export interface ReportData {
  architectureName: string
  componentCount: number
  connectionCount: number
  tierName: string | null
  overallScore: number
  activeScenarioName: string | null
  activeFailureScenarioName: string | null
  components: ReportComponentData[]
  violations: ReportViolation[]
  scenarioComparison: ReportScenarioComparison[]
  generatedAt: Date
}

// --- Pure Generator Function ---

/**
 * Generates a markdown architecture report from fully-resolved data.
 * Pure function — no store access, no side effects.
 * AC-ARCH-PATTERN-1: generateArchitectureReport(data: ReportData): string
 */
export function generateArchitectureReport(data: ReportData): string {
  const sections: string[] = [
    generateHeader(data),
    generateExecutiveSummary(data),
    generateComponentDetails(data.components),
    generateConstraintViolations(data.violations),
    generateScenarioImpact(data),
    generateProvenanceFooter(),
  ]

  return sections.join("\n\n")
}

// --- Helpers ---

/** Escapes pipe characters and newlines for safe Markdown table cell rendering */
function mdCell(value: string | number): string {
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ")
}

// --- Private Section Generators ---

function generateHeader(data: ReportData): string {
  const dateStr = data.generatedAt.toISOString().slice(0, 10)
  return `# Architecture Report: ${data.architectureName}\n\n*Generated: ${dateStr}*`
}

function generateExecutiveSummary(data: ReportData): string {
  const lines = [
    "## Executive Summary",
    "",
    "| Metric | Value |",
    "|--------|-------|",
    `| Components | ${data.componentCount} |`,
    `| Connections | ${data.connectionCount} |`,
    `| Architecture Tier | ${mdCell(data.tierName ?? "Not Evaluated")} |`,
    `| Overall Score | ${mdCell(data.overallScore)}/10 |`,
    `| Active Demand Scenario | ${mdCell(data.activeScenarioName ?? "None")} |`,
    `| Active Failure Scenario | ${mdCell(data.activeFailureScenarioName ?? "None")} |`,
  ]
  return lines.join("\n")
}

function generateComponentDetails(components: ReportComponentData[]): string {
  if (components.length === 0) {
    return "## Component Details\n\nNo components in this architecture."
  }

  const sections = components.map((comp) => {
    const metricLines = comp.topMetrics.map(
      (m, i) => `  ${i + 1}. ${m.name} (${m.category}): ${m.numericValue}/10`,
    )

    return [
      `### ${mdCell(comp.componentName)} (${mdCell(comp.category)})`,
      "",
      `- **Variant:** ${mdCell(comp.activeVariantId)}`,
      `- **Overall Score:** ${comp.overallScore}/10`,
      `- **Health Status:** ${comp.heatmapStatus}`,
      "- **Top Metrics:**",
      ...metricLines,
    ].join("\n")
  })

  return `## Component Details\n\n${sections.join("\n\n")}`
}

function generateConstraintViolations(violations: ReportViolation[]): string {
  if (violations.length === 0) {
    return "## Constraint Violations\n\nNo constraint violations detected."
  }

  const header = [
    "## Constraint Violations",
    "",
    "| Constraint | Component | Category | Actual | Threshold | Operator |",
    "|-----------|-----------|----------|--------|-----------|----------|",
  ]

  const rows = violations.map(
    (v) => `| ${mdCell(v.constraintLabel)} | ${mdCell(v.nodeComponentName)} | ${mdCell(v.categoryName)} | ${mdCell(v.actualScore)} | ${mdCell(v.threshold)} | ${v.operator} |`,
  )

  return [...header, ...rows].join("\n")
}

function generateScenarioImpact(data: ReportData): string {
  const hasScenario = data.activeScenarioName !== null || data.activeFailureScenarioName !== null

  if (!hasScenario) {
    return "## Scenario Impact\n\nNo demand or failure scenario is currently active."
  }

  const lines = ["## Scenario Impact", ""]

  if (data.activeScenarioName) {
    lines.push(`**Active Demand Scenario:** ${data.activeScenarioName}`)
  }
  if (data.activeFailureScenarioName) {
    lines.push(`**Active Failure Scenario:** ${data.activeFailureScenarioName}`)
  }

  if (data.scenarioComparison.length > 0) {
    lines.push(
      "",
      "### Most Affected Components (Top 5 Lowest Scores)",
      "",
      "| Component | Overall Score | Health Status |",
      "|-----------|--------------|---------------|",
    )

    const sorted = [...data.scenarioComparison]
      .sort((a, b) => a.overallScore - b.overallScore)
      .slice(0, 5)

    for (const comp of sorted) {
      lines.push(`| ${mdCell(comp.componentName)} | ${comp.overallScore}/10 | ${comp.heatmapStatus} |`)
    }
  }

  return lines.join("\n")
}

function generateProvenanceFooter(): string {
  return [
    "---",
    "",
    "## Disclaimer",
    "",
    "This report was generated by Archie, an architecture simulator.",
    "All metric values are AI-generated directional estimates, not precise measurements.",
    "Scores are indicative (low/medium/high on a 1-10 scale) and should be used as",
    "a starting point for architectural discussion, not as definitive benchmarked assessments.",
    "",
    "Component data was generated using AI language models and reflects general",
    "industry knowledge. Actual performance characteristics depend on specific",
    "implementation, configuration, infrastructure, and workload patterns.",
  ].join("\n")
}

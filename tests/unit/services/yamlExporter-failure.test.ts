import { describe, it, expect } from "vitest"
import { load } from "js-yaml"
import { exportArchitecture } from "@/services/yamlExporter"
import { importYamlString } from "@/services/yamlImporter"
import { makeNode, makeEdge } from "../../helpers"

describe("yamlExporter/importer — failure scenario round-trip (AC-6)", () => {
  const nodes = [makeNode({ id: "n1", data: { archieComponentId: "postgresql" } })]
  const edges = [makeEdge({ id: "e1", source: "n1", target: "n1" })]

  it("exports active_failure_scenario_id when set", () => {
    const yaml = exportArchitecture(nodes, edges, undefined, undefined, undefined, undefined, "failure-database")
    const parsed = load(yaml) as Record<string, unknown>
    expect(parsed.active_failure_scenario_id).toBe("failure-database")
  })

  it("omits active_failure_scenario_id when null", () => {
    const yaml = exportArchitecture(nodes, edges, undefined, undefined, undefined, undefined, null)
    const parsed = load(yaml) as Record<string, unknown>
    expect(parsed).not.toHaveProperty("active_failure_scenario_id")
  })

  it("round-trip preserves failure scenario ID", () => {
    const yaml = exportArchitecture(nodes, edges, undefined, undefined, undefined, undefined, "failure-database")
    const result = importYamlString(yaml)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.architecture.activeFailureScenarioId).toBe("failure-database")
    }
  })

  it("round-trip preserves both demand + failure scenario IDs", () => {
    const yaml = exportArchitecture(nodes, edges, undefined, undefined, undefined, "traffic-peak", "failure-database")
    const result = importYamlString(yaml)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.architecture.activeScenarioId).toBe("traffic-peak")
      expect(result.architecture.activeFailureScenarioId).toBe("failure-database")
    }
  })

  // AC-7: Unknown failure ID → null on import
  it("import with unknown failure ID defaults to undefined", () => {
    const yaml = exportArchitecture(nodes, edges, undefined, undefined, undefined, undefined, "failure-database")
    // Manually inject unknown ID into the YAML
    const tampered = yaml.replace("failure-database", "failure-invented")
    const result = importYamlString(tampered)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.architecture.activeFailureScenarioId).toBeUndefined()
    }
  })
})

import { dump } from "js-yaml"
import { ArchitectureFileYamlSchema, CURRENT_SCHEMA_VERSION } from "@/schemas/architectureFileSchema"
import { DEFAULT_WEIGHT_PROFILE, isDefaultWeightProfile } from "@/lib/constants"
import type { WeightProfile, ParsedConstraint, DataContextItem } from "@/lib/constants"
import type { ArchieNode, ArchieEdge } from "@/stores/architectureStore"

/**
 * Exports canvas state to a skeleton YAML string.
 *
 * Dehydrates nodes and edges into the skeleton format: only IDs, positions,
 * component selections, and variant choices are included. Derived data
 * (metrics, heatmap, tier) is explicitly excluded (NFR11).
 *
 * Pipeline: extract skeleton from nodes → extract skeleton from edges
 * → assemble snake_case object → validate against ArchitectureFileYamlSchema
 * → js-yaml dump() → return YAML string
 *
 * @throws Error if the generated object fails schema validation (programming error, not user error)
 */
// Accepts ParsedConstraint[] (no runtime `id`). Constraint.id is intentionally
// stripped during export — only schema-level fields are serialized to YAML.
export function exportArchitecture(
  nodes: ArchieNode[],
  edges: ArchieEdge[],
  weightProfile?: WeightProfile,
  constraints?: ParsedConstraint[],
  dataContextItems?: Map<string, DataContextItem[]>,
  activeScenarioId?: string | null,
  activeFailureScenarioId?: string | null,
): string {
  // Extract skeleton from each node (camelCase → snake_case transform, inverse of import)
  // Story 7-3 AC-ARCH-PATTERN-2: data context exported PER-NODE (not top-level)
  const yamlNodes = nodes.map((node) => {
    const nodeObj: Record<string, unknown> = {
      id: node.id,
      component_id: node.data.archieComponentId,
      // config_variant_id: empty string → undefined so js-yaml omits the key
      // (schema requires z.string().min(1).optional() — empty string would fail validation)
      config_variant_id: node.data.activeConfigVariantId || undefined,
      position: { x: node.position.x, y: node.position.y },
    }
    // Epic 14: emit replicas only when > 1 (default 1 omitted for file compactness,
    // matching config_variant_id / weight_profile / constraints omit-default pattern)
    if (node.data.replicaCount > 1) {
      nodeObj.replicas = node.data.replicaCount
    }
    // Traffic Source config — emit only on traffic nodes when non-default (defaults omitted for compactness)
    if (node.data.componentCategory === "traffic" && node.data.trafficRps && node.data.trafficRps !== 3000) {
      nodeObj.traffic_rps = node.data.trafficRps // 3000 = TRAFFIC_RPS_STEPS[0] default
    }
    if (node.data.componentCategory === "traffic" && node.data.trafficKind && node.data.trafficKind !== "steady") {
      nodeObj.traffic_kind = node.data.trafficKind
    }
    if (node.data.componentCategory === "traffic" && node.data.trafficWorkload && node.data.trafficWorkload !== "mixed") {
      nodeObj.traffic_workload = node.data.trafficWorkload
    }
    if (node.data.componentCategory === "traffic" && node.data.trafficOrigin && node.data.trafficOrigin !== "one-region") {
      nodeObj.traffic_origin = node.data.trafficOrigin
    }
    // AC-ARCH-PATTERN-1: include data_context only when node has items
    // AC-ARCH-PATTERN-3: fit results NOT exported — only data definitions
    // AC-ARCH-PATTERN-5: camelCase → snake_case transform
    const items = dataContextItems?.get(node.id)
    if (items && items.length > 0) {
      nodeObj.data_context = items.map((item) => ({
        id: item.id,
        name: item.name,
        access_pattern: item.accessPattern,
        average_size: item.averageSize,
        structure_type: item.structureType,
      }))
    }
    return nodeObj
  })

  // Extract skeleton from each edge (camelCase → snake_case transform)
  // NOTE: edge.data (including labelOffset) is intentionally excluded —
  // only structural IDs are part of the architecture skeleton (NFR11, AC-ARCH-PATTERN-4)
  const yamlEdges = edges.map((edge) => {
    const edgeObj: Record<string, unknown> = {
      id: edge.id,
      source_node_id: edge.source,
      target_node_id: edge.target,
    }
    if (edge.data?.sourceHandleId) {
      edgeObj.source_handle_id = edge.data.sourceHandleId
    }
    if (edge.data?.targetHandleId) {
      edgeObj.target_handle_id = edge.data.targetHandleId
    }
    return edgeObj
  })

  // Assemble root object in logical field order (schema_version first)
  // AC-2 / AC-ARCH-PATTERN-1: omit weight_profile when all weights are default
  const resolvedProfile = weightProfile ?? { ...DEFAULT_WEIGHT_PROFILE }
  const exportObj: Record<string, unknown> = {
    schema_version: CURRENT_SCHEMA_VERSION,
    nodes: yamlNodes,
    edges: yamlEdges,
  }
  if (!isDefaultWeightProfile(resolvedProfile)) {
    exportObj.weight_profile = resolvedProfile
  }
  // AC-1 / AC-ARCH-PATTERN-1: include constraints only when non-empty
  // AC-ARCH-PATTERN-2: transform camelCase → snake_case, strip runtime `id`
  if (constraints && constraints.length > 0) {
    exportObj.constraints = constraints.map((c) => ({
      category_id: c.categoryId,
      operator: c.operator,
      threshold: c.threshold,
      label: c.label,
    }))
  }
  // Story 9-4: Include active scenario ID when set
  if (activeScenarioId) {
    exportObj.active_scenario_id = activeScenarioId
  }
  // Story 9-7: Include active failure scenario ID when set
  if (activeFailureScenarioId) {
    exportObj.active_failure_scenario_id = activeFailureScenarioId
  }

  // Validate against ArchitectureFileYamlSchema before serializing (AC-ARCH-PATTERN-3)
  // Uses the YAML variant (which includes .transform()) for simplicity — the transform
  // result is discarded; we only check .success to catch serialization bugs at the boundary
  const validation = ArchitectureFileYamlSchema.safeParse(exportObj)
  if (!validation.success) {
    if (import.meta.env.DEV) {
      console.warn("Export validation failed:", validation.error.flatten().fieldErrors)
    }
    throw new Error("Export failed: architecture data failed internal validation")
  }

  // Safe serialization — js-yaml dump() with default options (AC-7, AC-ARCH-NO-4)
  return dump(exportObj)
}

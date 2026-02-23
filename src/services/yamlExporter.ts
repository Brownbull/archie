import { dump } from "js-yaml"
import { ArchitectureFileYamlSchema, CURRENT_SCHEMA_VERSION } from "@/schemas/architectureFileSchema"
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
export function exportArchitecture(nodes: ArchieNode[], edges: ArchieEdge[]): string {
  // Extract skeleton from each node (camelCase → snake_case transform, inverse of import)
  const yamlNodes = nodes.map((node) => ({
    id: node.id,
    component_id: node.data.archieComponentId,
    // config_variant_id: empty string → undefined so js-yaml omits the key
    // (schema requires z.string().min(1).optional() — empty string would fail validation)
    config_variant_id: node.data.activeConfigVariantId || undefined,
    position: { x: node.position.x, y: node.position.y },
  }))

  // Extract skeleton from each edge (camelCase → snake_case transform)
  const yamlEdges = edges.map((edge) => ({
    id: edge.id,
    source_node_id: edge.source,
    target_node_id: edge.target,
  }))

  // Assemble root object in logical field order (schema_version first)
  const exportObj = {
    schema_version: CURRENT_SCHEMA_VERSION,
    nodes: yamlNodes,
    edges: yamlEdges,
  }

  // Validate against ArchitectureFileYamlSchema before serializing (AC-ARCH-PATTERN-3)
  // This catches any serialization bugs at the boundary — safeParse transforms to camelCase
  // internally but we only check .success (discard .data)
  const validation = ArchitectureFileYamlSchema.safeParse(exportObj)
  if (!validation.success) {
    throw new Error(
      `Export validation failed: ${validation.error.issues.map((i) => i.message).join(", ")}`,
    )
  }

  // Safe serialization — js-yaml dump() with default options (AC-7, AC-ARCH-NO-4)
  return dump(exportObj)
}

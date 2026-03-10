import { dump } from "js-yaml"
import { ArchitectureFileYamlSchema, CURRENT_SCHEMA_VERSION } from "@/schemas/architectureFileSchema"
import { DEFAULT_WEIGHT_PROFILE, isDefaultWeightProfile } from "@/lib/constants"
import type { WeightProfile, ParsedConstraint } from "@/lib/constants"
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
): string {
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
  // NOTE: edge.data (including labelOffset) is intentionally excluded —
  // only structural IDs are part of the architecture skeleton (NFR11, AC-ARCH-PATTERN-4)
  const yamlEdges = edges.map((edge) => ({
    id: edge.id,
    source_node_id: edge.source,
    target_node_id: edge.target,
  }))

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

  // Validate against ArchitectureFileYamlSchema before serializing (AC-ARCH-PATTERN-3)
  // Uses the YAML variant (which includes .transform()) for simplicity — the transform
  // result is discarded; we only check .success to catch serialization bugs at the boundary
  const validation = ArchitectureFileYamlSchema.safeParse(exportObj)
  if (!validation.success) {
    throw new Error(
      `Architecture data is invalid and cannot be exported: ${JSON.stringify(validation.error.flatten().fieldErrors)}`,
    )
  }

  // Safe serialization — js-yaml dump() with default options (AC-7, AC-ARCH-NO-4)
  return dump(exportObj)
}

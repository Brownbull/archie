import { load } from "js-yaml"
import {
  ArchitectureFileYamlSchema,
  checkSchemaVersion,
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
} from "@/schemas/architectureFileSchema"
import type { ArchitectureFile } from "@/schemas/architectureFileSchema"
import { componentLibrary } from "@/services/componentLibrary"
import { checkCompatibility } from "@/engine/compatibilityChecker"
import { sanitizeDisplayString } from "@/lib/sanitize"
import {
  CANVAS_GRID_SIZE,
  COMPONENT_CATEGORIES,
  EDGE_TYPE_CONNECTION,
  MAX_CANVAS_NODES,
  MAX_FILE_SIZE,
  NODE_TYPE_COMPONENT,
  NODE_TYPE_PLACEHOLDER,
  NODE_WIDTH,
  type ComponentCategoryId,
} from "@/lib/constants"
import type { ArchieNode, ArchieEdge, ArchieNodeData, ArchieEdgeData } from "@/stores/architectureStore"

export interface ImportError {
  code: string
  message: string
  path?: string
}

export interface HydratedArchitecture {
  nodes: ArchieNode[]
  edges: ArchieEdge[]
  placeholderIds: string[]
  name?: string
}

export type ImportResult =
  | { success: true; architecture: HydratedArchitecture }
  | { success: false; errors: ImportError[] }

const VALID_EXTENSIONS = [".yaml", ".yml"]

let importInProgress = false

/** @internal — exposed for test cleanup only */
export function _resetImportGuard(): void {
  importInProgress = false
}

function snapToGrid(value: number): number {
  return Math.round(value / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE
}

/**
 * Imports a YAML file and returns a hydrated architecture or errors.
 *
 * Pipeline: file size check → extension check → parse YAML → validate schema
 * → version check → sanitize strings → hydrate from library → build edges
 */
export async function importYaml(file: File): Promise<ImportResult> {
  // Concurrent import guard (TD-3-1a AC-4)
  if (importInProgress) {
    return {
      success: false,
      errors: [{ code: "IMPORT_IN_PROGRESS", message: "An import is already in progress" }],
    }
  }

  importInProgress = true
  try {
    // Step 1: File size check
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        errors: [{ code: "FILE_TOO_LARGE", message: `File too large (max ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB)` }],
      }
    }

    // Step 2: Extension check
    const fileName = file.name.toLowerCase()
    const hasValidExtension = VALID_EXTENSIONS.some((ext) => fileName.endsWith(ext))
    if (!hasValidExtension) {
      return {
        success: false,
        errors: [{ code: "INVALID_EXTENSION", message: "Only .yaml and .yml files are accepted" }],
      }
    }

    // Step 3: Read file content
    const text = await file.text()

    // Delegate to core import logic
    return importYamlString(text)
  } finally {
    importInProgress = false
  }
}

/**
 * Core import logic — accepts a YAML string and returns hydrated architecture or errors.
 * Separated from file handling for testability.
 */
export function importYamlString(text: string): ImportResult {
  // Step 3: Parse YAML
  let parsed: unknown
  try {
    parsed = load(text)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to parse YAML"
    return {
      success: false,
      errors: [{ code: "YAML_PARSE_ERROR", message }],
    }
  }

  if (typeof parsed !== "object" || parsed === null) {
    return {
      success: false,
      errors: [{ code: "YAML_PARSE_ERROR", message: "YAML content must be an object" }],
    }
  }

  // Step 4: Schema validation (snake_case → camelCase transform)
  const schemaResult = ArchitectureFileYamlSchema.safeParse(parsed)
  if (!schemaResult.success) {
    const errors: ImportError[] = schemaResult.error.issues.map((issue) => ({
      code: "SCHEMA_VALIDATION_ERROR",
      message: issue.message,
      path: issue.path.join("."),
    }))
    return { success: false, errors }
  }

  const data: ArchitectureFile = schemaResult.data

  // Step 4b: Node count check (defense-in-depth — reject at import, not just canvas)
  if (data.nodes.length > MAX_CANVAS_NODES) {
    return {
      success: false,
      errors: [{
        code: "TOO_MANY_NODES",
        message: `Architecture has ${data.nodes.length} components (max ${MAX_CANVAS_NODES}). Reduce before importing.`,
      }],
    }
  }

  // Step 4c: Duplicate node ID detection
  const nodeIds = new Set<string>()
  const duplicateIds: string[] = []
  for (const node of data.nodes) {
    if (nodeIds.has(node.id)) {
      duplicateIds.push(node.id)
    }
    nodeIds.add(node.id)
  }
  if (duplicateIds.length > 0) {
    return {
      success: false,
      errors: [{
        code: "DUPLICATE_NODE_IDS",
        message: `Duplicate node IDs found: ${duplicateIds.join(", ")}`,
      }],
    }
  }

  // Step 5: Version check
  const versionStatus = checkSchemaVersion(data.schemaVersion, CURRENT_SCHEMA_VERSION)
  if (versionStatus === "too-new") {
    return {
      success: false,
      errors: [{
        code: "VERSION_TOO_NEW",
        message: `This file was created with a newer version of Archie (schema ${data.schemaVersion}). Please update Archie.`,
      }],
    }
  }
  if (versionStatus === "too-old") {
    return {
      success: false,
      errors: [{
        code: "VERSION_TOO_OLD",
        message: `Schema version ${data.schemaVersion} is no longer supported. No migration available.`,
      }],
    }
  }
  if (versionStatus === "migrate") {
    const migrationKey = String(data.schemaVersion.split(".")[0])
    const migrateFn = MIGRATIONS[migrationKey]
    if (migrateFn) {
      Object.assign(data, migrateFn(data))
    }
  }

  // Step 6: Sanitize strings
  const sanitizedName = data.name ? sanitizeDisplayString(data.name) : undefined

  // Step 7: Hydrate nodes from component library
  const hydratedNodes: ArchieNode[] = []
  const placeholderIds: string[] = []

  for (const yamlNode of data.nodes) {
    // NFC-normalize componentId to prevent Unicode mismatch (TD-3-1a AC-3)
    const normalizedComponentId = yamlNode.componentId.normalize("NFC")
    const component = componentLibrary.getComponent(normalizedComponentId)

    if (!component) {
      // Create placeholder node for unknown component
      placeholderIds.push(yamlNode.id)
      hydratedNodes.push({
        id: yamlNode.id,
        type: NODE_TYPE_PLACEHOLDER,
        position: {
          x: snapToGrid(yamlNode.position.x),
          y: snapToGrid(yamlNode.position.y),
        },
        data: {
          archieComponentId: normalizedComponentId,
          activeConfigVariantId: "",
          componentName: yamlNode.componentId,
          componentCategory: "compute" as ComponentCategoryId,
        } as ArchieNodeData,
        width: NODE_WIDTH,
      } as unknown as ArchieNode)
      continue
    }

    // Find requested variant, fall back to first
    const variant = yamlNode.configVariantId
      ? component.configVariants.find((v) => v.id === yamlNode.configVariantId)
          ?? component.configVariants[0]
      : component.configVariants[0]

    hydratedNodes.push({
      id: yamlNode.id,
      type: NODE_TYPE_COMPONENT,
      position: {
        x: snapToGrid(yamlNode.position.x),
        y: snapToGrid(yamlNode.position.y),
      },
      data: {
        archieComponentId: normalizedComponentId,
        activeConfigVariantId: variant?.id ?? "",
        componentName: sanitizeDisplayString(component.name),
        componentCategory: (component.category in COMPONENT_CATEGORIES
          ? component.category
          : "compute") as ComponentCategoryId,
      },
      width: NODE_WIDTH,
    })
  }

  // Step 8: Build edges with compatibility check
  const nodeMap = new Map(hydratedNodes.map((n) => [n.id, n]))
  const hydratedEdges: ArchieEdge[] = []

  for (const yamlEdge of data.edges) {
    const sourceNode = nodeMap.get(yamlEdge.sourceNodeId)
    const targetNode = nodeMap.get(yamlEdge.targetNodeId)

    const sourceComponentId = sourceNode?.data.archieComponentId ?? ""
    const targetComponentId = targetNode?.data.archieComponentId ?? ""

    const sourceComponent = sourceComponentId
      ? componentLibrary.getComponent(sourceComponentId)
      : undefined
    const targetComponent = targetComponentId
      ? componentLibrary.getComponent(targetComponentId)
      : undefined

    const compatResult = checkCompatibility(sourceComponent, targetComponent)

    hydratedEdges.push({
      id: yamlEdge.id,
      source: yamlEdge.sourceNodeId,
      target: yamlEdge.targetNodeId,
      type: EDGE_TYPE_CONNECTION,
      data: {
        isIncompatible: !compatResult.isCompatible,
        incompatibilityReason: compatResult.reason || null,
        sourceArchieComponentId: sourceComponentId,
        targetArchieComponentId: targetComponentId,
      } as ArchieEdgeData,
    })
  }

  // Step 9: Return hydrated architecture
  return {
    success: true,
    architecture: {
      nodes: hydratedNodes,
      edges: hydratedEdges,
      placeholderIds,
      name: sanitizedName,
    },
  }
}

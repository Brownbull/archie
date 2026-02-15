import { z } from "zod"

export const CURRENT_SCHEMA_VERSION = "1.0.0"

export const MIGRATIONS: Record<string, (data: unknown) => unknown> = {}

const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
}).strict()

export const ArchitectureFileNodeSchema = z.object({
  id: z.string().min(1),
  componentId: z.string().min(1),
  configVariantId: z.string().min(1).optional(),
  position: PositionSchema,
}).strict()

export const ArchitectureFileEdgeSchema = z.object({
  id: z.string().min(1),
  sourceNodeId: z.string().min(1),
  targetNodeId: z.string().min(1),
}).strict()

export const ArchitectureFileSchema = z.object({
  schemaVersion: z.string().min(1),
  libraryVersion: z.string().optional(),
  name: z.string().optional(),
  nodes: z.array(ArchitectureFileNodeSchema),
  edges: z.array(ArchitectureFileEdgeSchema),
}).strict()

// YAML input variant: accepts snake_case fields and transforms to camelCase
const ArchitectureFileNodeYamlSchema = z.object({
  id: z.string().min(1),
  component_id: z.string().min(1),
  config_variant_id: z.string().min(1).optional(),
  position: PositionSchema,
}).strict().transform((data) => ({
  id: data.id,
  componentId: data.component_id,
  configVariantId: data.config_variant_id,
  position: data.position,
}))

const ArchitectureFileEdgeYamlSchema = z.object({
  id: z.string().min(1),
  source_node_id: z.string().min(1),
  target_node_id: z.string().min(1),
}).strict().transform((data) => ({
  id: data.id,
  sourceNodeId: data.source_node_id,
  targetNodeId: data.target_node_id,
}))

export const ArchitectureFileYamlSchema = z.object({
  schema_version: z.string().min(1),
  library_version: z.string().optional(),
  name: z.string().optional(),
  nodes: z.array(ArchitectureFileNodeYamlSchema),
  edges: z.array(ArchitectureFileEdgeYamlSchema),
}).strict().transform((data) => ({
  schemaVersion: data.schema_version,
  libraryVersion: data.library_version,
  name: data.name,
  nodes: data.nodes,
  edges: data.edges,
}))

export type ArchitectureFile = z.infer<typeof ArchitectureFileSchema>
export type ArchitectureFileNode = z.infer<typeof ArchitectureFileNodeSchema>
export type ArchitectureFileEdge = z.infer<typeof ArchitectureFileEdgeSchema>

/**
 * Compares a file's schema version against the app's current version.
 * Returns:
 * - "compatible": same major version (minor/patch differences are fine)
 * - "too-new": file major > app major (created with newer Archie)
 * - "migrate": file major < app major and migration exists
 * - "too-old": file major < app major and no migration
 */
export function checkSchemaVersion(
  fileVersion: string,
  appVersion: string,
): "compatible" | "migrate" | "too-new" | "too-old" {
  const fileParts = fileVersion.split(".").map(Number)
  const appParts = appVersion.split(".").map(Number)
  const fileMajor = fileParts[0] ?? 0
  const appMajor = appParts[0] ?? 0

  if (fileMajor === appMajor) return "compatible"
  if (fileMajor > appMajor) return "too-new"

  // File is older major — check for migration
  const migrationKey = String(fileMajor)
  if (migrationKey in MIGRATIONS) return "migrate"
  return "too-old"
}

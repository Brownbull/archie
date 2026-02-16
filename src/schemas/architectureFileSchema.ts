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

/** Discriminated union for schema version check results */
export type VersionStatus =
  | { status: "compatible" }
  | { status: "too-new" }
  | { status: "migrate"; migrationKey: number }
  | { status: "too-old" }
  | { status: "invalid-format"; reason: string }

/**
 * Compares a file's schema version against the app's current version.
 * Returns a discriminated union so callers get exhaustive TypeScript checking.
 */
export function checkSchemaVersion(
  fileVersion: string,
  appVersion: string,
): VersionStatus {
  const fileParts = fileVersion.split(".").map(Number)
  const appParts = appVersion.split(".").map(Number)
  const fileMajor = fileParts[0]
  const appMajor = appParts[0]

  if (fileMajor === undefined || isNaN(fileMajor)) {
    return { status: "invalid-format", reason: `Invalid file schema version: "${fileVersion}"` }
  }
  if (appMajor === undefined || isNaN(appMajor)) {
    return { status: "invalid-format", reason: `Invalid app schema version: "${appVersion}"` }
  }

  if (fileMajor === appMajor) return { status: "compatible" }
  if (fileMajor > appMajor) return { status: "too-new" }

  // File is older major — check for migration
  const migrationKey = String(fileMajor)
  if (migrationKey in MIGRATIONS) return { status: "migrate", migrationKey: fileMajor }
  return { status: "too-old" }
}

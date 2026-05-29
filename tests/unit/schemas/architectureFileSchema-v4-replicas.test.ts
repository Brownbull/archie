import { describe, it, expect } from "vitest"
import {
  ArchitectureFileNodeSchema,
  ArchitectureFileSchema,
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
  checkSchemaVersion,
} from "@/schemas/architectureFileSchema"

const baseNode = { id: "n1", componentId: "postgresql", position: { x: 0, y: 0 } }

describe("ArchitectureFileNode replicas field (Epic 14, schema v4)", () => {
  it("CURRENT_SCHEMA_VERSION is 4.0.0", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe("4.0.0")
  })

  it("accepts a node with no replicas (backward compatible)", () => {
    expect(ArchitectureFileNodeSchema.safeParse(baseNode).success).toBe(true)
  })

  it("accepts replicas at the lower and upper bounds", () => {
    expect(ArchitectureFileNodeSchema.safeParse({ ...baseNode, replicas: 1 }).success).toBe(true)
    expect(ArchitectureFileNodeSchema.safeParse({ ...baseNode, replicas: 20 }).success).toBe(true)
  })

  it("rejects replicas below 1, above 20, or non-integer", () => {
    expect(ArchitectureFileNodeSchema.safeParse({ ...baseNode, replicas: 0 }).success).toBe(false)
    expect(ArchitectureFileNodeSchema.safeParse({ ...baseNode, replicas: 21 }).success).toBe(false)
    expect(ArchitectureFileNodeSchema.safeParse({ ...baseNode, replicas: 2.5 }).success).toBe(false)
  })
})

describe("v3 → v4 migration", () => {
  it("registers a migration function for major version 3", () => {
    expect(MIGRATIONS["3"]).toBeTypeOf("function")
  })

  it("routes a 3.0.0 file to migrate (not too-old)", () => {
    expect(checkSchemaVersion("3.0.0", CURRENT_SCHEMA_VERSION)).toEqual({
      status: "migrate",
      migrationKey: 3,
    })
  })

  it("bumps schemaVersion to 4.0.0 and preserves existing nodes", () => {
    const v3 = {
      schemaVersion: "3.0.0",
      nodes: [{ id: "n1", componentId: "postgresql", position: { x: 0, y: 0 } }],
      edges: [],
    }
    const migrated = MIGRATIONS["3"](v3) as { schemaVersion: string; nodes: unknown[] }
    expect(migrated.schemaVersion).toBe("4.0.0")
    expect(migrated.nodes).toEqual(v3.nodes)
    // Migrated (camelCase) data must satisfy the current schema
    expect(ArchitectureFileSchema.safeParse(migrated).success).toBe(true)
  })

  it("throws on non-object migration input", () => {
    expect(() => MIGRATIONS["3"](null)).toThrow()
  })
})

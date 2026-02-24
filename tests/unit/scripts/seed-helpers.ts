/**
 * Shared test helpers for seed script tests.
 *
 * Provides factory functions for:
 * - YAML component fixtures (snake_case, for ComponentYamlSchema)
 * - Service account JSON fixtures
 * - Mock Firestore database with full WriteBatch interface
 * - CamelCase Component objects (for seedToFirestore tests)
 */

import { vi, expect } from "vitest"
import { dump } from "js-yaml"
import { readdirSync, readFileSync, statSync } from "node:fs"
import type { Component } from "@/schemas/componentSchema"
import type { BlueprintFull } from "@/schemas/blueprintSchema"
import type { seedToFirestore, SeedLogger } from "../../../scripts/seed-firestore"

/** No-op logger that suppresses all output. Use in tests that don't check log messages. */
export const noopLogger: SeedLogger = {
  log: () => {},
  warn: () => {},
  error: () => {},
}

/**
 * Creates a valid snake_case YAML string that passes ComponentYamlSchema validation.
 * Use this when testing YAML parsing / loadAndValidateComponents.
 */
export function makeComponentYaml(id: string): string {
  return dump({
    id,
    name: `Component ${id}`,
    category: "data-storage",
    description: `Description for ${id}`,
    is: `A test component ${id}`,
    gain: ["Fast"],
    cost: ["Expensive"],
    tags: ["test"],
    base_metrics: [
      { id: "latency", value: "low", numeric_value: 3, category: "performance" },
    ],
    config_variants: [
      {
        id: "default",
        name: "Default",
        metrics: [
          { id: "latency", value: "low", numeric_value: 3, category: "performance" },
        ],
      },
    ],
  })
}

/**
 * Creates a valid service account JSON string.
 * Use this when testing validateServiceAccountFile.
 */
export function makeServiceAccountJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    project_id: "my-project",
    private_key: "-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----\n",
    client_email: "test@my-project.iam.gserviceaccount.com",
    ...overrides,
  })
}

/**
 * Creates a mock Firestore db with full WriteBatch interface stubs.
 * All batch methods (set, commit, create, update, delete) are vi.fn() mocks.
 * The returned `db` satisfies `Parameters<typeof seedToFirestore>[0]` without unsafe casts.
 */
export function createMockDb() {
  const commitFn = vi.fn().mockResolvedValue(undefined)
  const setFn = vi.fn()
  const createFn = vi.fn()
  const updateFn = vi.fn()
  const deleteFn = vi.fn()
  const batchFn = vi.fn(() => ({
    set: setFn,
    commit: commitFn,
    create: createFn,
    update: updateFn,
    delete: deleteFn,
  }))
  const docFn = vi.fn((docId: string) => ({ id: docId }))
  const collectionFn = vi.fn(() => ({ doc: docFn }))

  return {
    db: { batch: batchFn, collection: collectionFn } as Parameters<typeof seedToFirestore>[0],
    mocks: { commitFn, setFn, createFn, updateFn, deleteFn, batchFn, docFn, collectionFn },
  }
}

/**
 * Returns a partial Stats-like object for mocking statSync.
 * Eliminates `as ReturnType<typeof statSync>` casts in tests.
 */
export function mockStatResult(size: number) {
  return { size } as import("node:fs").Stats
}

/**
 * Returns a string array typed as readdirSync return value.
 * Eliminates `as unknown as DirEntries` double-casts in tests.
 */
export function mockDirEntries(...files: string[]) {
  return files as unknown as ReturnType<typeof import("node:fs").readdirSync>
}

/**
 * Creates a BlueprintFull object for seedBlueprintsToFirestore tests.
 */
export function makeBlueprintFull(id: string): BlueprintFull {
  return {
    id,
    name: `Blueprint ${id}`,
    description: `Description for blueprint ${id}`,
    skeleton: {
      schemaVersion: "1.0.0",
      nodes: [
        {
          id: "node-1",
          componentId: "nginx",
          configVariantId: "load-balancer",
          position: { x: 96, y: 192 },
        },
      ],
      edges: [],
    },
  }
}

/**
 * Creates a valid blueprint YAML string that passes BlueprintFullYamlSchema validation.
 */
export function makeBlueprintYaml(id: string): string {
  return dump({
    id,
    name: `Blueprint ${id}`,
    description: `Description for blueprint ${id}`,
    skeleton: {
      schema_version: "1.0.0",
      nodes: [
        {
          id: "node-1",
          component_id: "nginx",
          config_variant_id: "load-balancer",
          position: { x: 96, y: 192 },
        },
      ],
      edges: [],
    },
  })
}

/**
 * Asserts fail-fast behavior for a loader function.
 *
 * Sets up two fixture files (valid.yaml + bad.yaml), calls the loader, and asserts:
 * - The loader throws "Validation failed" (not abort-on-first but collect-then-throw)
 * - The loader did NOT return a partial result (no-partial-return contract):
 *   `result` must be `undefined` when the loader throws.
 * - The valid file was logged successfully (stringContaining "valid")
 * - The invalid file produced a Zod validation error log
 *
 * Requires: the test file must import "./seed-mocks" before calling this helper,
 * so that node:fs is already mocked via vi.mock.
 * IMPORTANT: Call this only inside an `it()` body — NOT in beforeEach, otherwise
 * vi.resetAllMocks() will clear the mocks before the assertions run.
 *
 * @param loader - The loader function under test (e.g., loadAndValidateBlueprints)
 * @param validYaml - Valid YAML string for the "valid.yaml" fixture file
 * @param invalidYaml - Invalid YAML string for the "bad.yaml" fixture file
 * @param dir - Optional directory arg passed to the loader (default: "/fake/dir")
 */
export function assertFailFastBehavior(
  loader: (dir: string, logger: SeedLogger) => unknown,
  validYaml: string,
  invalidYaml: string,
  dir = "/fake/dir",
): void {
  vi.mocked(readdirSync).mockReturnValue(mockDirEntries("valid.yaml", "bad.yaml"))
  vi.mocked(statSync).mockReturnValue(mockStatResult(500))
  vi.mocked(readFileSync).mockImplementation((filePath) => {
    if (String(filePath).includes("valid")) return validYaml
    return invalidYaml
  })

  const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }

  // Explicit no-partial-return contract: the loader must throw and must never
  // hand back a partial result. Wrapping in try/catch lets us assert both.
  let result: unknown
  let caughtError: unknown
  try {
    result = loader(dir, logger)
  } catch (err) {
    caughtError = err
  }
  if (caughtError === undefined) {
    throw new Error("assertFailFastBehavior: loader did not throw — fail-fast contract violated")
  }
  expect(caughtError).toBeInstanceOf(Error)
  expect((caughtError as Error).message).toContain("Validation failed")
  expect(result).toBeUndefined()
  expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("valid.yaml"))
  expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Zod validation failed"))
}

/**
 * Creates a camelCase Component object matching the ComponentSchema type.
 * Use this in seedToFirestore tests instead of inline object literals.
 */
export function makeComponent(id: string): Component {
  return {
    id,
    name: `Component ${id}`,
    category: "data-storage",
    description: `Desc ${id}`,
    is: `Is ${id}`,
    gain: ["Fast"],
    cost: ["Expensive"],
    tags: ["test"],
    baseMetrics: [
      { id: "latency", value: "low" as const, numericValue: 3, category: "performance" },
    ],
    configVariants: [
      {
        id: "default",
        name: "Default",
        metrics: [
          { id: "latency", value: "low" as const, numericValue: 3, category: "performance" },
        ],
      },
    ],
  }
}

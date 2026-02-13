/**
 * Shared test helpers for seed script tests.
 *
 * Provides factory functions for:
 * - YAML component fixtures (snake_case, for ComponentYamlSchema)
 * - Service account JSON fixtures
 * - Mock Firestore database with full WriteBatch interface
 * - CamelCase Component objects (for seedToFirestore tests)
 */

import { vi } from "vitest"
import { dump } from "js-yaml"
import type { Component } from "@/schemas/componentSchema"
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

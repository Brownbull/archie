/**
 * Shared vi.mock setup for seed script tests.
 *
 * Import this module at the top of any seed test file to register
 * the node:fs and firebase-admin mocks.
 *
 * IMPORTANT: Each consuming test file MUST call vi.resetAllMocks()
 * in its own beforeEach to prevent cross-test mock contamination.
 */

import { vi } from "vitest"

// Mock node:fs — partial mock with explicit default export
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>()
  const mocked = {
    ...actual,
    existsSync: vi.fn(() => true),
    readdirSync: vi.fn(),
    readFileSync: vi.fn(),
    statSync: vi.fn(() => ({ size: 100 })),
  }
  return { ...mocked, default: mocked }
})

// Mock firebase-admin (script imports these at top level)
vi.mock("firebase-admin/app", () => ({
  initializeApp: vi.fn(),
  cert: vi.fn(),
}))

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: vi.fn(),
}))

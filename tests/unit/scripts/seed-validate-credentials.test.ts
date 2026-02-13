import { describe, it, expect, vi, beforeEach } from "vitest"
import { validateServiceAccountFile } from "../../../scripts/seed-firestore"
import { makeServiceAccountJson, mockStatResult } from "./seed-helpers"

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

import { existsSync, readFileSync, statSync } from "node:fs"

const mockedExistsSync = vi.mocked(existsSync)
const mockedReadFileSync = vi.mocked(readFileSync)
const mockedStatSync = vi.mocked(statSync)

beforeEach(() => {
  vi.resetAllMocks()
})

describe("validateServiceAccountFile", () => {
  it("returns parsed ServiceAccount when file is valid", () => {
    mockedExistsSync.mockReturnValue(true)
    mockedStatSync.mockReturnValue(mockStatResult(500))
    mockedReadFileSync.mockReturnValue(makeServiceAccountJson())

    const result = validateServiceAccountFile("/fake/creds.json")
    expect(result).toHaveProperty("project_id", "my-project")
  })

  it("throws when file does not exist", () => {
    mockedExistsSync.mockReturnValue(false)

    expect(() => validateServiceAccountFile("/fake/creds.json"))
      .toThrow("Service account file not found: /fake/creds.json")
  })

  it("accepts file at exactly 10KB boundary", () => {
    mockedExistsSync.mockReturnValue(true)
    mockedStatSync.mockReturnValue(mockStatResult(10 * 1024))
    mockedReadFileSync.mockReturnValue(makeServiceAccountJson())

    const result = validateServiceAccountFile("/fake/creds.json")
    expect(result).toHaveProperty("project_id", "my-project")
  })

  it("throws when file exceeds 10KB", () => {
    mockedExistsSync.mockReturnValue(true)
    mockedStatSync.mockReturnValue(mockStatResult(10 * 1024 + 1))

    expect(() => validateServiceAccountFile("/fake/creds.json"))
      .toThrow("Service account file too large")
  })

  it("throws when file contains invalid JSON", () => {
    mockedExistsSync.mockReturnValue(true)
    mockedStatSync.mockReturnValue(mockStatResult(100))
    mockedReadFileSync.mockReturnValue("not valid json {{{")

    expect(() => validateServiceAccountFile("/fake/creds.json"))
      .toThrow("not valid JSON")
  })

  it("throws when project_id is missing", () => {
    mockedExistsSync.mockReturnValue(true)
    mockedStatSync.mockReturnValue(mockStatResult(100))
    mockedReadFileSync.mockReturnValue(makeServiceAccountJson({ project_id: undefined }))

    expect(() => validateServiceAccountFile("/fake/creds.json"))
      .toThrow("missing required field: project_id")
  })

  it("throws when private_key is missing", () => {
    mockedExistsSync.mockReturnValue(true)
    mockedStatSync.mockReturnValue(mockStatResult(100))
    mockedReadFileSync.mockReturnValue(makeServiceAccountJson({ private_key: undefined }))

    expect(() => validateServiceAccountFile("/fake/creds.json"))
      .toThrow("missing required field: private_key")
  })

  it("throws when client_email is missing", () => {
    mockedExistsSync.mockReturnValue(true)
    mockedStatSync.mockReturnValue(mockStatResult(100))
    mockedReadFileSync.mockReturnValue(makeServiceAccountJson({ client_email: undefined }))

    expect(() => validateServiceAccountFile("/fake/creds.json"))
      .toThrow("missing required field: client_email")
  })

  it("throws when required field is empty string", () => {
    mockedExistsSync.mockReturnValue(true)
    mockedStatSync.mockReturnValue(mockStatResult(100))
    mockedReadFileSync.mockReturnValue(makeServiceAccountJson({ project_id: "" }))

    expect(() => validateServiceAccountFile("/fake/creds.json"))
      .toThrow("missing required field: project_id")
  })
})

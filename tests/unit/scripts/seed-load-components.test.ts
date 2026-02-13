import { describe, it, expect, vi, beforeEach } from "vitest"
import "./seed-mocks"
import { dump } from "js-yaml"
import { loadAndValidateComponents } from "../../../scripts/seed-firestore"
import { makeComponentYaml, mockDirEntries, mockStatResult, noopLogger } from "./seed-helpers"

import { readdirSync, readFileSync, statSync } from "node:fs"

const mockedReaddirSync = vi.mocked(readdirSync)
const mockedReadFileSync = vi.mocked(readFileSync)
const mockedStatSync = vi.mocked(statSync)

beforeEach(() => {
  vi.resetAllMocks()
})

describe("loadAndValidateComponents", () => {
  it("loads and validates valid YAML files", () => {
    mockedReaddirSync.mockReturnValue(mockDirEntries("comp-a.yaml", "comp-b.yaml"))
    mockedReadFileSync.mockImplementation((filePath) => {
      const path = String(filePath)
      if (path.includes("comp-a")) return makeComponentYaml("comp-a")
      if (path.includes("comp-b")) return makeComponentYaml("comp-b")
      return ""
    })

    const result = loadAndValidateComponents("/fake/data", noopLogger)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe("comp-a")
    expect(result[1].id).toBe("comp-b")
  })

  it("ignores non-YAML files", () => {
    mockedReaddirSync.mockReturnValue(mockDirEntries("comp.yaml", "readme.md", "data.json"))
    mockedReadFileSync.mockReturnValue(makeComponentYaml("comp"))

    const result = loadAndValidateComponents("/fake/data", noopLogger)
    expect(result).toHaveLength(1)
    expect(mockedReadFileSync).toHaveBeenCalledTimes(1)
  })

  it("throws on malformed YAML syntax", () => {
    mockedReaddirSync.mockReturnValue(mockDirEntries("bad.yaml"))
    mockedReadFileSync.mockReturnValue("invalid: yaml: [unterminated")

    expect(() => loadAndValidateComponents("/fake/data", noopLogger)).toThrow("Validation failed")
  })

  it("throws on Zod validation failure (missing required fields)", () => {
    mockedReaddirSync.mockReturnValue(mockDirEntries("incomplete.yaml"))
    mockedReadFileSync.mockReturnValue(dump({ id: "incomplete" }))

    expect(() => loadAndValidateComponents("/fake/data", noopLogger)).toThrow("Validation failed")
  })

  it("returns empty array when no YAML files exist", () => {
    mockedReaddirSync.mockReturnValue(mockDirEntries())

    const result = loadAndValidateComponents("/fake/data", noopLogger)
    expect(result).toHaveLength(0)
  })

  it("rejects files exceeding MAX_YAML_FILE_SIZE (1MB)", () => {
    mockedReaddirSync.mockReturnValue(mockDirEntries("huge.yaml"))
    mockedStatSync.mockReturnValue(mockStatResult(1024 * 1024 + 1))

    expect(() => loadAndValidateComponents("/fake/data", noopLogger)).toThrow("Validation failed")
  })

  it("rejects YAML with empty required string fields", () => {
    mockedReaddirSync.mockReturnValue(mockDirEntries("empty-name.yaml"))
    mockedReadFileSync.mockReturnValue(dump({
      id: "test",
      name: "",
      category: "data-storage",
      description: "A description",
      is: "Something",
      gain: ["Fast"],
      cost: ["Expensive"],
      tags: ["test"],
      base_metrics: [{ id: "latency", value: "low", numeric_value: 3, category: "performance" }],
      config_variants: [{ id: "default", name: "Default", metrics: [{ id: "latency", value: "low", numeric_value: 3, category: "performance" }] }],
    }))

    expect(() => loadAndValidateComponents("/fake/data", noopLogger)).toThrow("Validation failed")
  })
})

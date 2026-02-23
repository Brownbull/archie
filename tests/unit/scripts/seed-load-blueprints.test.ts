import { describe, it, expect, vi, beforeEach } from "vitest"
import "./seed-mocks"
import { dump } from "js-yaml"
import { loadAndValidateBlueprints } from "../../../scripts/seed-firestore"
import { noopLogger, makeBlueprintYaml, mockStatResult, mockDirEntries } from "./seed-helpers"

import { readdirSync, readFileSync, statSync } from "node:fs"

const mockedReaddirSync = vi.mocked(readdirSync)
const mockedReadFileSync = vi.mocked(readFileSync)
const mockedStatSync = vi.mocked(statSync)

beforeEach(() => {
  vi.resetAllMocks()
})

describe("loadAndValidateBlueprints", () => {
  it("returns empty array when no YAML files found", () => {
    mockedReaddirSync.mockReturnValue(mockDirEntries())

    const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const result = loadAndValidateBlueprints("/fake/dir", logger)

    expect(result).toEqual([])
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("No blueprint YAML files found"))
  })

  it("loads and validates a valid blueprint YAML file", () => {
    mockedReaddirSync.mockReturnValue(mockDirEntries("whatsapp-messaging.yaml"))
    mockedStatSync.mockReturnValue(mockStatResult(500))
    mockedReadFileSync.mockReturnValue(makeBlueprintYaml("whatsapp-messaging"))

    const result = loadAndValidateBlueprints("/fake/dir", noopLogger)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("whatsapp-messaging")
  })

  it("loads multiple blueprint files", () => {
    mockedReaddirSync.mockReturnValue(mockDirEntries("whatsapp-messaging.yaml", "telegram-messaging.yaml"))
    mockedStatSync.mockReturnValue(mockStatResult(500))
    mockedReadFileSync.mockImplementation((filePath) => {
      const path = String(filePath)
      if (path.includes("whatsapp")) return makeBlueprintYaml("whatsapp-messaging")
      return makeBlueprintYaml("telegram-messaging")
    })

    const result = loadAndValidateBlueprints("/fake/dir", noopLogger)

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe("whatsapp-messaging")
    expect(result[1].id).toBe("telegram-messaging")
  })

  it("throws when any blueprint fails validation (missing skeleton)", () => {
    mockedReaddirSync.mockReturnValue(mockDirEntries("bad-blueprint.yaml"))
    mockedStatSync.mockReturnValue(mockStatResult(100))
    mockedReadFileSync.mockReturnValue(dump({
      id: "bad-blueprint",
      name: "Bad Blueprint",
      description: "Missing skeleton",
    }))

    expect(() => loadAndValidateBlueprints("/fake/dir", noopLogger)).toThrow()
  })

  it("rejects files over 1MB size limit", () => {
    mockedReaddirSync.mockReturnValue(mockDirEntries("big.yaml"))
    mockedStatSync.mockReturnValue(mockStatResult(2 * 1024 * 1024))

    const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    expect(() => loadAndValidateBlueprints("/fake/dir", logger)).toThrow()
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("File too large"))
  })

  it("rejects malformed YAML syntax", () => {
    mockedReaddirSync.mockReturnValue(mockDirEntries("bad.yaml"))
    mockedStatSync.mockReturnValue(mockStatResult(100))
    mockedReadFileSync.mockReturnValue("{{invalid: yaml: [unterminated")

    const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    expect(() => loadAndValidateBlueprints("/fake/dir", logger)).toThrow()
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("YAML parse failed"))
  })

  it("skeleton has camelCase structure after transform", () => {
    mockedReaddirSync.mockReturnValue(mockDirEntries("whatsapp-messaging.yaml"))
    mockedStatSync.mockReturnValue(mockStatResult(500))
    mockedReadFileSync.mockReturnValue(makeBlueprintYaml("whatsapp-messaging"))

    const result = loadAndValidateBlueprints("/fake/dir", noopLogger)

    expect(result).toHaveLength(1)
    expect(result[0].skeleton.schemaVersion).toBe("1.0.0")
    expect(result[0].skeleton.nodes[0]?.componentId).toBe("nginx")
    expect(result[0].skeleton.nodes[0]?.configVariantId).toBe("load-balancer")
  })
})

import { describe, it, expect } from "vitest"
import { getFailureModifiersForScenario } from "@/stores/architectureStoreHelpers"

describe("getFailureModifiersForScenario", () => {
  it("returns null for null input", () => {
    expect(getFailureModifiersForScenario(null)).toBeNull()
  })

  it("returns modifiers for known failure preset", () => {
    const result = getFailureModifiersForScenario("failure-database")
    expect(result).not.toBeNull()
    expect(result!["data-durability"]).toBe(0.3)
    expect(result!["read-latency"]).toBe(0.4)
  })

  it("returns null for unknown failure preset", () => {
    expect(getFailureModifiersForScenario("failure-nonexistent")).toBeNull()
  })

  it("returns null for empty string", () => {
    expect(getFailureModifiersForScenario("")).toBeNull()
  })
})

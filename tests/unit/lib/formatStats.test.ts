import { describe, it, expect } from "vitest"
import { formatRps, formatRpsCompact, formatMonthlyCost, formatVariantStats } from "@/lib/formatStats"

describe("formatRps", () => {
  it("formats sub-thousand, thousands, and millions", () => {
    expect(formatRps(500)).toBe("500 rps")
    expect(formatRps(3000)).toBe("3k rps")
    expect(formatRps(60_000)).toBe("60k rps")
    expect(formatRps(1_500_000)).toBe("1.5M rps")
    expect(formatRps(10_000_000)).toBe("10M rps")
  })

  it("returns null for undefined", () => {
    expect(formatRps(undefined)).toBeNull()
  })
})

describe("formatRpsCompact", () => {
  it("drops the suffix and handles k / M", () => {
    expect(formatRpsCompact(3000)).toBe("3k")
    expect(formatRpsCompact(120_000)).toBe("120k")
    expect(formatRpsCompact(2_500_000)).toBe("2.5M")
    expect(formatRpsCompact(10_000_000)).toBe("10M")
    expect(formatRpsCompact(undefined)).toBe("—")
  })
})

describe("formatVariantStats", () => {
  it("joins cost · rps · latency and shows Free at 0 cost", () => {
    expect(formatVariantStats({ monthlyCost: 0, maxRPS: 1_000_000, baseLatencyMs: 5 })).toBe("Free · 1M rps · 5ms")
    expect(formatMonthlyCost(40)).toBe("$40/mo")
  })
})

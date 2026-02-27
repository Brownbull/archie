import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, it, expect } from "vitest"
import {
  TOOLBAR_HEIGHT,
  TOOLBOX_WIDTH,
  INSPECTOR_DEFAULT_WIDTH,
  INSPECTOR_EXPANDED_WIDTH,
  INSPECTOR_MIN_WIDTH,
  INSPECTOR_MAX_WIDTH,
  INSPECTOR_COLLAPSED_WIDTH,
  DASHBOARD_HEIGHT,
  NODE_WIDTH,
  BORDER_RADIUS,
  SPACING_XS,
  SPACING_SM,
  SPACING_MD,
  SPACING_LG,
  SPACING_XL,
  MAX_FILE_SIZE,
} from "@/lib/constants"

describe("Layout Constants (UX1)", () => {
  it("TOOLBAR_HEIGHT matches UX spec", () => {
    expect(TOOLBAR_HEIGHT).toBe(44)
  })

  it("TOOLBOX_WIDTH matches UX spec", () => {
    expect(TOOLBOX_WIDTH).toBe(260)
  })

  it("INSPECTOR_DEFAULT_WIDTH matches UX spec", () => {
    expect(INSPECTOR_DEFAULT_WIDTH).toBe(300)
  })

  it("INSPECTOR_EXPANDED_WIDTH matches UX spec (Story 4-6)", () => {
    expect(INSPECTOR_EXPANDED_WIDTH).toBe(500)
  })

  it("INSPECTOR_MIN_WIDTH matches UX spec (Story 4-6)", () => {
    expect(INSPECTOR_MIN_WIDTH).toBe(200)
  })

  it("INSPECTOR_MAX_WIDTH matches UX spec (Story 4-6)", () => {
    expect(INSPECTOR_MAX_WIDTH).toBe(700)
  })

  it("INSPECTOR_COLLAPSED_WIDTH matches UX spec", () => {
    expect(INSPECTOR_COLLAPSED_WIDTH).toBe(40)
  })

  it("DASHBOARD_HEIGHT matches UX spec", () => {
    expect(DASHBOARD_HEIGHT).toBe(100)
  })

  it("NODE_WIDTH matches UX spec", () => {
    expect(NODE_WIDTH).toBe(140)
  })

  it("BORDER_RADIUS matches UX spec", () => {
    expect(BORDER_RADIUS).toBe(6)
  })
})

describe("Spacing Constants (UX16 - 4px base)", () => {
  it("SPACING_XS is 4px", () => {
    expect(SPACING_XS).toBe(4)
  })

  it("SPACING_SM is 8px", () => {
    expect(SPACING_SM).toBe(8)
  })

  it("SPACING_MD is 12px", () => {
    expect(SPACING_MD).toBe(12)
  })

  it("SPACING_LG is 16px", () => {
    expect(SPACING_LG).toBe(16)
  })

  it("SPACING_XL is 24px", () => {
    expect(SPACING_XL).toBe(24)
  })
})

describe("File Limits (NFR7)", () => {
  it("MAX_FILE_SIZE is 1MB in bytes", () => {
    expect(MAX_FILE_SIZE).toBe(1_048_576)
  })
})

describe("Dark Mode (AC-4)", () => {
  it("index.html has class='dark' on <html> element", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf-8")
    expect(html).toMatch(/<html[^>]*class="dark"/)
  })
})

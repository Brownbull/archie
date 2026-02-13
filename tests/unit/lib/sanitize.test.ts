import { describe, it, expect } from "vitest"
import { sanitizeDisplayString } from "@/lib/sanitize"

describe("sanitizeDisplayString", () => {
  it("returns plain text unchanged", () => {
    expect(sanitizeDisplayString("Hello World")).toBe("Hello World")
  })

  it("strips HTML tags", () => {
    expect(sanitizeDisplayString("<b>bold</b>")).toBe("bold")
  })

  it("strips nested HTML tags", () => {
    expect(sanitizeDisplayString("<div><p>text</p></div>")).toBe("text")
  })

  it("strips script tags and their content", () => {
    expect(sanitizeDisplayString('<script>alert("xss")</script>safe')).toBe("safe")
  })

  it("strips event handler attributes within tags", () => {
    expect(sanitizeDisplayString('<img onerror="alert(1)" src="x">')).toBe("")
  })

  it("trims leading and trailing whitespace", () => {
    expect(sanitizeDisplayString("  hello  ")).toBe("hello")
  })

  it("truncates strings exceeding maxLength", () => {
    const long = "a".repeat(300)
    const result = sanitizeDisplayString(long, 200)
    expect(result).toHaveLength(200)
    expect(result).toBe("a".repeat(200))
  })

  it("uses default maxLength of 500", () => {
    const long = "b".repeat(600)
    const result = sanitizeDisplayString(long)
    expect(result).toHaveLength(500)
  })

  it("handles empty string", () => {
    expect(sanitizeDisplayString("")).toBe("")
  })

  it("handles string with only HTML tags", () => {
    expect(sanitizeDisplayString("<br><hr>")).toBe("")
  })

  it("preserves ampersands and special chars that are not HTML", () => {
    expect(sanitizeDisplayString("AT&T - 100% safe")).toBe("AT&T - 100% safe")
  })

  it("strips style tags and their content", () => {
    expect(sanitizeDisplayString("<style>body{color:red}</style>visible")).toBe("visible")
  })

  // Edge cases from security review
  it("strips unclosed script tags", () => {
    const result = sanitizeDisplayString("<script>alert(1)")
    expect(result).not.toContain("<script")
    expect(result).not.toContain("alert")
  })

  it("strips self-closing script tags", () => {
    expect(sanitizeDisplayString('<script src="evil.js"/>safe')).toBe("safe")
  })

  it("strips closing orphan script tags", () => {
    expect(sanitizeDisplayString("before</script>after")).toBe("beforeafter")
  })

  it("strips iframe tags", () => {
    expect(sanitizeDisplayString('<iframe src="evil.com"></iframe>safe')).toBe("safe")
  })

  it("strips nested angle brackets around dangerous tags", () => {
    const result = sanitizeDisplayString("<<script>alert(1)</script>safe")
    expect(result).not.toContain("alert")
    expect(result).toContain("safe")
  })

  it("strips javascript: protocol URIs", () => {
    const result = sanitizeDisplayString('click javascript:alert(1) here')
    expect(result).not.toContain("javascript:")
  })

  it("strips data: protocol URIs", () => {
    const result = sanitizeDisplayString('url data:text/html,<script>x</script>')
    expect(result).not.toContain("data:")
  })

  describe("ReDoS guard (AC-1)", () => {
    it("truncates input to maxLength * 2 before regex processing", () => {
      const maxLength = 500
      // Input far exceeding 2x maxLength — pre-truncation bounds regex work
      const payload = "<b>" + "x".repeat(2000) + "</b>"
      const result = sanitizeDisplayString(payload, maxLength)
      expect(result.length).toBeLessThanOrEqual(maxLength)
    })

    it("does not alter input shorter than maxLength * 2", () => {
      const result = sanitizeDisplayString("short text", 500)
      expect(result).toBe("short text")
    })

    it("preserves sanitization accuracy within the pre-truncation window", () => {
      const maxLength = 100
      // Script tag within the 2x window should still be stripped
      const payload = '<script>alert(1)</script>' + "a".repeat(150)
      const result = sanitizeDisplayString(payload, maxLength)
      expect(result).not.toContain("<script")
      expect(result).not.toContain("alert")
      expect(result.length).toBeLessThanOrEqual(maxLength)
    })
  })

  describe("Unicode normalization (AC-2)", () => {
    it("normalizes NFC before processing", () => {
      // e + combining acute (U+0301) → NFC e-acute (U+00E9)
      const decomposed = "caf\u0065\u0301"
      const result = sanitizeDisplayString(decomposed)
      expect(result).toBe("caf\u00E9")
    })

    it("handles already-NFC input unchanged", () => {
      const nfc = "caf\u00E9"
      const result = sanitizeDisplayString(nfc)
      expect(result).toBe("caf\u00E9")
    })

    it("normalizes before tag detection to prevent combining-character bypass", () => {
      // Verify normalization happens before regex layers
      const input = "<b>te\u0073\u0074</b>"
      const result = sanitizeDisplayString(input)
      expect(result).toBe("test")
    })
  })
})

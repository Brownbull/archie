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
})

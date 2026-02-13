const DEFAULT_MAX_LENGTH = 500

const DANGEROUS_TAGS = "script|style|iframe|object|embed"

// Layer 1a: Strip paired dangerous tags with content (<script>...</script>)
const DANGEROUS_PAIRED_REGEX = new RegExp(
  `<(${DANGEROUS_TAGS})\\b[^>]*>[\\s\\S]*?<\\/\\1>`,
  "gi",
)
// Layer 1b: Strip self-closing dangerous tags (<script src="x"/>)
const DANGEROUS_SELFCLOSE_REGEX = new RegExp(
  `<(?:${DANGEROUS_TAGS})\\b[^>]*/>`,
  "gi",
)
// Layer 1c: Strip orphan opening/closing dangerous tags (</script> or <script>)
const DANGEROUS_ORPHAN_REGEX = new RegExp(
  `</?(${DANGEROUS_TAGS})\\b[^>]*>`,
  "gi",
)
// Layer 1d: Strip unclosed dangerous tag + everything after (<script>...no closing)
const DANGEROUS_UNCLOSED_REGEX = new RegExp(
  `<(${DANGEROUS_TAGS})\\b[\\s\\S]*`,
  "gi",
)

// Layer 2: Strip all remaining HTML tags
const HTML_TAG_REGEX = /<[^>]*>/g

// Layer 3: Strip dangerous protocol URIs
const DANGEROUS_PROTOCOL_REGEX = /\b(javascript|data|vbscript)\s*:/gi

/**
 * Strips HTML tags and trims length for safe DOM rendering.
 * Defense-in-depth guard for user-provided YAML strings (TD-1-4a Item 4).
 *
 * Note: React escapes JSX output by default (primary defense). This utility
 * provides an additional layer for YAML import (Epic 3).
 */
export function sanitizeDisplayString(
  input: string,
  maxLength: number = DEFAULT_MAX_LENGTH,
): string {
  // Layer 0a: Unicode normalization — collapse look-alike sequences before regex (TD-1-4b AC-2)
  let cleaned = input.normalize("NFC")
  // Layer 0b: ReDoS guard — bound regex input to 2x maxLength (TD-1-4b AC-1)
  if (cleaned.length > maxLength * 2) {
    cleaned = cleaned.slice(0, maxLength * 2)
  }
  // Layer 1a: Strip paired dangerous tags with their content
  cleaned = cleaned.replace(DANGEROUS_PAIRED_REGEX, "")
  // Layer 1b: Strip self-closing dangerous tags
  cleaned = cleaned.replace(DANGEROUS_SELFCLOSE_REGEX, "")
  // Layer 1c: Strip unclosed dangerous tag + everything after (greedy last resort)
  cleaned = cleaned.replace(DANGEROUS_UNCLOSED_REGEX, "")
  // Layer 1d: Strip remaining orphan dangerous tags (e.g. </script>)
  cleaned = cleaned.replace(DANGEROUS_ORPHAN_REGEX, "")
  // Layer 2: Strip all remaining HTML tags
  cleaned = cleaned.replace(HTML_TAG_REGEX, "")
  // Layer 3: Remove dangerous protocol URIs
  cleaned = cleaned.replace(DANGEROUS_PROTOCOL_REGEX, "")
  // Layer 4: Trim whitespace
  cleaned = cleaned.trim()
  // Layer 5: Truncate to max length
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength)
  }
  return cleaned
}

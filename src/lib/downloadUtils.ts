/** Delay before revoking the Blob URL — allows the browser to initiate download */
export const BLOB_REVOKE_DELAY_MS = 1000

const FALLBACK_FILENAME = "untitled-architecture"
const MAX_FILENAME_LENGTH = 100

/**
 * Sanitizes a string for use as a download filename.
 * Strips path separators, special characters, collapses hyphens, lowercases.
 * Returns a safe fallback if the result is empty.
 */
export function sanitizeFilename(input: string): string {
  let name = input
    .replace(/\.\./g, "")         // strip path traversal sequences
    .replace(/[/\\]/g, "")        // strip path separators
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "") // keep only alphanumeric, spaces, hyphens, underscores
    .replace(/\s+/g, "-")         // spaces to hyphens
    .replace(/-{2,}/g, "-")       // collapse consecutive hyphens
    .replace(/^-+|-+$/g, "")      // trim leading/trailing hyphens
    .slice(0, MAX_FILENAME_LENGTH)

  if (name.length === 0) {
    name = FALLBACK_FILENAME
  }

  return name
}

/**
 * Triggers a markdown file download via Blob URL + hidden anchor.
 * Revokes the Blob URL after BLOB_REVOKE_DELAY_MS to prevent memory leaks.
 */
export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/markdown" })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  try {
    anchor.click()
  } finally {
    document.body.removeChild(anchor)
  }

  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, BLOB_REVOKE_DELAY_MS)
}

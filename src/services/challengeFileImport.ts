import { MAX_FILE_SIZE } from "@/lib/constants"
import { loadChallengeFromYaml, type ChallengeImportResult } from "@/services/challengeLoader"

const ALLOWED_EXTENSIONS = [".yaml", ".yml"]
const REJECTED_MIME_PREFIXES = ["image/", "video/", "audio/", "application/pdf"] as const

/**
 * File-level gate + schema validation for a user-provided challenge file (D45 rule 3).
 * Mirrors the architecture importer's defense-in-depth chain:
 *   file.size → extension → MIME → read text → loadChallengeFromYaml (string-level validation)
 */
export async function importChallengeFile(file: File): Promise<ChallengeImportResult> {
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: `File too large (max ${Math.round(MAX_FILE_SIZE / 1024)} KB).` }
  }

  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { ok: false, error: "Only .yaml and .yml files are accepted." }
  }

  const mimeType = (file.type || "").toLowerCase()
  if (REJECTED_MIME_PREFIXES.some((p) => mimeType.startsWith(p))) {
    return { ok: false, error: "File type not accepted. Only YAML text files are supported." }
  }

  const text = await file.text()
  return loadChallengeFromYaml(text)
}

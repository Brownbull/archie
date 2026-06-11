import { describe, it, expect } from "vitest"
import { getAllChallenges } from "@/services/challengeLoader"

/**
 * Hint–palette coherence (2026-06-11 audit, the async-pipeline hint-class bug made permanent).
 *
 * HINTS are instructions — a hint that routes the player through a block type the quest's palette
 * doesn't offer is a lie (async-pipeline's worker hints; llm-service's cache hints after the D96
 * trim; search-at-scale's load-balancer route). BRIEFS are fiction and stay unscanned.
 *
 * Mentions of FORBIDDEN types are auto-allowed (banned-block prose is intentional — "cache and CDN
 * are forbidden"). Everything else must be in the palette or in the curated allowlist below, which
 * records the verified-acceptable cases (concept-not-block usage, negative mentions). A new hit
 * fails THIS test: either add the block to the palette (with a D96-clean closure), rewrite the
 * hint, or — after verifying it's concept/negative usage — extend the allowlist with a comment.
 */
const TYPE_TERMS: Record<string, RegExp> = {
  "load-balancer": /load.?balancer/i,
  "message-queue": /message.?queue|messaging queue/i,
  "cache": /\bcach(e|ing)\b/i,
  "cdn": /\bCDN\b/,
  "worker": /\bworker\b/i,
  "serverless": /\bserverless\b/i,
  "nosql": /\bnosql\b/i,
  "object-storage": /object.?stor/i,
  "relational-db": /relational database|SQL database/i,
  "dns": /\bDNS\b/,
  "event-stream": /event.?stream\b/i,
  "vector-store": /vector.?(store|database)/i,
  "time-series-db": /time.?series database/i,
  "search-engine": /search.?engine/i,
  "api-gateway": /api.?gateway/i,
  "rate-limiter": /rate.?limiter/i,
  "llm-gateway": /llm.?gateway/i,
}

/** (challengeId, typeId) pairs verified acceptable — each with the reason it's not a lie. */
const ALLOWLIST = new Set([
  "edge-cache-ratio|cache", // "distributed cache"/"static-caching tier" describe the CDN's mechanic, not the cache block
  "write-storm-brownout|cache", // negative mention: "a cache won't save you" — steering AWAY from it
])

describe("hint–palette coherence (drift net)", () => {
  const challenges = getAllChallenges()

  it("no hint routes the player through a block type outside the quest's palette", () => {
    const violations: string[] = []
    for (const c of challenges) {
      const palette = new Set(c.availableBlocks)
      const forbidden = new Set(c.forbiddenTypes ?? [])
      if (palette.size === 0) continue // legacy palette-less quests offer everything
      for (const [i, hint] of c.hints.entries()) {
        for (const [typeId, re] of Object.entries(TYPE_TERMS)) {
          if (palette.has(typeId) || forbidden.has(typeId)) continue
          if (ALLOWLIST.has(`${c.id}|${typeId}`)) continue
          if (re.test(hint)) violations.push(`${c.id} hint ${i + 1} names "${typeId}" (not in palette): ${hint.slice(0, 100)}`)
        }
      }
    }
    expect(violations).toEqual([])
  })
})

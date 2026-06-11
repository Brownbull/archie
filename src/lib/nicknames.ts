/**
 * D105b — Reddit-style nicknames: auto-assigned at provisioning (architecture-flavored
 * adjective + noun + number), changeable from the profile menu, unique via the `nicknames`
 * claim collection (doc id = lowercased name).
 */

const ADJECTIVES = [
  "Resilient", "Stateless", "Eventual", "Atomic", "Sharded", "Cached", "Async", "Idempotent",
  "Distributed", "Elastic", "Fault-Tolerant", "Lazy", "Greedy", "Quorum", "Replicated", "Buffered",
]

const NOUNS = [
  "Gateway", "Balancer", "Shard", "Cluster", "Pipeline", "Backbone", "Circuit", "Throttle",
  "Replica", "Cache", "Queue", "Socket", "Router", "Bucket", "Daemon", "Kernel",
]

export function randomNickname(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)].replace("-", "")
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const num = Math.floor(Math.random() * 90) + 10
  return `${a}${n}${num}`
}

export const NICKNAME_RE = /^[a-zA-Z0-9_-]{3,20}$/

export function validateNickname(raw: string): string | null {
  const v = raw.trim()
  if (!NICKNAME_RE.test(v)) return "3–20 characters: letters, numbers, _ or -."
  return null
}

/** Claim-doc id: case-insensitive uniqueness. */
export function nicknameSlug(nickname: string): string {
  return nickname.trim().toLowerCase()
}

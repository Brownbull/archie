const lastWrite = new Map<string, number>()

const COOLDOWN_MS = 1_200

export function canWrite(key: string): boolean {
  const now = Date.now()
  const prev = lastWrite.get(key) ?? 0
  if (now - prev < COOLDOWN_MS) return false
  lastWrite.set(key, now)
  return true
}

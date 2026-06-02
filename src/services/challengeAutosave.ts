import type { AttemptState } from "@/stores/challengeStore"

const KEY = "archie-challenge-autosave"

export interface SavedChallenge {
  challengeId: string
  attemptState: AttemptState
}

export function writeSavedChallenge(challengeId: string, attemptState: AttemptState): void {
  try {
    if (attemptState === "idle") {
      window.localStorage.removeItem(KEY)
      return
    }
    window.localStorage.setItem(KEY, JSON.stringify({ challengeId, attemptState }))
  } catch { /* quota or security — best-effort */ }
}

export function readSavedChallenge(): SavedChallenge | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SavedChallenge>
    if (!parsed.challengeId || !parsed.attemptState) return null
    return { challengeId: parsed.challengeId, attemptState: parsed.attemptState }
  } catch {
    return null
  }
}

export function clearSavedChallenge(): void {
  try { window.localStorage.removeItem(KEY) } catch { /* ignore */ }
}

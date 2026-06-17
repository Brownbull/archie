import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

const STORAGE_PREFIX = "archie-refdata-"
const META_KEY = `${STORAGE_PREFIX}meta`

interface CacheMeta {
  version: string
  seededAt: string
}

function hasLocalStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage
  } catch {
    return false
  }
}

function readMeta(): CacheMeta | null {
  if (!hasLocalStorage()) return null
  try {
    const raw = localStorage.getItem(META_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheMeta
    if (typeof parsed.version === "string" && typeof parsed.seededAt === "string") return parsed
    return null
  } catch {
    return null
  }
}

function writeMeta(meta: CacheMeta): void {
  if (!hasLocalStorage()) return
  localStorage.setItem(META_KEY, JSON.stringify(meta))
}

export function readCached<T>(key: string): T[] | null {
  if (!hasLocalStorage()) return null
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
    if (!raw) return null
    return JSON.parse(raw) as T[]
  } catch {
    return null
  }
}

export function writeCache<T>(key: string, data: T[]): void {
  if (!hasLocalStorage()) return
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data))
  } catch {
    // quota exceeded — silently skip, next load will fetch from Firestore
  }
}

export async function isCacheValid(): Promise<boolean> {
  const local = readMeta()
  if (!local) return false

  try {
    const snap = await getDoc(doc(db, "_metadata", "seed"))
    if (!snap.exists()) return false
    const remote = snap.data() as { version?: string; seededAt?: string }
    return remote.version === local.version && remote.seededAt === local.seededAt
  } catch {
    // Firestore offline or error — trust the local cache if it exists
    return true
  }
}

export function stampCache(version: string, seededAt: string): void {
  writeMeta({ version, seededAt })
}

export function clearCache(): void {
  if (!hasLocalStorage()) return
  const keys = ["meta", "components", "stacks", "blueprints", "metricCategories"]
  for (const k of keys) {
    localStorage.removeItem(`${STORAGE_PREFIX}${k}`)
  }
}

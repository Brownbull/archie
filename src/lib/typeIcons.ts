/**
 * Pixel-art icons for the fundamental component TYPES (logical blocks), stored in
 * `public/icons/types/<typeId>.png`. The toolbox shows logical blocks (Cache, CDN, …) rather
 * than vendors, so each of the 17 types in `componentTypes.ts` has its own abstract icon —
 * distinct from the per-vendor icons in `componentIcons.ts`.
 *
 * Keep TYPE_ICON_IDS in lockstep with the files in public/icons/types/ and the 17 type ids;
 * the consistency test `tests/unit/lib/typeIcons.test.ts` fails if they drift.
 */
export const TYPE_ICON_IDS: ReadonlySet<string> = new Set([
  "cache",
  "cdn",
  "compute",
  "etl",
  "event-stream",
  "graph-db",
  "llm-gateway",
  "load-balancer",
  "message-queue",
  "object-storage",
  "observability",
  "payments",
  "realtime",
  "relational-db",
  "security",
  "serverless",
  "vector-store",
])

/** Returns the relative icon URL for a logical type id, or null when no type icon exists. */
export function getTypeIconUrl(typeId: string): string | null {
  return TYPE_ICON_IDS.has(typeId) ? `/icons/types/${typeId}.png` : null
}

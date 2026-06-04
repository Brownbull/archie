/**
 * Firestore rejects any `undefined` value anywhere in a document. Our canvas snapshots carry
 * React Flow optional fields (width, selected, dragging, trafficPattern, labelOffset, …) that are
 * frequently `undefined`, which is why localStorage autosave "just works" (JSON.stringify drops
 * undefined) but `setDoc` throws. A JSON round-trip strips every `undefined` (object keys are
 * omitted; undefined array elements become `null`, which Firestore accepts) before persisting.
 */
export function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

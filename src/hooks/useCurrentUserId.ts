import { useAuth } from "@/hooks/useAuth"

/**
 * The current authenticated user's uid, or null when not signed in (Epic 17 Phase 3).
 *
 * The app is globally gated by AuthGuard (route `/` redirects to `/login` when unauthenticated),
 * so within the app shell — including challenge mode — this is effectively always non-null. It is
 * the seam the attempt-persistence layer (P4) uses to stamp + scope attempts to their owner.
 * Persistence code must still treat null defensively: auth state can be momentarily unresolved, and
 * a missing uid must never produce an unowned write.
 */
export function useCurrentUserId(): string | null {
  return useAuth().user?.uid ?? null
}

import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { useGuestStore } from "@/stores/guestStore"
import { Skeleton } from "@/components/ui/skeleton"
import {
  TOOLBAR_HEIGHT,
  TOOLBOX_WIDTH,
  INSPECTOR_DEFAULT_WIDTH,
  DASHBOARD_HEIGHT,
} from "@/lib/constants"

interface AuthGuardProps {
  children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const isGuest = useGuestStore((s) => s.isGuest)

  if (loading) {
    return (
      <div data-testid="auth-loading" className="flex h-screen w-full flex-col bg-canvas">
        <Skeleton style={{ height: `${TOOLBAR_HEIGHT}px`, width: "100%" }} />
        <div className="flex flex-1">
          <Skeleton style={{ height: "100%", width: `${TOOLBOX_WIDTH}px` }} />
          <Skeleton className="h-full flex-1" />
          <Skeleton style={{ height: "100%", width: `${INSPECTOR_DEFAULT_WIDTH}px` }} />
        </div>
        <Skeleton style={{ height: `${DASHBOARD_HEIGHT}px`, width: "100%" }} />
      </div>
    )
  }

  // A guest (no Firebase user) is allowed through — they reach the canvas with a null uid, so every
  // Firestore write stays a no-op and nothing persists. Real auth is still required for everyone else.
  if (!user && !isGuest) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

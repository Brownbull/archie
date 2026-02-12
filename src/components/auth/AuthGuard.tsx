import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { Skeleton } from "@/components/ui/skeleton"
import {
  TOOLBAR_HEIGHT,
  TOOLBOX_WIDTH,
  INSPECTOR_WIDTH,
  DASHBOARD_HEIGHT,
} from "@/lib/constants"

interface AuthGuardProps {
  children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div data-testid="auth-loading" className="flex h-screen w-full flex-col bg-canvas">
        <Skeleton style={{ height: `${TOOLBAR_HEIGHT}px`, width: "100%" }} />
        <div className="flex flex-1">
          <Skeleton style={{ height: "100%", width: `${TOOLBOX_WIDTH}px` }} />
          <Skeleton className="h-full flex-1" />
          <Skeleton style={{ height: "100%", width: `${INSPECTOR_WIDTH}px` }} />
        </div>
        <Skeleton style={{ height: `${DASHBOARD_HEIGHT}px`, width: "100%" }} />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

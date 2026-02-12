import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { Skeleton } from "@/components/ui/skeleton"

interface AuthGuardProps {
  children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div data-testid="auth-loading" className="flex h-screen w-full flex-col bg-canvas">
        <Skeleton className="h-[44px] w-full" />
        <div className="flex flex-1">
          <Skeleton className="h-full w-[260px]" />
          <Skeleton className="h-full flex-1" />
          <Skeleton className="h-full w-[300px]" />
        </div>
        <Skeleton className="h-[100px] w-full" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

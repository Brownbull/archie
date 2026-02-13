import { Navigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"

const isDev = import.meta.env.DEV
const hasTestCredentials = !!import.meta.env.VITE_TEST_EMAIL

export function LoginPage() {
  const { user, loading, error, signIn, signInWithTest } = useAuth()

  if (loading) {
    return null
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return (
    <div
      data-testid="login-page"
      className="flex min-h-screen items-center justify-center bg-canvas"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-8 rounded-lg border border-archie-border bg-panel p-8">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-bold text-text-primary">Archie</h1>
          <p className="text-center text-sm text-text-secondary">
            Visual Architecture Simulator
          </p>
        </div>

        <Button
          data-testid="sign-in-button"
          onClick={signIn}
          className="w-full"
          size="lg"
        >
          Sign in with Google
        </Button>

        {isDev && hasTestCredentials && (
          <Button
            data-testid="test-login-button"
            onClick={signInWithTest}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Test Login (Dev Only)
          </Button>
        )}

        {error && (
          <p data-testid="auth-error" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

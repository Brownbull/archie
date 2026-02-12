import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"

export function LoginPage() {
  const { error, signIn } = useAuth()

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

        {error && (
          <p data-testid="auth-error" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

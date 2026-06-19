import { useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useGuestStore } from "@/stores/guestStore"
import { Button } from "@/components/ui/button"

const isDev = import.meta.env.DEV
const hasTestCredentials = !!import.meta.env.VITE_TEST_EMAIL
const hasUnlockedTestCredentials = !!import.meta.env.VITE_TEST_UNLOCKED_EMAIL

export function LoginPage() {
  const { user, loading, error, signIn, signInWithEmail, signInWithTest, signInWithUnlockedTestUser } = useAuth()
  const enterGuest = useGuestStore((s) => s.enterGuest)
  const navigate = useNavigate()
  const [emailOpen, setEmailOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return null
  }

  if (user) {
    return <Navigate to="/app" replace />
  }

  // Enter guest mode and go to the app; the quest auto-launches there once the library loads
  // (useGuestQuestLaunch) — launching here would race componentLibrary.initialize().
  const handleGuest = () => {
    enterGuest()
    navigate("/app")
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting || !email || !password) return
    setSubmitting(true)
    await signInWithEmail(email, password)
    setSubmitting(false)
  }

  return (
    <div
      data-testid="login-page"
      className="relative flex min-h-screen items-center justify-center bg-canvas"
    >
      <button
        type="button"
        data-testid="login-back-home"
        onClick={() => navigate("/")}
        className="absolute left-4 top-4 inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to home
      </button>

      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-lg border border-archie-border bg-panel p-8">
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

        <div className="flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-archie-border" />
          <span className="text-[0.625rem] uppercase tracking-wide text-text-secondary/70">or</span>
          <div className="h-px flex-1 bg-archie-border" />
        </div>

        <div className="flex w-full flex-col items-center gap-1.5">
          <Button
            data-testid="guest-try-button"
            onClick={handleGuest}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Try the first quest — no login
          </Button>
          <p className="text-center text-[0.6875rem] text-text-secondary/80">
            Play and simulate instantly. Nothing is saved — sign in to keep your progress.
          </p>
        </div>

        {!emailOpen ? (
          <button
            type="button"
            data-testid="email-toggle"
            onClick={() => setEmailOpen(true)}
            className="text-xs text-text-secondary hover:text-text-primary"
          >
            Sign in with email
          </button>
        ) : (
          <form onSubmit={(e) => void handleEmailSubmit(e)} className="flex w-full flex-col gap-3">
            <div className="h-px bg-archie-border" />
            <label className="sr-only" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              data-testid="email-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded-md border border-archie-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-blue-500/60"
            />
            <label className="sr-only" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              data-testid="password-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-md border border-archie-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-blue-500/60"
            />
            <Button
              data-testid="email-password-submit"
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        )}

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

        {isDev && hasUnlockedTestCredentials && (
          <Button
            data-testid="test-login-unlocked-button"
            onClick={signInWithUnlockedTestUser}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Test Login — Unlocked (Dev Only)
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

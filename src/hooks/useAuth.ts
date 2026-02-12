import { createElement, createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { User } from "firebase/auth"
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
} from "firebase/auth"
import { auth } from "@/lib/firebase"

const googleProvider = new GoogleAuthProvider()

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/popup-blocked": "Pop-up was blocked by the browser. Please allow pop-ups for this site.",
  "auth/network-request-failed": "Network error. Please check your connection and try again.",
  "auth/cancelled-popup-request": "Only one sign-in window can be open at a time.",
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && "code" in error) {
    const code = (error as { code: string }).code
    return AUTH_ERROR_MESSAGES[code] ?? "An unexpected error occurred. Please try again."
  }
  return "An unexpected error occurred. Please try again."
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        setUser(firebaseUser)
        setLoading(false)
      },
      (err) => {
        setError(getErrorMessage(err))
        setLoading(false)
      }
    )
    return unsubscribe
  }, [])

  const signIn = useCallback(async () => {
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }, [])

  const signOut = useCallback(async () => {
    setError(null)
    try {
      await firebaseSignOut(auth)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }, [])

  const value: AuthContextValue = { user, loading, error, signIn, signOut }
  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

import { useState, useEffect, useCallback } from "react"
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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
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

  return { user, loading, error, signIn, signOut }
}

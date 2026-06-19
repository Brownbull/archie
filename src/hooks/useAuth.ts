import { createElement, createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { User } from "firebase/auth"
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
} from "firebase/auth"
import { auth } from "@/lib/firebase"
import { componentLibrary } from "@/services/componentLibrary"
import { useAttemptsStore } from "@/stores/attemptsStore"
import { useUserProgressStore } from "@/stores/userProgressStore"
import { useUserChallengeStore } from "@/stores/userChallengeStore"
import { useUserBlockDefaultsStore } from "@/stores/userBlockDefaultsStore"
import { useUserCanvasesStore } from "@/stores/userCanvasesStore"
import { useGuestStore } from "@/stores/guestStore"
import { useChallengeStore } from "@/stores/challengeStore"

const googleProvider = new GoogleAuthProvider()

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/popup-blocked": "Pop-up was blocked by the browser. Please allow pop-ups for this site.",
  "auth/network-request-failed": "Network error. Please check your connection and try again.",
  "auth/cancelled-popup-request": "Only one sign-in window can be open at a time.",
  "auth/invalid-credential": "Invalid email or password.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/too-many-requests": "Too many attempts. Please try again later.",
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && "code" in error) {
    const code = (error as { code: string }).code
    return AUTH_ERROR_MESSAGES[code] ?? `Unexpected error (${code}). Please try again.`
  }
  return `Unexpected error: ${String(error)}`
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signInWithTest: () => Promise<void>
  /** DEV/E2E only: sign in (create on first run) the dedicated "unlocked" replay account. */
  signInWithUnlockedTestUser: () => Promise<void>
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
        if (firebaseUser) {
          // A real sign-in ends any guest session (e.g. a guest who chose to sign in to save).
          useGuestStore.getState().exitGuest()
          void useUserProgressStore.getState().loadProgress(firebaseUser.uid).then(() => {
            const { bestStarsCloud } = useUserProgressStore.getState()
            if (Object.keys(bestStarsCloud).length > 0) {
              useChallengeStore.setState({ bestStars: { ...bestStarsCloud } })
            }
          })
          void useUserChallengeStore.getState().loadFromCloud(firebaseUser.uid)
          void useUserBlockDefaultsStore.getState().loadDefaults(firebaseUser.uid)
          void useUserCanvasesStore.getState().loadCanvases(firebaseUser.uid)
        }
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

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }, [])

  const signInWithTest = useCallback(async () => {
    setError(null)
    const email = import.meta.env.VITE_TEST_EMAIL
    const password = import.meta.env.VITE_TEST_PASSWORD
    if (!email || !password) {
      setError("Test credentials not configured. Set VITE_TEST_EMAIL and VITE_TEST_PASSWORD in .env.local.")
      return
    }
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }, [])

  // DEV/E2E only (gated by VITE_TEST_UNLOCKED_*, absent in prod). Signs in the dedicated replay
  // account that the E2E setup keeps seeded with every quest complete; creates it on first run so the
  // harness is self-bootstrapping. Kept separate from the primary test user so seeding it all-complete
  // never contaminates the normal test account's locked-progression specs.
  const signInWithUnlockedTestUser = useCallback(async () => {
    setError(null)
    const email = import.meta.env.VITE_TEST_UNLOCKED_EMAIL
    const password = import.meta.env.VITE_TEST_UNLOCKED_PASSWORD
    if (!email || !password) {
      setError("Unlocked test credentials not configured. Set VITE_TEST_UNLOCKED_EMAIL and VITE_TEST_UNLOCKED_PASSWORD in .env.local.")
      return
    }
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      const code = err instanceof Error && "code" in err ? (err as { code: string }).code : ""
      // First run: the dedicated account doesn't exist yet — create it (then it's signed in).
      if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
        try {
          await createUserWithEmailAndPassword(auth, email, password)
        } catch (createErr) {
          setError(getErrorMessage(createErr))
        }
      } else {
        setError(getErrorMessage(err))
      }
    }
  }, [])

  const signOut = useCallback(async () => {
    setError(null)
    try {
      componentLibrary.reset()
      useAttemptsStore.getState().reset()
      useUserProgressStore.getState().reset()
      useUserChallengeStore.getState().reset()
      useUserBlockDefaultsStore.getState().reset()
      useUserCanvasesStore.getState().reset()
      await firebaseSignOut(auth)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }, [])

  const value: AuthContextValue = { user, loading, error, signIn, signInWithEmail, signInWithTest, signInWithUnlockedTestUser, signOut }
  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/hooks/useAuth"
import { LoginPage } from "@/components/auth/LoginPage"
import { LandingPage } from "@/components/landing/LandingPage"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { usePreferencesEffect } from "@/hooks/usePreferencesEffect"

// The app shell is the heavy chunk (React Flow, the canvas, the full component UI). Code-split it so
// the landing ("/") and login load a tiny bundle and only download the app when someone enters /app.
const AppLayout = lazy(() => import("@/components/layout/AppLayout").then((m) => ({ default: m.AppLayout })))

export function App() {
  usePreferencesEffect()

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/app"
            element={
              <AuthGuard>
                <Suspense fallback={<div className="h-screen w-full bg-canvas" />}>
                  <AppLayout />
                </Suspense>
              </AuthGuard>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  )
}

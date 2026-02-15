import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/hooks/useAuth"
import { LoginPage } from "@/components/auth/LoginPage"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { AppLayout } from "@/components/layout/AppLayout"
import { usePreferencesEffect } from "@/hooks/usePreferencesEffect"

export function App() {
  usePreferencesEffect()

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <AuthGuard>
                <AppLayout />
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

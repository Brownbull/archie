# Story: 1-1-project-foundation-and-authentication

## Status: review

## Epic: Epic 1 - Architecture Canvas & Component Library

## Overview

As a user,
I want to log into Archie with my Google account and see the app shell,
So that I have a secure, personalized entry point to start building architectures.

This is the **greenfield foundation story**. It scaffolds the entire project: Vite + React + TypeScript + shadcn/ui + Tailwind CSS v4, Firebase (Auth + Firestore + Hosting), CI/CD via GitHub Actions, the three-zone app shell layout with dark mode, and Google Sign-In with protected routing. Every subsequent story depends on this foundation.

**Architecture Requirements:** AR1, AR2, AR3, AR4, AR5 (installed), AR11, AR15 (skeleton), AR20, AR21, AR22
**UX Requirements:** UX1, UX14, UX15, UX16
**NFRs:** NFR5

## Functional Acceptance Criteria

- **AC-1:** Given I navigate to the Archie URL, When the app loads, Then I see a login page with a Google Sign-In button, And the page loads within 3 seconds (NFR5)

- **AC-2:** Given I am not authenticated, When I try to access the main app route, Then I am redirected to the login page

- **AC-3:** Given I click the Google Sign-In button, When authentication succeeds, Then I am redirected to the main app view, And I see the three-zone layout: toolbox placeholder (left, 260px), canvas area (center), inspector placeholder (right, 300px), dashboard bar (bottom, 100px), and top toolbar (44px)

- **AC-4:** Given I am authenticated, When I view the app, Then the layout uses dark mode by default with the design token color system

- **AC-5:** Given the CI/CD pipeline is configured, When a PR is opened to dev, Then Vitest tests run, TypeScript type-checking passes, and a Firebase preview deploy is created

## Architectural Acceptance Criteria (MANDATORY)

> These ACs are MANDATORY and will be validated during code review.

### File Location Requirements

- **AC-ARCH-LOC-1:** Firebase initialization module located at `src/lib/firebase.ts`, exporting `auth` and `db` instances
- **AC-ARCH-LOC-2:** Auth hook located at `src/hooks/useAuth.ts`, exporting `useAuth` function
- **AC-ARCH-LOC-3:** Login page component located at `src/components/auth/LoginPage.tsx`
- **AC-ARCH-LOC-4:** Auth guard component located at `src/components/auth/AuthGuard.tsx`
- **AC-ARCH-LOC-5:** App layout shell located at `src/components/layout/AppLayout.tsx`
- **AC-ARCH-LOC-6:** Toolbar component located at `src/components/layout/Toolbar.tsx`
- **AC-ARCH-LOC-7:** Architecture store skeleton located at `src/stores/architectureStore.ts`
- **AC-ARCH-LOC-8:** UI store skeleton located at `src/stores/uiStore.ts`
- **AC-ARCH-LOC-9:** App-wide constants located at `src/lib/constants.ts` using UPPER_SNAKE_CASE
- **AC-ARCH-LOC-10:** Type re-exports located at `src/types/index.ts`
- **AC-ARCH-LOC-11:** CI workflow located at `.github/workflows/ci.yml`
- **AC-ARCH-LOC-12:** Preview deploy workflow located at `.github/workflows/deploy-preview.yml`
- **AC-ARCH-LOC-13:** Production deploy workflow located at `.github/workflows/deploy-production.yml`
- **AC-ARCH-LOC-14:** Firestore security rules located at `firestore.rules` in project root
- **AC-ARCH-LOC-15:** Unit tests located under `tests/unit/` mirroring the `src/` directory structure
- **AC-ARCH-LOC-16:** E2E tests located under `tests/e2e/`
- **AC-ARCH-LOC-17:** Vitest configuration at `vitest.config.ts` (separate from `vite.config.ts`)
- **AC-ARCH-LOC-18:** Playwright configuration at `playwright.config.ts` in project root

### Pattern Requirements

- **AC-ARCH-PATTERN-1:** Path alias `@/*` resolves to `./src/*` in `tsconfig.app.json` and `vite.config.ts`
- **AC-ARCH-PATTERN-2:** Tailwind CSS v4 uses `@tailwindcss/vite` plugin -- no `postcss.config.js`, no `tailwind.config.js`
- **AC-ARCH-PATTERN-3:** `index.html` has `<html class="dark">` set by default (AR4, UX14)
- **AC-ARCH-PATTERN-4:** Firebase config sourced exclusively from `VITE_FIREBASE_*` environment variables
- **AC-ARCH-PATTERN-5:** Firestore initialized with `persistentLocalCache()` (AR7 Layer 1 caching)
- **AC-ARCH-PATTERN-6:** `useAuth` hook uses `onAuthStateChanged` with cleanup (unsubscribe on unmount)
- **AC-ARCH-PATTERN-7:** `AuthGuard` implements three states: loading (skeleton), authenticated (render children), unauthenticated (redirect to `/login`)
- **AC-ARCH-PATTERN-8:** React Router uses exactly two routes: `/login` (public) and `/` (protected by AuthGuard)
- **AC-ARCH-PATTERN-9:** File naming: PascalCase `.tsx` for components, camelCase with `use` prefix `.ts` for hooks, camelCase `.ts` for utilities (AR21)
- **AC-ARCH-PATTERN-10:** Layout dimensions match UX1: toolbar 44px, toolbox 260px, inspector 300px, dashboard 100px
- **AC-ARCH-PATTERN-11:** Zustand stores follow naming: `useArchitectureStore`, `useUiStore` (AR15, AR21)
- **AC-ARCH-PATTERN-12:** `.env.example` exists with all `VITE_FIREBASE_*` keys documented
- **AC-ARCH-PATTERN-13:** `.gitignore` excludes `.env`, `.env.local`, `.env.*.local`
- **AC-ARCH-PATTERN-14:** Firestore security rules: read-only for authenticated users, deny all writes (AR11)
- **AC-ARCH-PATTERN-15:** CI workflow runs Vitest and `tsc --noEmit` on PRs to `dev`
- **AC-ARCH-PATTERN-16:** Production deploy triggers on merge to `main`
- **AC-ARCH-PATTERN-17:** Feature-based directory structure under `src/components/` with: `ui/`, `auth/`, `layout/`, `canvas/`, `toolbox/`, `inspector/`, `dashboard/`, `heatmap/`, `import-export/` (AR20)
- **AC-ARCH-PATTERN-18:** shadcn/ui components in `src/components/ui/`
- **AC-ARCH-PATTERN-19:** Toolbar renders user display name and sign-out button via `useAuth` hook
- **AC-ARCH-PATTERN-20:** Test files follow `{source-name}.test.ts(x)` in `tests/unit/` mirroring `src/` (AR22)

### Anti-Pattern Requirements (Must NOT Happen)

- **AC-ARCH-NO-1:** Firebase Auth SDK must NOT be imported directly in any component other than `src/lib/firebase.ts` and `src/hooks/useAuth.ts`
- **AC-ARCH-NO-2:** No `tailwind.config.js` or `postcss.config.js` files -- Tailwind v4 uses Vite plugin only
- **AC-ARCH-NO-3:** No hardcoded Firebase config values in source files
- **AC-ARCH-NO-4:** No `.env`, `.env.local`, or `.env.*.local` files committed to git
- **AC-ARCH-NO-5:** No `console.log` in production code (use `console.error` for error boundaries only)
- **AC-ARCH-NO-6:** No `dangerouslySetInnerHTML` in any component (NFR8)
- **AC-ARCH-NO-7:** No `eval()`, `new Function()`, or dynamic `import()` on user content (NFR10)
- **AC-ARCH-NO-8:** No direct Firestore SDK queries outside `src/lib/firebase.ts` and future `src/repositories/`
- **AC-ARCH-NO-9:** Zustand stores must NOT be destructured in full -- always use selectors
- **AC-ARCH-NO-10:** No test files inside `src/` -- all tests in `tests/` directory (AR22)
- **AC-ARCH-NO-11:** No secrets, API keys, passwords, or credentials committed to repository
- **AC-ARCH-NO-12:** No relative imports between top-level `src/` directories -- use `@/*` path alias
- **AC-ARCH-NO-13:** No `I` prefix on TypeScript interfaces (AR21)
- **AC-ARCH-NO-14:** No full-page spinner -- use skeleton components for loading states

## File Specification

| File/Component | Exact Path | Pattern | AC Reference |
|----------------|------------|---------|--------------|
| Firebase init | `src/lib/firebase.ts` | Lib utility | AC-ARCH-LOC-1, AC-ARCH-PATTERN-4,5 |
| Constants | `src/lib/constants.ts` | UPPER_SNAKE_CASE | AC-ARCH-LOC-9 |
| Auth hook | `src/hooks/useAuth.ts` | camelCase hook | AC-ARCH-LOC-2, AC-ARCH-PATTERN-6 |
| Login page | `src/components/auth/LoginPage.tsx` | PascalCase component | AC-ARCH-LOC-3, AC-1 |
| Auth guard | `src/components/auth/AuthGuard.tsx` | PascalCase component | AC-ARCH-LOC-4, AC-ARCH-PATTERN-7 |
| App layout | `src/components/layout/AppLayout.tsx` | PascalCase component | AC-ARCH-LOC-5, AC-ARCH-PATTERN-10 |
| Toolbar | `src/components/layout/Toolbar.tsx` | PascalCase component | AC-ARCH-LOC-6, AC-ARCH-PATTERN-19 |
| Architecture store | `src/stores/architectureStore.ts` | Zustand store | AC-ARCH-LOC-7, AC-ARCH-PATTERN-11 |
| UI store | `src/stores/uiStore.ts` | Zustand store | AC-ARCH-LOC-8, AC-ARCH-PATTERN-11 |
| Type exports | `src/types/index.ts` | Barrel export | AC-ARCH-LOC-10 |
| Root component | `src/App.tsx` | Router + Auth | AC-ARCH-PATTERN-8 |
| Entry point | `src/main.tsx` | Vite entry | AR1 |
| CSS entry | `src/index.css` | Tailwind v4 + tokens | AC-4, UX14 |
| HTML entry | `index.html` | Dark mode | AC-ARCH-PATTERN-3 |
| Env template | `.env.example` | Config template | AC-ARCH-PATTERN-12 |
| Vitest config | `vitest.config.ts` | Test config | AC-ARCH-LOC-17 |
| Playwright config | `playwright.config.ts` | E2E config | AC-ARCH-LOC-18 |
| Firebase hosting | `firebase.json` | Hosting config | AR2 |
| Firebase project | `.firebaserc` | Project alias | AR2 |
| Firestore rules | `firestore.rules` | Security rules | AC-ARCH-LOC-14, AC-ARCH-PATTERN-14 |
| CI workflow | `.github/workflows/ci.yml` | GitHub Actions | AC-ARCH-LOC-11, AC-ARCH-PATTERN-15 |
| Preview deploy | `.github/workflows/deploy-preview.yml` | GitHub Actions | AC-ARCH-LOC-12 |
| Production deploy | `.github/workflows/deploy-production.yml` | GitHub Actions | AC-ARCH-LOC-13, AC-ARCH-PATTERN-16 |
| useAuth test | `tests/unit/hooks/useAuth.test.ts` | Unit test | AC-ARCH-LOC-15 |
| AuthGuard test | `tests/unit/components/auth/AuthGuard.test.tsx` | Unit test | AC-ARCH-LOC-15 |
| LoginPage test | `tests/unit/components/auth/LoginPage.test.tsx` | Unit test | AC-ARCH-LOC-15 |
| AppLayout test | `tests/unit/components/layout/AppLayout.test.tsx` | Unit test | AC-ARCH-LOC-15 |
| Constants test | `tests/unit/lib/constants.test.ts` | Unit test | AC-ARCH-LOC-15 |

## Tasks / Subtasks

### Task 1: Project Scaffolding & Dependencies
- [x] 1.1 Run `npm create vite@latest` with `react-ts` template
- [x] 1.2 Run `npx shadcn@latest init` (dark mode, CSS variables, `@/*` alias)
- [x] 1.3 Install runtime deps: `@xyflow/react firebase react-router-dom zustand zod js-yaml`
- [x] 1.4 Install dev deps: `vitest @testing-library/react @testing-library/jest-dom jsdom @playwright/test @types/js-yaml`
- [x] 1.5 Create `vitest.config.ts` with jsdom environment, `tests/` include pattern, coverage thresholds (45/30/25/40)
- [x] 1.6 Create `playwright.config.ts` with desktop + mobile projects, `tests/e2e/` test dir
- [x] 1.7 Add npm scripts: `dev`, `build`, `typecheck`, `test`, `test:quick`, `test:story`, `test:sprint`, `test:e2e`
- [x] 1.8 Create `tests/setup.ts` with `@testing-library/jest-dom` import
- [x] 1.9 Create feature-based directory structure with `.gitkeep` placeholders (AR20)

### Task 2: Design Tokens, Dark Mode & App Shell Layout
- [x] 2.1 Configure `src/index.css` with Tailwind v4 imports and UX14 design tokens (canvas #0f1117, panels #1a1d27, etc.)
- [x] 2.2 Update `index.html`: add `class="dark"` to `<html>`, Inter font, meta tags
- [x] 2.3 Create `src/components/layout/AppLayout.tsx` with three-zone layout (UX1 dimensions)
- [x] 2.4 Create `src/components/layout/Toolbar.tsx` (44px, Archie name, user info, sign-out)
- [x] 2.5 Create `src/lib/constants.ts` (layout dimensions, spacing scale, MAX_FILE_SIZE)

### Task 3: Firebase Configuration & Authentication
- [x] 3.1 Create `src/lib/firebase.ts` (Firebase App + Auth + Firestore with `persistentLocalCache()`)
- [x] 3.2 Create `.env.example` with all `VITE_FIREBASE_*` keys; verify `.gitignore` excludes `.env*`
- [x] 3.3 Create `src/hooks/useAuth.ts` (`onAuthStateChanged`, `signInWithPopup`, `signOut`)
- [x] 3.4 Create `src/components/auth/LoginPage.tsx` (Google Sign-In button, Archie branding)
- [x] 3.5 Create `src/components/auth/AuthGuard.tsx` (loading/authenticated/unauthenticated states)
- [x] 3.6 Install shadcn/ui components: `button`, `skeleton`, `sonner` (toast)

### Task 4: Routing, Stores & App Integration
- [x] 4.1 Create `src/App.tsx` with React Router (2 routes: /login + / protected)
- [x] 4.2 Update `src/main.tsx` to render App
- [x] 4.3 Create `src/stores/architectureStore.ts` (skeleton with empty interface)
- [x] 4.4 Create `src/stores/uiStore.ts` (skeleton with empty interface)
- [x] 4.5 Create `src/types/index.ts` (barrel export placeholder)
- [x] 4.6 Validate startup: `npm run dev` serves login page, auth redirect works

### Task 5: Firebase Hosting, Firestore Rules & CI/CD
- [x] 5.1 Create `firestore.rules` with `isAuthenticated()` helper, read-only collections, deny-all default
- [x] 5.2 Create `firebase.json` (hosting public: `dist`, SPA rewrite, firestore rules, security headers)
- [x] 5.3 Create `.firebaserc` (project alias placeholder)
- [x] 5.4 Create `.github/workflows/ci.yml` (Vitest + typecheck on PR to dev/main)
- [x] 5.5 Create `.github/workflows/deploy-preview.yml` (Firebase preview on PR to dev)
- [x] 5.6 Create `.github/workflows/deploy-production.yml` (Firebase production on merge to main)

### Task 6: Unit Tests
- [x] 6.1 Create `tests/unit/hooks/useAuth.test.ts` (loading state, auth/unauth, signIn/signOut calls)
- [x] 6.2 Create `tests/unit/components/auth/AuthGuard.test.tsx` (loading, redirect, render children)
- [x] 6.3 Create `tests/unit/components/auth/LoginPage.test.tsx` (renders button, triggers signIn)
- [x] 6.4 Create `tests/unit/components/layout/AppLayout.test.tsx` (five-region layout structure)
- [x] 6.5 Create `tests/unit/lib/constants.test.ts` (UX spec values match)
- [x] 6.6 Verify `npm run test` passes all unit tests
- [x] 6.7 Verify `npm run typecheck` passes with zero errors
- [x] 6.8 Verify `npm run build` produces successful production build

## Dev Notes

### Architecture Guidance

**Component Tree:**
```
main.tsx → BrowserRouter → App.tsx
  ├── /login → LoginPage.tsx
  └── / → AuthGuard.tsx → AppLayout.tsx
                              ├── Toolbar.tsx (44px top)
                              ├── Toolbox placeholder (260px left)
                              ├── Canvas placeholder (flex center)
                              ├── Inspector placeholder (300px right)
                              └── Dashboard placeholder (100px bottom)
```

**Data Flow:**
```
User clicks Sign-In → signInWithPopup (Google) → onAuthStateChanged fires
→ useAuth updates (user populated) → AuthGuard renders children → AppLayout
```

**Firestore Initialization:**
Initialize Firestore with `persistentLocalCache()` from Day 1, even though queries don't start until Story 1.2. This sets up the offline caching layer (AR7) and avoids re-initialization later.

```typescript
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';
const db = initializeFirestore(app, { localCache: persistentLocalCache() });
```

**Zustand Store Skeletons:**
Create empty stores to establish the pattern. No functional state yet.

```typescript
// stores/architectureStore.ts
import { create } from 'zustand';
interface ArchitectureState { /* Populated in Story 1.2+ */ }
export const useArchitectureStore = create<ArchitectureState>()(() => ({}));
```

### Technical Notes

**Firebase Console Prerequisites (MANUAL -- must complete before code runs):**
1. Create Firebase project at console.firebase.google.com
2. Enable Authentication > Sign-in method > Google
3. Create Firestore database > Start in production mode
4. Register web app > Project settings > Add app > Web
5. Copy Firebase config values to `.env.local`
6. Configure authorized domains (Firebase Console > Authentication > Settings)
7. Install `firebase-tools` globally: `npm install -g firebase-tools`
8. Run `firebase login` and `firebase init hosting` (set public dir to `dist`)

**GitHub Repository Secrets (for CI/CD):**
- `FIREBASE_SERVICE_ACCOUNT` -- JSON key from Firebase console
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`

**Tailwind CSS v4 Notes:**
- No `tailwind.config.js` -- configuration via CSS `@theme` directive
- Uses `@tailwindcss/vite` plugin (first-party)
- shadcn/ui init handles setup automatically

**Security Notes (from Security Reviewer):**
- AuthGuard MUST show loading skeleton during auth initialization (prevents flash of login page for authenticated users)
- Firebase Auth error messages should be mapped to user-friendly strings before display
- Validate all `VITE_FIREBASE_*` env vars at startup -- throw clear error if missing
- Firebase Console authorized domains must include production domain to prevent hijacking
- `VITE_FIREBASE_*` variables are PUBLIC config (not secrets) -- safe for client-side exposure

**Database Notes (from DB Reviewer):**
- Firestore security rules: use `isAuthenticated()` helper function for DRY rules
- No composite indexes needed for MVP (all access is `getAll()` or `getById()`)
- Future seed script (`scripts/seed-firestore.ts`) must be idempotent and use Firebase Admin SDK
- Consider deterministic string IDs (kebab-case) for seeded component library data

### E2E Testing

E2E coverage recommended -- run `/ecc-e2e 1-1-project-foundation-and-authentication` after implementation.

Key E2E scenarios:
- Unauthenticated user sees login page
- Google Sign-In flow completes and redirects to app
- Session persists after page refresh
- Sign out redirects to login page
- Three-zone layout renders with correct dimensions

## ECC Analysis Summary

- **Risk Level:** MEDIUM
- **Complexity:** Large (greenfield foundation)
- **Sizing:** 6 tasks / 35 subtasks / ~25+ files (acceptable for greenfield)
- **Story Points:** 6-8 (Large)
- **Agents consulted:** Planner, Architect, Database Reviewer, Security Reviewer

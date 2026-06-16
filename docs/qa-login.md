# QA / Staging Login

Archie supports email/password login for automated testing against the production deployment.

## Staging URL

`https://archie-2a560.web.app`

## Test Users

Both users use the `.test` TLD (non-routable, RFC 6761) — no real mail is ever sent.

### Regular QA (fresh account)

| Field | Value |
|-------|-------|
| Email | `qa@archie.test` |
| Password | Stored in `.env.local` as `QA_PASSWORD` — never committed |

A normal fresh account with starter progress. Only "First Service" is unlocked.

### Unlocked QA (all-quests-complete)

| Field | Value |
|-------|-------|
| Email | `qa-unlocked@archie.test` |
| Password | Stored in `.env.local` as `QA_UNLOCKED_PASSWORD` — never committed |

All 64 quests complete, max XP, every quest replayable. Used by Kane for quest variety testing.
Excluded from leaderboard (`isTestAccount: true`).

## Login Steps (Manual)

1. Navigate to the staging URL
2. Click **"Sign in with email"** on the login page
3. Enter the email and password
4. Click **Sign in**
5. The authenticated app (toolbar with `data-testid="toolbar"`) loads

## Login Steps (Automated / Playwright)

```typescript
await page.goto("https://archie-2a560.web.app")
await page.getByTestId("email-toggle").click()
await page.getByTestId("email-input").fill(process.env.QA_EMAIL!)
await page.getByTestId("password-input").fill(process.env.QA_PASSWORD!)
await page.getByTestId("email-password-submit").click()
await page.getByTestId("toolbar").waitFor()
```

## Test IDs

| Element | `data-testid` |
|---------|---------------|
| Login page | `login-page` |
| Google sign-in | `sign-in-button` |
| Email toggle | `email-toggle` |
| Email input | `email-input` |
| Password input | `password-input` |
| Submit | `email-password-submit` |
| Auth error | `auth-error` |
| Authenticated app | `toolbar` |

## Seeding the Test Users

Both scripts require `GOOGLE_APPLICATION_CREDENTIALS` pointing to a service account JSON.

### Regular QA

```bash
# Set in .env.local: QA_EMAIL, QA_PASSWORD, GOOGLE_APPLICATION_CREDENTIALS
npx tsx scripts/seed-qa-user.ts
```

Idempotent — if the user already exists it prints the UID and exits.

### Unlocked QA (all-quests-complete)

```bash
# Set in .env.local: QA_UNLOCKED_EMAIL, QA_UNLOCKED_PASSWORD, GOOGLE_APPLICATION_CREDENTIALS
npx tsx scripts/seed-unlocked-qa-user.ts
```

Idempotent — re-running overwrites `userProgress` to all-complete + max XP.
Creates the auth user if missing, then writes the Firestore doc with every
challenge ID complete, 1M XP per track, `isTestAccount: true`, and the current
`PROGRESS_GENERATION`.

## Security Notes

- The test user is a normal Firebase Auth user with no elevated privileges
- Firestore rules apply identically — no special rules needed
- Firebase Auth's built-in rate limiting handles brute-force (error: `auth/too-many-requests`)
- The email/password form is always visible (not gated on `import.meta.env.DEV`)
- The dev-only "Test Login" buttons remain unchanged for local E2E

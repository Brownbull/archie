# Tech Debt: TD-1-2C Seed Script Credential & Integrity Hardening

## Status: ready-for-dev
## Epic: Epic 1 — Architecture Canvas & Component Library
## Source: TD-1-2B Code Review (findings #1, #5, #8)

## Overview

Deferred items from TD-1-2B code review. Three themes:

1. **Service account credential validation** (HIGH) — The seed script reads GOOGLE_APPLICATION_CREDENTIALS without verifying the file exists, checking its size, or validating service account format. Could cause confusing errors or mask misconfiguration.

2. **Test mock type safety** (LOW) — The Firestore mock uses `as unknown as Parameters<typeof seedToFirestore>[0]` double cast, bypassing type safety. API changes to the seed function signature wouldn't be caught by tests.

3. **Batch write integrity verification** (LOW) — The seed script does not verify all components were successfully written after batch commits. Partial failures could result in incomplete data without warning.

## Tasks

### Task 1: Service Account Credential Validation
- [ ] 1.1 Add `existsSync` check before reading credential file
- [ ] 1.2 Add file size validation (max 10KB for service accounts)
- [ ] 1.3 Validate required service account fields (`project_id`, `private_key`, `client_email`)
- [ ] 1.4 Add test coverage for all new validation paths

### Task 2: Test Mock Type Safety
- [ ] 2.1 Create a proper Firestore mock type that matches the SDK interface
- [ ] 2.2 Remove double cast (`as unknown as`) from mock creation
- [ ] 2.3 Verify tests still compile after mock type improvement

### Task 3: Batch Write Integrity Verification
- [ ] 3.1 Track successfully written component IDs after each batch commit
- [ ] 3.2 Log warning if written count doesn't match expected count
- [ ] 3.3 Add test for partial batch failure scenario

## Acceptance Criteria

- Service account file validated before use (existence, size, format)
- Firestore mock uses proper types without unsafe casts
- Batch write verifies component count after all commits
- All new code paths have test coverage

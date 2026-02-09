# Code Review Patterns

> **Purpose:** MUST CHECK patterns for ECC code reviewers
> **Usage:** Loaded by `ecc-code-review` and `ecc-dev-story` workflows at Step 0

---

## MUST CHECK Patterns

### 1. Git Staging Verification

**Severity:** CRITICAL - Untracked files will NOT be committed

| Check | Command | Expected |
|-------|---------|----------|
| All CREATE files staged | `git status --porcelain \| grep "^??"` | No output |
| All MODIFY files staged | `git status --porcelain \| grep "^ M"` | No output |
| No split staging | `git status --porcelain \| grep "^MM"` | No output |
| Story file tracked | `git status --porcelain <story-file>` | `A ` or `M ` |

---

### 2. Input Sanitization

**Severity:** HIGH - XSS/Injection prevention

| Check | Rule |
|-------|------|
| User string inputs | Must be validated/sanitized before use |
| Service functions | ALL service functions accepting user strings must validate |

---

### 3. Feature Module Exports

**Severity:** MEDIUM - Architecture compliance

| Check | Rule |
|-------|------|
| New types | Re-export from appropriate barrel exports |
| New utilities | Verify imported in source (not just tests) |
| Naming collisions | Check existing functions with same name before creating |

---

## Additional Review Checks

### Defensive Error Handling
- All external API calls should have try/catch with meaningful error messages
- Never swallow errors silently

### Test Mock Consistency
- When refactoring services, update test mocks accordingly
- Search ALL test files for deleted/renamed module mocks

### Integration Verification
- "Props exist" does NOT mean "Props are used" - check parent passes them
- Verify parent component actually passes optional props to children

---

*Add project-specific patterns as they are discovered during code reviews.*

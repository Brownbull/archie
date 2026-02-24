# Backprop Deploy Log

## 2026-02-22 — Template Migration (backprop session 08)

**Source:** `/home/khujta/projects/khujta_backprop/_template/`

### What was installed
- **Hooks (8 total):** pre-edit-guard.py (UPDATED: churn gate + 800-line BLOCK), session-budget.py (NEW: BLOCK at 5 compactions + knowledge churn signal), session-start.sh (NEW), session-stop.sh (NEW: cost CSV logging), pre-write-guard.py (NEW: ADR gate), post-edit-warn.py (UPDATED), post-edit-typecheck.sh (UPDATED), post-memory-notify.sh (UPDATED)
- **Workflows (9 migrated, 2 added):** All 7 ECC workflows split from monolithic → router + step files. Added ecc-backprop and deploy-story.
- **CLAUDE.md:** Replaced with merged version (Archie branching rules + template framework content)
- **Scripts:** behavioral-health-snapshot.sh, analyze-commits.sh, build-l2-baseline.py
- **settings.json:** Added 5 new hook registrations (keeping cozempic)

### Known pre-existing violations (out of scope)
4 Archie-specific copilot workflows exceed 200 lines (ecc-dev-story-copilot, bmad-*).
These are not in the project-modules.yaml manifest scope. Not blocking.

### Behavioral health at deploy
epic-2: 0/3 signals — healthy.


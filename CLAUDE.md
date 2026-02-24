# Archie

## Identity
- **What:** [One-line description — fill in]
- **Stack:** React 18, TypeScript, Vite
- **Architecture:** Feature-Sliced Design

## Git Branching
```
feature/* --> dev --> main
```
- **main** — Production-ready. Receives merges from `dev` only.
- **dev** — Integration branch. Feature branches merge here first.
- **feature/*** — Short-lived, created from `dev`.

Rules:
1. NEVER commit directly to `main` or `dev`.
2. Create: `git checkout dev && git checkout -b feature/your-feature`
3. Merge feature → dev via PR. Merge dev → main via PR for releases.
4. `main` and `dev` are protected. No direct pushes.

## Commands
```bash
npm run dev         # Start dev server
npm run build       # Production build
npm run lint        # ESLint check
npm run typecheck   # TypeScript check

npm run test:quick  # Unit tests
npm run test:story  # Unit + integration
npm run test:sprint # Full suite
```

## Session Protocol

Before each session, fill the constraint box:
```
SESSION CONSTRAINT BOX
Goal: [one sentence]
Constraint 1: Max 90 min or 2 compactions
Constraint 2: [scope limit — e.g., max 3 files touched]
Constraint 3: Must pass test:quick before commit
Out of scope: [what NOT to touch]
Decision I must make: [the trade-off, if any]
```

When the session budget hook warns (3+ compactions): save handoff, restart fresh.

## Process Scale
```
Team size: SOLO
PR ceremony: MINIMAL
Sprint tracking: LIGHTWEIGHT
```
SOLO defaults: PRs = commit + push + auto-merge if CI passes. Max 1 PR/day.
Sprint-status.yaml: weekly updates only. No sprint ceremonies.

## Key Constraints (each backed by a hook)

1. **File size: BLOCK at 800 lines** — Hook rejects edits >800 lines. Split first.
2. **No console.log** — Hook warns. Remove before commit.
3. **No `: any` types** — Hook warns. Use proper TypeScript types.
4. **Planning before code** — Hook warns when creating `src/` files without an ADR.
5. **Session budget** — Hook warns at 3 compactions, BLOCKS at 5.
6. **Cost tracking** — Hook logs to `docs/cost-tracking/session-costs.csv` on session end.
7. **Churn gate** — Hook warns at 20 touches, BLOCKS at 40 (gravity well prevention).

## Decision Format

When presenting architecture decisions:
```
## Gabe Decision Block
### What's Changing: [one sentence]
### The Analogy: [physical-system analogy for the trade-off]
### Constraint Box
IS:     [what this change does]
IS NOT: [what it looks like but isn't]
RISK:   [what could break]
### Your Call: [specific question]
```

## Security
- Never commit secrets, API keys, passwords, or credentials.
- `.gitignore` excludes `.env*`, private keys, `settings.local.json`.
- Verify `git diff --cached` before committing sensitive changes.

## Framework
- **Planning:** BMAD Phase 3 (architecture, epics, stories)
- **Execution:** ECC (dev-story, code-review, deploy-story)
- **Enforcement:** Hooks (see `.claude/settings.json`)
- **Knowledge:** `_ecc/knowledge/` — loaded by workflows at Step 0

## Project Structure
- `_bmad/` — BMAD suite modules and configuration
- `_bmad-output/` — Generated output from BMAD workflows
- `_ecc/` — ECC workflows, hooks, and commands
- `.claude/` — Claude Code settings and hooks
- `docs/` — Project documentation, decisions, behavioral health
- `scripts/` — Analysis scripts (behavioral health, backprop)

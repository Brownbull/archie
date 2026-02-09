# Archie - Project Instructions

## Git Branching Workflow

This project uses a **3-branch structure**. All work MUST follow this flow:

```
feature/xxx  -->  dev  -->  main
```

### Branches
- **main** — Production-ready code. Only receives merges from `dev`.
- **dev** — Integration branch. All feature branches merge here first.
- **feature/*** — Short-lived branches for individual changes, created from `dev`.

### Rules
1. **NEVER commit directly to `main` or `dev`.**
2. Create feature branches from `dev`: `git checkout dev && git checkout -b feature/your-feature`
3. Merge feature branches into `dev` via PR.
4. Merge `dev` into `main` via PR for releases.
5. Keep feature branches up to date with `dev` (rebase or merge before PR).

### Protected Branches
- `main` and `dev` are protected. No direct pushes.

## Security
- Never commit secrets, API keys, passwords, or credentials.
- The `.gitignore` excludes `.env*`, private keys, and `settings.local.json`.
- Always verify `git diff --cached` before committing sensitive changes.

## Project Structure
- `_bmad/` — BMAD suite modules and configuration
- `_bmad-output/` — Generated output from BMAD workflows
- `_ecc/` — ECC (Everything Claude Code) workflows and commands
- `.claude/` — Claude Code commands and settings
- `docs/` — Project documentation and brainstorming artifacts

# Project Structure Standard

<!-- The allowed locations for new files in this project. -->
<!-- Used by gabe-commit CHECK 9, gabe-assess structural drift, and the PostToolUse structure-warning hook. -->
<!-- Format: glob pattern + description + maturity tag (MVP / Enterprise [E] / Scale [S]). -->
<!-- Maintenance: edit as the project evolves. gabe-commit's `update-structure` action can add patterns inline. -->

## Maturity

<!-- Which tier applies to this project right now. Reads from .kdbp/BEHAVIOR.md if unset. -->
**Current:** enterprise

## Allowed Patterns

<!-- Globs match against git-staged new files. A file that matches NO pattern is a finding. -->

| Pattern | Description | Tier |
|---------|-------------|------|
| `.kdbp/**` | KDBP state (PLAN, KNOWLEDGE, PENDING, LEDGER, DECISIONS, etc.) | MVP |
| `README.md` | Project readme | MVP |
| `LICENSE*` | License file | MVP |
| `.gitignore` | Git ignore | MVP |
| `docs/**/*.md` | Project documentation | MVP |
| `tests/**/*.{py,ts,tsx,js,jsx}` | Test files | MVP |
| `scripts/**/*.{sh,py}` | Utility scripts | MVP |

### Web App

| Pattern | Description | Tier |
|---------|-------------|------|
| `src/**/*.{ts,tsx,js,jsx}` | Application source | MVP |
| `public/**` | Static assets | MVP |
| `package.json` | Dependencies | MVP |

## Disallowed Patterns

<!-- Explicitly rejected locations. Overrides allowed patterns. -->

| Pattern | Reason |
|---------|--------|
| `**/.env` | Secrets — use `.env.example` for templates |
| `**/node_modules/**` | Never commit dependencies |
| `**/__pycache__/**` | Build artifacts |
| `**/*.pyc` | Compiled bytecode |

## Exceptions Log

<!-- One-off exceptions granted via gabe-commit's `update-structure` or `accept` action. -->
<!-- Format: | date | file | reason | -->

| Date | File | Reason |
|------|------|--------|

## Notes

- A file that matches no allowed pattern (and no disallowed pattern) triggers a structural finding at commit time
- Tier MVP patterns apply unconditionally. `[E]` and `[S]` patterns apply only if BEHAVIOR.md maturity is at or above that tier
- If a legitimate new location emerges, add it to this table via `gabe-commit` (option `update-structure`) — don't suppress the finding by accepting every time
- The `Exceptions Log` is for genuine one-off files (e.g., a single migration script in a weird place) — if a pattern of exceptions emerges, add it as an allowed pattern instead

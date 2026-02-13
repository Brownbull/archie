# BMAD + ECC Workflow System

## Two Systems, Clear Boundaries

**BMAD** handles planning and design (phases 1-3):
- Phase 1 Analysis: `/bmad-bmm-create-product-brief`, `/bmad-bmm-research`
- Phase 2 Planning: `/bmad-bmm-create-ux-design`, `/bmad-bmm-create-prd`
- Phase 3 Solutioning: `/bmad-bmm-create-architecture`, `/bmad-bmm-create-epics-and-stories`, `/bmad-bmm-check-implementation-readiness`
- Phase 3 (Copilot): `/bmad-create-architecture-copilot`, `/bmad-create-epics-copilot`, `/bmad-check-readiness-copilot`
- Also: `/bmad-bmm-brainstorming`, `/bmad-bmm-party-mode`, `/bmad-bmm-retrospective`

**ECC** handles all development execution (phase 4):
- Story creation: `/ecc-create-story` (Planner + Architect agents)
- Development: `/ecc-dev-story` (TDD Guide + Build Resolver + parallel reviewers)
- Development (Copilot): `/ecc-dev-story-copilot` (generates playbook with copy-paste prompts for Copilot Chat)
- Code review: `/ecc-code-review` (4 parallel agents: code, security, architect, TDD)
- E2E testing: `/ecc-e2e` (pre-flight enforcement, TEA quality scoring)
- Impact analysis: `/ecc-impact-analysis` (dependency graphs + sprint conflict detection)
- Story sizing: `/story-sizing` (validate and split oversized stories)

## File Ownership

```
_bmad/          <- BMAD-owned. Overwritten by `npx bmad-method install`
_ecc/           <- ECC-owned. BMAD never touches this.
.claude/        <- Integration layer. Rebuilt by setup if needed.
CLAUDE.md       <- Project-owned. Both BMAD and ECC reference it.
```

After BMAD reinstall, restore ECC integration:
```bash
npx bmad-method install    # Overwrites _bmad/ and .claude/commands/bmad-*.md
# Then manually verify .claude/commands/ still has ecc-*.md files
```

## ECC Agents

Spawned via Task tool with `subagent_type: everything-claude-code:<agent>`:

| Agent | Role |
|-------|------|
| `planner` | Implementation planning, risk assessment, task breakdown |
| `architect` | Technical design, pattern decisions |
| `tdd-guide` | RED-GREEN-REFACTOR cycle, test-first development |
| `build-error-resolver` | Fix build/TS errors with minimal diffs |
| `code-reviewer` | Code quality, maintainability |
| `security-reviewer` | OWASP Top 10, vulnerability detection |

Parallel spawning: launch multiple agents in a single message when they're independent.
Sequential handoff: pass context documents between dependent agents.

**Proactive agent usage** (no user prompt needed):
- Complex features or multi-file changes -> spawn **planner** first
- After writing/modifying code -> spawn **code-reviewer** immediately
- Bug fix or new feature -> use **tdd-guide** (write tests first)
- Architectural decisions or new patterns -> spawn **architect**
- Auth, user input, API endpoints, sensitive data -> spawn **security-reviewer**

**Model selection for subagents:**
- Haiku: lightweight exploration, quick searches, simple tasks
- Sonnet: main development, orchestration, planning
- Opus: complex architecture, deep reasoning, security review

## ECC Hooks

Pre/post edit guards enforced via `.claude/settings.json`:
- **Pre-edit:** `ecc-pre-edit-guard.py` — blocks console.log, explicit `: any`, oversized files
- **Post-edit:** `ecc-post-edit-warn.py` — warns on bare `toHaveBeenCalled`, missing cleanup
- **Post-edit:** `ecc-post-edit-typecheck.sh` — runs `tsc --noEmit` on .ts/.tsx edits

Hook files live in `_ecc/hooks/`.

## Story Lifecycle

```
/ecc-create-story -> ready-for-dev -> /ecc-dev-story -> review -> /ecc-code-review -> done
```

- IMPORTANT: Developers mark stories "review" ONLY — never "done"
- Reviewers mark "done" after approval
- Sprint tracking: `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Story Sizing (Opus 4.6)

Maximum per story: **8 tasks / 40 subtasks / 12 files**

If a story exceeds these limits during dev, run `/story-sizing` to split.

## Project Knowledge Loading

ECC workflows cache these at session start (Step 0):
- `_ecc/knowledge/code-review-patterns.md` (MUST CHECK patterns)
- `.claude/rules/testing.md`
- `.claude/rules/security.md`
- Project architecture docs (when created)

## Workflow Configuration

BMAD workflows live in `_bmad/bmm/workflows/`, ECC workflows live in `_ecc/workflows/`. Both use:
- `instructions.xml` — pseudo-code DSL (not strict XML)
- `workflow.yaml` — config, agent types, sizing rules

## Archie-Specific Context

**MVP dependency chain** — respect this order:
```
MVP 0: YAML Schema (foundation — everything depends on this)
  -> MVP 1: Canvas UI (React Flow, drag-and-drop)
    -> MVP 2: Intelligence Layer (metric recalculation, heatmaps)
      -> MVP 3: Personalization (player profile, gap analysis)
        -> MVP 4: Community Seed (library, sharing)
```

**Key architectural constraints:**
- Client-side first — no backend in early MVPs
- YAML is the persistence format (file-based, not database)
- Architecture stats are STATIC/OBJECTIVE — player profile is a SEPARATE layer
- Connection rules use WARN mode (allow but warn on incompatible)
- All 38 metrics are directional (low/medium/high), not exact values

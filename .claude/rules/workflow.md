# BMAD + ECC Workflow System

## Two Systems, Clear Boundaries

**BMAD** handles planning and design (phases 1-3):
- Phase 1 Analysis: `/bmad-bmm-create-product-brief`, `/bmad-bmm-research`
- Phase 2 Planning: `/bmad-bmm-create-ux-design`, `/bmad-bmm-create-prd`
- Phase 3 Solutioning: `/bmad-bmm-create-architecture`, `/bmad-bmm-create-epics-and-stories`, `/bmad-bmm-check-implementation-readiness`
- Phase 3 (Copilot): `/bmad-create-architecture-copilot`, `/bmad-create-epics-copilot`, `/bmad-check-readiness-copilot`
- Also: `/bmad-bmm-brainstorming`, `/bmad-bmm-party-mode`, `/bmad-bmm-retrospective`

**ECC** handles all development execution (phase 4):
- Epic & story creation: `/ecc-create-epics-and-stories` (Planner + Architect + Security — hardening analysis, replaces BMAD epic workflow)
- Story creation (ad-hoc): `/ecc-create-story` (Planner + Architect agents — for one-off or TD stories)
- Development: `/ecc-dev-story` (Planner + TDD Guide + Build Resolver + self-review)
- Development (Copilot): `/ecc-dev-story-copilot` (generates playbook with copy-paste prompts for Copilot Chat)
- Code review: `/ecc-code-review` (adaptive: 1-4 agents based on story complexity, auto-proceed)
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
- Sonnet: default for most agents — development, planning, code review, security review, TDD
- Opus: escalation for complex stories — architecture, deep reasoning, security-sensitive epics
- Haiku: lightweight exploration, quick searches, simple tasks

**Dual-model pattern:** Many agents use `model_default` (sonnet) and `model_complex` (opus).
The orchestrator selects the model based on `complexity_source` (story sizing, adaptive review classification, or security patterns). Standard/simple stories get sonnet; complex/large stories get opus.

**Code review agent models** (configured in `_ecc/workflows/ecc-code-review/workflow.yaml`):
- `code-reviewer`: Sonnet (code quality doesn't need deep reasoning)
- `security-reviewer`: Sonnet/Opus dual (sonnet default, opus for complex reviews)
- `architect`: Sonnet/Opus dual (sonnet default, opus for complex reviews)
- `tdd-guide`: Sonnet (test coverage analysis)
- All agents: `max_turns: 5`, file contents pre-loaded (agents do NOT read files)

**Dev story agent models** (configured in `_ecc/workflows/ecc-dev-story/workflow.yaml`):
- `planner`: Sonnet/Opus dual, max_turns: 7 (sonnet default, opus for large/complex stories)
- `tdd-guide`: Sonnet/Opus dual, max_turns: 15 (sonnet default, opus for large/complex stories)
- `build-error-resolver`: Sonnet, max_turns: 5 (surgical fixes)
- `code-reviewer` (self-review): Sonnet, max_turns: 7, file contents pre-loaded
- Step 6 is code-reviewer only — full review (security, architecture) runs via `/ecc-code-review`

**Epic/story creation agent models** (configured in `_ecc/workflows/ecc-create-epics-and-stories/workflow.yaml`):
- `planner`: Opus, max_turns: 7 (epic design + story breakdown with risk flags)
- `architect`: Opus, max_turns: 5 (hardening analysis + story file generation)
- `security-reviewer`: Sonnet/Opus dual, max_turns: 5 (sonnet default, opus for security-heavy epics)
- Hardening patterns: `_ecc/knowledge/hardening-patterns.md` (6 patterns from Epic 1 retrospective)

**E2E testing agent models** (configured in `_ecc/workflows/ecc-e2e/workflow.yaml`):
- `e2e-runner`: Sonnet (E2E test writing is mechanical)
- `code-reviewer`: Sonnet (E2E test quality review)

## ECC Hooks

Pre/post edit guards enforced via `.claude/settings.json`:
- **Pre-edit:** `ecc-pre-edit-guard.py` — blocks console.log, explicit `: any`, oversized files
- **Post-edit:** `ecc-post-edit-warn.py` — warns on bare `toHaveBeenCalled`, missing cleanup
- **Post-edit:** `ecc-post-edit-typecheck.sh` — runs `tsc --noEmit` on .ts/.tsx edits

Hook files live in `_ecc/hooks/`.

## Story Lifecycle

```
/ecc-create-epics-and-stories -> drafted -> sprint-planning -> ready-for-dev -> /ecc-dev-story -> review -> /ecc-code-review -> done
```

- `/ecc-create-epics-and-stories` produces stories as "drafted" — sprint planning promotes to "ready-for-dev"
- `/ecc-create-story` still available for ad-hoc one-off stories and TD stories from code review
- IMPORTANT: Developers mark stories "review" ONLY — never "done"
- Reviewers mark "done" after approval
- Sprint tracking: `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Story Sizing (Opus 4.6)

Maximum per story: **8 tasks / 40 subtasks / 12 files**

If a story exceeds these limits during dev, run `/story-sizing` to split.

## Project Knowledge Loading

ECC workflows cache these at session start (Step 0):
- `_ecc/knowledge/code-review-patterns.md` (MUST CHECK patterns)
- `_ecc/knowledge/hardening-patterns.md` (6 patterns for proactive TD detection)
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

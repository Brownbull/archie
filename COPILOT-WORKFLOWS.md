# Copilot Workflows

This project uses **BMAD + ECC** workflows that run natively in Claude Code. For GitHub Copilot, equivalent **playbook generators** produce self-contained markdown documents with copy-paste prompts.

## How It Works

1. Run a `/xxx-copilot` command in **Claude Code**
2. It reads your planning artifacts and generates a **playbook** at `_bmad-output/implementation-artifacts/`
3. Open the playbook and work through it in **Copilot Chat** step by step
4. Each prompt is self-contained (Copilot has no memory between chats)

---

## Available Copilot Workflows

### Phase 3: Solutioning (Architecture & Planning)

| Command | Original Workflow | Output | Prompts |
|---------|------------------|--------|---------|
| `/bmad-create-architecture-copilot` | `/bmad-bmm-create-architecture` | `copilot-playbook-architecture.md` | 6 |
| `/bmad-create-epics-copilot` | `/bmad-bmm-create-epics-and-stories` | `copilot-playbook-epics.md` | 4 + 1 per epic |
| `/bmad-check-readiness-copilot` | `/bmad-bmm-check-implementation-readiness` | `copilot-playbook-readiness.md` | 6 |

### Phase 4: Development (Implementation)

| Command | Original Workflow | Output | Prompts |
|---------|------------------|--------|---------|
| `/ecc-dev-story-copilot` | `/ecc-dev-story` | `copilot-playbook-{story-key}.md` | 6-12 |

---

## Workflow Details

### `/bmad-create-architecture-copilot`

Generates a playbook for the 8-step collaborative architecture decision process.

**Steps:**
1. Project Context Analysis — extract FRs, NFRs, assess scale
2. Technology Evaluation — compare frameworks, databases, hosting
3. Core Architectural Decisions — data, auth, API, frontend, infrastructure
4. Implementation Patterns — naming, structure, format, communication, process
5. Project Structure — directory tree, requirement-to-file mapping
6. Architecture Validation — adversarial coherence check, gap analysis

**Requires:** PRD (`_bmad-output/planning-artifacts/prd.md`)

**Produces:** `_bmad-output/implementation-artifacts/copilot-playbook-architecture.md`

---

### `/bmad-create-epics-copilot`

Generates a playbook for the 4-step epic and story creation process.

**Steps:**
1. Extract Requirements — pull all FRs, NFRs, architecture requirements
2. Design Epic Structure — user-value-focused epics with FR coverage map
3. Create Stories — per-epic stories with Given/When/Then acceptance criteria
4. Final Validation — adversarial check for coverage, dependencies, quality

**Critical rules enforced in prompts:**
- Epics organized by **user value**, not technical layers
- **No forward dependencies** between stories
- **Just-in-time** database/entity creation
- **Starter template** setup in Epic 1 Story 1 (if applicable)

**Requires:** PRD + Architecture

**Produces:** `_bmad-output/implementation-artifacts/copilot-playbook-epics.md`

---

### `/bmad-check-readiness-copilot`

Generates a playbook for the 6-step adversarial implementation readiness review.

**Steps:**
1. Document Inventory — verify all planning docs exist and are consistent
2. PRD Analysis — deep quality check on FRs and NFRs
3. Epic Coverage Validation — FR-by-FR coverage matrix
4. UX Alignment — cross-document consistency check
5. Epic Quality Review — 7 mandatory rules (user-value, independence, no forward deps, JIT database, sizing, AC quality)
6. Final Assessment — go/no-go decision with confidence score

**Requires:** PRD + Architecture + Epics

**Produces:** `_bmad-output/implementation-artifacts/copilot-playbook-readiness.md`

---

### `/ecc-dev-story-copilot`

Generates a playbook for TDD-first story implementation.

**Phases:**
1. Implementation Planning — Copilot analyzes story and produces a plan
2. TDD Implementation — per-task RED/GREEN/REFACTOR prompts with architecture context
3. Consolidated Validation — test/lint/build commands + error-fixing prompts
4. Code Review — quality + security + architecture check
5. Story Completion — final checklist and status updates

**Each task prompt includes:**
- All relevant acceptance criteria (functional + architectural)
- File specification with exact paths
- Anti-pattern requirements
- Dev notes and technical guidance

**Requires:** A story file in `docs/sprint-artifacts/stories/`

**Produces:** `_bmad-output/implementation-artifacts/copilot-playbook-{story-key}.md`

---

## Playbook Tips for Copilot

- Use **Copilot Edits** (`Ctrl+Shift+I`) for multi-file changes — better than inline Chat
- Reference files with `#file:path/to/file.ts` in prompts
- For large prompts, Copilot may truncate — split into smaller sections if needed
- Each prompt is self-contained; you can start a fresh Copilot Chat for each step
- Mark checkboxes in the playbook as you go to track progress
- The Tracking section at the bottom of each playbook captures files changed and notes

## File Locations

```
_ecc/workflows/
├── bmad-create-architecture-copilot/   # Architecture playbook generator
│   ├── workflow.yaml
│   └── instructions.xml
├── bmad-create-epics-copilot/          # Epics playbook generator
│   ├── workflow.yaml
│   └── instructions.xml
├── bmad-check-readiness-copilot/       # Readiness check playbook generator
│   ├── workflow.yaml
│   └── instructions.xml
└── ecc-dev-story-copilot/              # Dev story playbook generator
    ├── workflow.yaml
    └── instructions.xml

.claude/commands/                        # Command entry points
├── bmad-create-architecture-copilot.md
├── bmad-create-epics-copilot.md
├── bmad-check-readiness-copilot.md
└── ecc-dev-story-copilot.md

_bmad-output/implementation-artifacts/   # Generated playbooks land here
└── copilot-playbook-*.md
```

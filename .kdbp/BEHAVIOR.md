---
name: archie
domain: Software architecture visualization and design tool
maturity: enterprise
project_type: hybrid
tech: react, typescript, vite, react-flow
created: 2026-05-25
---

# Project Behavior Rules

## B1 — Inventory before proposing (architecture / exploratory questions)

**Trigger phrases:** "can we work on", "should we", "I'm wondering", "explore the possibility", "what do you think about", "how can we approach", "is it possible to". Treat as diagnose-prompts, not build-prompts.

**Mandatory inventory before any proposal:**
1. Read existing project state: `.kdbp/PLAN.md`, `.kdbp/SCOPE.md`, `.kdbp/STRUCTURE.md`, `.kdbp/ROADMAP.md`, `.kdbp/AUDIT.md` (if present)
2. Read suite command(s) being extended: `~/.claude/commands/gabe-*.md`
3. Read relevant catalog: `~/.claude/templates/gabe/tier-sections/*.md`
4. If proposing external dep: clone repo, verify license + actual surface (not just README)
5. List what already exists for this question before proposing what's missing

**Proactive suggestions on detection:**
- Suggest user run `/plan` (your `feedback_plan_overrides_auto` rule then enforces wait-for-confirm)
- Offer `/gabe-roast [perspective]` or `/gabe-assess` for adversarial first-pass before plan-text
- If auto-mode active, override it for exploratory Qs — surface inventory + recommendation, wait for user direction

**Self-check before delivery:** "Did I read existing state? Did the user already do this analysis? Am I proposing what already exists under a new name? Did I challenge my first framing?"

**Caveman/terse modes compress output prose only. Reasoning depth is invariant.**

**Why this rule exists:** Past incident (2026-04-24, gastify mockup workflow Q) where shallow first-pass restated work the user had already done in `.kdbp/PLAN.md` + `AUDIT.md` + `STRESS-TEST-SPEC.md`. User flagged as workflow-sustainability concern.

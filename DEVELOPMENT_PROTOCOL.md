# DEVELOPMENT_PROTOCOL.md — Mandatory Workflow Before Modifying Code

**Version:** 0.1.0  
**Branch:** `master`  
**Last updated:** 2026-06-28

---

## 1. Purpose

This document defines the mandatory workflow every contributor (human or AI) must follow before modifying any code, schema, or harness in this repository. Violation of this protocol is a protocol breach, regardless of the quality of the resulting code.

---

## 2. The Protocol (Step-by-Step)

### Step 0 — Verify Your Session Start

Before doing anything, confirm you have followed `BOOTSTRAP.md`:

```bash
# 0.1 Verify commit history
git log --oneline --all
# Must show exactly 3 commits: bdec482, ccf90d3, c4cb82c

# 0.2 Verify branch state
git branch -a
# Must show only master (and remotes/origin/master)

# 0.3 Verify working tree clean
git status --short
# Must produce no output

# 0.4 Verify harnesses pass
node src/detharness.js
node src/validation-harness.js
node src/conformance-harness.js
# All must exit 0
```

If any of these checks fail, **STOP**. Do not proceed. Report the anomaly.

---

### Step 1 — Read the Current State

1. Read `MACHINE_CONTEXT.md` to confirm repository identity and invariants.
2. Read `CURRENT_STATE.md` to know exactly what is implemented.
3. Read `ROADMAP.md` to know what milestone is next and what it contains.
4. Read `ARCHITECTURE_DECISIONS.md` to know every decision already made.
5. Read `CONTRIBUTING.md` to know evidence and validation requirements.

**Do not skip any document.** Total reading time: ~15 minutes.

---

### Step 2 — Define the Change

Create a plan document in `docs/plans/` (create the directory if it does not exist):

```markdown
docs/plans/YYYY-MM-DD-{milestone}-{feature}.md
```

Content must include:

1. **What milestone** this change belongs to.
2. **What files** will be modified or created.
3. **What the change does** and why.
4. **What harnesses** will be affected and how.
5. **What new harnesses** (if any) will be added.
6. **Risk assessment:** Could this break determinism? Could this break existing harnesses?
7. **Rollback plan:** How to revert if the harnesses fail.

**Do not write code until the plan document exists.**

---

### Step 3 — Implement the Change

1. Modify or create the files identified in the plan.
2. After every significant change, run `node src/detharness.js` to confirm determinism is intact.
3. Do not add `npm install` or `package.json` dependencies without an ADR.
4. Do not modify existing harnesses to make your change pass. Harnesses are the ground truth.
5. Do not modify `MACHINE_CONTEXT.md`, `REPOSITORY_CHARTER.md`, `HANDOFF.md`, or `ARCHITECTURE_DECISIONS.md` without recording the reason.

---

### Step 4 — Validate the Change

Run the full validation suite in this order:

```bash
# 4.1 Determinism (must always pass first)
node src/detharness.js

# 4.2 Runtime Validation (must always pass)
node src/validation-harness.js

# 4.3 AI Conformance (must always pass)
node src/conformance-harness.js

# 4.4 Any new harnesses introduced by this change
# (run them here)

# 4.5 CLI smoke test
node src/cli.js verify
node src/cli.js reconstruct
node src/cli.js impact column:users.status
node src/cli.js package column:users.status
node src/cli.js validate column:users.status
node src/cli.js conformance column:users.status
```

**All must exit 0.** If any fails, fix the change or abandon it. Do not commit with failing harnesses.

---

### Step 5 — Update Documentation

If the change affects:

- **Architecture:** Add an ADR to `ARCHITECTURE_DECISIONS.md`.
- **Implementation status:** Update `CURRENT_STATE.md`.
- **Version or milestone:** Update `MACHINE_CONTEXT.md` and `ROADMAP.md`.
- **Contributor rules:** Update `CONTRIBUTING.md`.
- **Session handoff:** Update `HANDOFF.md`.

**Documentation updates are not optional.** They are part of the change.

---

### Step 6 — Commit

Commit message format:

```
{Milestone}: {Subsystem} — {what changed} + {why}

- {detail 1}
- {detail 2}
- {detail 3}

Harness results: detharness=PASS, validation=PASS, conformance=PASS
Plan: docs/plans/YYYY-MM-DD-{milestone}-{feature}.md
```

Example:

```
Milestone 2: S13 Mediation — JSON-RPC client loop + Claude vendor adapter

- Implements src/mediation.js (JSON-RPC loop with retry)
- Implements src/vendors/claude.js (Anthropic API adapter)
- Updates src/ai-conformance.js to run live vendors alongside fixtures
- Adds src/config.js for API key management (env vars only)

Harness results: detharness=PASS, validation=PASS, conformance=PASS
Plan: docs/plans/2026-06-28-milestone2-mediation.md
```

---

### Step 7 — Push

```bash
git push origin master
```

**Never force-push.** Never use `git push --force`. Never use `git push --force-with-lease`.

---

### Step 8 — Create Session Artifact

Create a session artifact in `docs/sessions/`:

```markdown
docs/sessions/YYYY-MM-DD-session-{vendor-id}.md
```

Content:
- What was read and verified.
- What plan was created.
- What files were changed.
- What harness results were before and after.
- Any anomalies or blocking issues.
- Link to the commit.

---

## 3. Prohibited Actions

| Action | Why Prohibited | Consequence |
|---|---|---|
| Skip the three harnesses before committing | The harnesses are the ground truth. Without them, correctness is unverified. | Change must be reverted. |
| Add npm dependencies without ADR | Breaks invariant I-6 (zero dependencies). Introduces supply-chain risk. | Change must be reverted. |
| Modify harnesses to make code pass | Harnesses are the oracle. Changing the oracle is cheating. | Change must be reverted. |
| Rewrite git history (rebase, squash, amend) | Breaks invariant I-8. Corrupts commit hashes that other sessions may reference. | Change must be reverted. |
| Implement a milestone out of order | Milestones build on each other. Skipping breaks the dependency chain. | Change must be reverted. |
| Skip documentation updates | Future AIs cannot resume work without accurate documentation. | Change must be reverted. |
| Commit secrets or API keys | Security breach. Repository may be public in future. | Keys must be rotated; commit must be reverted. |

---

## 4. Emergency Protocol

If a critical bug is discovered that breaks the harnesses on `master`:

1. **Do not panic.** The commit history is immutable; the bug is recoverable.
2. Read `HANDOFF.md` to understand the last known good state.
3. Run the harnesses on `HEAD` to confirm the failure.
4. Run the harnesses on each previous commit to find the first failing commit.
5. Create a fix that passes the harnesses, following Steps 1–8 above.
6. If the fix cannot be found within the session, create an issue in `abdo-net/engineering-runtime` with the exact failure output.

---

*This protocol was established on 2026-06-28. Any modification requires an ADR and a harness-verified commit.*

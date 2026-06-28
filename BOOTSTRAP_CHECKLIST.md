# BOOTSTRAP_CHECKLIST.md — Pre-Code Checklist for Any Future AI

**Version:** 0.1.0
**Tag:** v0.1.0
**Status:** BASELINE FROZEN
**Date:** 2026-06-28

---

## ⚠️ MANDATORY

**You may not write a single line of code until every item on this checklist is completed and verified.**

If any item fails, **STOP** and report the failure before proceeding.

---

## Phase 1 — Repository Identity Verification

### □ 1.1 Clone or Verify the Repository

```bash
git clone https://github.com/abdo-net/engineering-runtime.git
cd engineering-runtime
```

Or, if already present:

```bash
cd engineering-runtime
git fetch origin
git status --short
```

**Expected:** Working tree must be clean. No uncommitted changes.

### □ 1.2 Verify the Default Branch

```bash
git branch --show-current
```

**Expected:** `master`

```bash
git symbolic-ref refs/remotes/origin/HEAD
```

**Expected:** `refs/remotes/origin/master`

### □ 1.3 Verify Commit History

```bash
git log --oneline --all
```

**Expected exactly:**

```
c03d4be Repository initialization: permanent operational foundation documentation
bdec482 AI Conformance Framework: vendor-agnostic Input/Output Package protocol + validator
ccf90d3 Runtime Validation milestone: vendor-agnostic submission protocol + validator
c4cb82c Milestone 1: deterministic reconstruction + frozen Execution Package
```

**If any commit hash differs, STOP.** History has been altered. Do not proceed.

### □ 1.4 Verify the Tag Exists

```bash
git tag -l
```

**Expected:** `v0.1.0`

```bash
git show v0.1.0 --quiet
```

**Expected:** Points to `c03d4bed289365603dd6f81c07f76f151e0e1aab`

### □ 1.5 Verify Tree Hash

```bash
git rev-parse HEAD^{tree}
```

**Expected:** `72620319525089fcaad302e1fcf45bdf7b605687`

---

## Phase 2 — Environment Verification

### □ 2.1 Verify Node Version

```bash
node --version
```

**Expected:** v20.x.x or higher (e.g., `v20.15.0`, `v22.0.0`)

**If Node < 20, STOP.** The Runtime requires Node ≥ 20.

### □ 2.2 Verify No npm Dependencies Are Needed

```bash
ls node_modules 2>/dev/null
```

**Expected:** No `node_modules/` directory, or it is empty.

```bash
cat package.json | grep -E '"dependencies"|"devDependencies"'
```

**Expected:** Neither field exists.

**Do not run `npm install`.** This repository has zero dependencies.

### □ 2.3 Verify Kernel Dependency (Optional)

```bash
node src/cli.js verify
```

**Expected:** Valid JSON output. The `verified` field may be `true` or `false` depending on whether `../radius1-kernel` exists.

**If `verified: false`,** this is acceptable for development. The Kernel is only required for full integration testing.

---

## Phase 3 — Harness Verification (The Ground Truth)

### □ 3.1 Run Determinism Harness

```bash
node src/detharness.js
```

**Expected:**

```
PASS  deterministic model
PASS  deterministic impact closure
PASS  deterministic execution package

package snapshot (run 1): e88cc4fc631a9a6d12fc665804770b15fc13c5711d222b23211e7e5cbef9ee5d
package snapshot (run 2): e88cc4fc631a9a6d12fc665804770b15fc13c5711d222b23211e7e5cbef9ee5d

DETERMINISM PROVEN — identical Execution Package from identical inputs
```

**Exit code:** 0

**If the snapshot hash differs from `e88cc4fc...`, STOP.** Something has changed the canonical output.

### □ 3.2 Run Runtime Validation Harness

```bash
node src/validation-harness.js
```

**Expected:**

```
PASS  Q1 topology convergence (independent reconstruction)
PASS  Q2 knowledge graph convergence
PASS  Q3 engineering truth convergence
PASS  Q4 impact graph convergence
PASS  Q5 execution package constraint equivalence
PASS  Q6 detect skipped/guessed analysis
PASS  Q7 automatic rejection of unsupported conclusions
PASS  Q8 gate blocks missing reconstruction before planning
PASS  Q9 resume from frozen artifacts only
PASS  Q10 two independent executions converge

RUNTIME VALIDATION PROVEN — all 10 properties hold with measured evidence
```

**Exit code:** 0

### □ 3.3 Run AI Conformance Harness

```bash
node src/conformance-harness.js
```

**Expected:**

```
PASS  compliant: accepted=true reasons=[]
PASS  hallucinator: accepted=false reasons=[EVIDENCE_NOT_VERIFIABLE, UNSUPPORTED_NODE]
PASS  evidence-forger: accepted=false reasons=[EVIDENCE_NOT_VERIFIABLE, UNSUPPORTED_NODE]
PASS  lazy-coverage-liar: accepted=false reasons=[COVERAGE_MISCLAIM]
PASS  scope-violator: accepted=false reasons=[SCOPE_VIOLATION]
PASS  instruction-ignorer: accepted=false reasons=[CONTRACT_VIOLATION]
PASS  impact-underclaimer: accepted=false reasons=[IMPACT_UNDERCLAIM]

AI CONFORMANCE FRAMEWORK PROVEN — every untrusted behavior rejected by structure, the compliant worker accepted
```

**Exit code:** 0

### □ 3.4 Record Harness Results

Write the results to `docs/sessions/YYYY-MM-DD-session-{vendor-id}.md` (create `docs/sessions/` if needed):

```markdown
# Session: YYYY-MM-DD — Baseline Verification

## Phase 1 — Repository Identity
- Commit: c03d4be... (PASS)
- Branch: master (PASS)
- Tag: v0.1.0 (PASS)
- Tree: 72620319... (PASS)
- Working tree: clean (PASS)

## Phase 2 — Environment
- Node version: {v20.x.x} (PASS/FAIL)
- npm dependencies: 0 (PASS)
- Kernel verify: {true/false} (PASS)

## Phase 3 — Harnesses
- detharness: PASS — snapshot: e88cc4fc...
- validation-harness: PASS — 10/10
- conformance-harness: PASS — 7/7

## Verdict
- ✅ All checks passed. Proceeding to read documentation.
- OR
- ❌ Check {X} failed. Stopping.
```

---

## Phase 4 — Documentation Reading (Mandatory)

Read the following documents in order. Do not skip any.

### □ 4.1 Read `BOOTSTRAP.md`

Purpose: Understand how to start a fresh session.
Time: ~5 minutes.

### □ 4.2 Read `MACHINE_CONTEXT.md`

Purpose: Verify repository identity, versions, invariants, milestones.
Time: ~3 minutes.

### □ 4.3 Read `REPOSITORY_CHARTER.md`

Purpose: Understand what this repository is, what it is not, its boundaries.
Time: ~3 minutes.

### □ 4.4 Read `CURRENT_STATE.md`

Purpose: Know exactly what is implemented and what is missing.
Time: ~5 minutes.

### □ 4.5 Read `ROADMAP.md`

Purpose: Know what milestone is next and what it contains.
Time: ~3 minutes.

### □ 4.6 Read `DEVELOPMENT_PROTOCOL.md`

Purpose: Understand the mandatory workflow before code changes.
Time: ~3 minutes.

### □ 4.7 Read `CONTRIBUTING.md`

Purpose: Know evidence requirements, validation rules, prohibited behavior.
Time: ~3 minutes.

### □ 4.8 Read `HANDOFF.md`

Purpose: Know what the previous AI established and what you must never assume.
Time: ~3 minutes.

### □ 4.9 Read `ARCHITECTURE_DECISIONS.md`

Purpose: Know every architectural decision already made.
Time: ~5 minutes.

### □ 4.10 Read `README.md`

Purpose: Full technical description of implemented subsystems.
Time: ~5 minutes.

**Total reading time: ~38 minutes.**

---

## Phase 5 — Pre-Code Declaration

Before writing any code, you must declare:

### □ 5.1 What Milestone You Are Implementing

State the milestone number and name. Do not implement a milestone out of order.

**Current next milestone:** Milestone 2 — S13 Mediation + Live Multi-Vendor AI Loop

### □ 5.2 What Files You Will Modify or Create

List every file. Do not modify files not on this list.

### □ 5.3 Why the Change is Needed

Reference the milestone deliverables and success criteria from `ROADMAP.md`.

### □ 5.4 What Harnesses Will Be Affected

If your change affects the core engines, the snapshot hash may change. You must document why.

### □ 5.5 Create a Plan Document

```bash
touch docs/plans/YYYY-MM-DD-{milestone}-{feature}.md
```

Content must follow the template in `DEVELOPMENT_PROTOCOL.md` §2.

---

## Phase 6 — Final Check Before First Line of Code

### □ 6.1 All Checklist Items Complete

Every item above must be checked. If any is unchecked, STOP.

### □ 6.2 Plan Document Exists

```bash
ls docs/plans/YYYY-MM-DD-{milestone}-{feature}.md
```

Must exist.

### □ 6.3 Session Artifact Exists

```bash
ls docs/sessions/YYYY-MM-DD-session-{vendor-id}.md
```

Must exist.

### □ 6.4 You Understand the Invariants

You must be able to state:
- I-1: Kernel is read-only.
- I-2: Deterministic output from identical inputs.
- I-3: Runtime measures completeness, never asserts it.
- I-4: AI never touches project directly.
- I-5: Every AI submission is validated, never trusted.
- I-6: Zero npm dependencies.
- I-7: Ontology-first, not CRUD-hardcoded.
- I-8: Zero history rewrite.

---

## Emergency Escape

If at any point during implementation you discover:
- A harness fails and you cannot fix it.
- You are unsure whether a change violates an invariant.
- You have modified a file not on your plan list.
- You have skipped a checklist item.

**STOP immediately.** Do not commit.

Options:
1. `git checkout -- <file>` to revert uncommitted changes.
2. `git reset --hard HEAD` to revert ALL uncommitted changes (dangerous — use only if you have no valuable work).
3. Create a session artifact describing the failure and exit.

---

*This checklist was established on 2026-06-28 as part of Engineering Runtime v0.1.0. Any AI that modifies this file must record the reason in `ARCHITECTURE_DECISIONS.md`.*

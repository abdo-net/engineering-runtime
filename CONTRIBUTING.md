# CONTRIBUTING.md — For AI Contributors

**Version:** 0.1.0  
**Branch:** `master`  
**Last updated:** 2026-06-28

---

## 1. Who This Document Is For

This document is for **AI contributors** — any AI agent (Claude, Kimi, GPT, Gemini, xAI, etc.) that is tasked with modifying code, schemas, documentation, or harnesses in this repository.

Humans may also read this document, but the primary audience is AI agents that need to understand the rules of engagement before they start work.

---

## 2. Mandatory Evidence Requirements

Every AI session that modifies this repository must produce evidence. No exceptions.

### 2.1 Before Any Change

| Evidence | How to Produce | Where to Store |
|---|---|---|
| Commit hash verification | `git log --oneline --all` | Session artifact (`docs/sessions/`) |
| Working tree clean check | `git status --short` | Session artifact |
| Harness pre-run results | `node src/detharness.js`, `node src/validation-harness.js`, `node src/conformance-harness.js` | Session artifact |
| Plan document | Write a markdown file describing the change | `docs/plans/YYYY-MM-DD-{milestone}-{feature}.md` |

### 2.2 After Any Change

| Evidence | How to Produce | Where to Store |
|---|---|---|
| Harness post-run results | Re-run all three harnesses | Session artifact |
| CLI smoke test | `node src/cli.js verify`, `reconstruct`, `impact`, `package`, `validate`, `conformance` | Session artifact |
| Diff of changes | `git diff` | Session artifact (copy the diff) |
| Commit hash | `git log --oneline -1` | Session artifact |

### 2.3 Session Artifact Format

```markdown
docs/sessions/YYYY-MM-DD-session-{vendor-id}.md
```

Content:

```markdown
# Session: YYYY-MM-DD — {Brief description}

## Verification (Before)
- Commit hashes: bdec482, ccf90d3, c4cb82c
- Branch: master
- Working tree: clean
- detharness: PASS (snapshot: e88cc4fc...)
- validation-harness: PASS (10/10)
- conformance-harness: PASS (7/7)

## Plan
- docs/plans/YYYY-MM-DD-{milestone}-{feature}.md

## Changes
- {file}: {what changed and why}
- {file}: {what changed and why}

## Diff
```
{paste git diff here}
```

## Validation (After)
- detharness: PASS/FAIL
- validation-harness: PASS/FAIL
- conformance-harness: PASS/FAIL
- CLI smoke test: PASS/FAIL

## Anomalies
- {None, or describe any issues encountered}

## Commit
- {commit hash}
```

---

## 3. Validation Requirements

### 3.1 The Three Harnesses (Non-Negotiable)

Before and after any code change, you must run:

```bash
node src/detharness.js
node src/validation-harness.js
node src/conformance-harness.js
```

**All must exit 0.** If any fails, the change is invalid.

### 3.2 Determinism Check

The `detharness.js` output must show:

```
DETERMINISM PROVEN — identical Execution Package from identical inputs
```

The package snapshot hash must match the known good hash:
`e88cc4fc631a9a6d12fc665804770b15fc13c5711d222b23211e7e5cbef9ee5d`

If the hash changes, you must explain why in the plan document and the ADR. A changed hash means the canonical output has changed, which is a significant event.

### 3.3 Runtime Validation Check

The `validation-harness.js` output must show:

```
RUNTIME VALIDATION PROVEN — all 10 properties hold with measured evidence
```

All 10 questions (Q1–Q10) must pass. If any fails, the change has broken the validation framework.

### 3.4 AI Conformance Check

The `conformance-harness.js` output must show:

```
AI CONFORMANCE FRAMEWORK PROVEN — every untrusted behavior rejected by structure, the compliant worker accepted
```

All 7 workers must pass with their expected verdicts. If any fails, the change has broken the conformance framework.

### 3.5 CLI Smoke Test

After any CLI change, run:

```bash
node src/cli.js verify
node src/cli.js reconstruct
node src/cli.js impact column:users.status
node src/cli.js package column:users.status
node src/cli.js validate column:users.status
node src/cli.js conformance column:users.status
```

All must produce valid JSON output and exit 0.

---

## 4. Prohibited Behavior

### 4.1 Never Do These

| # | Prohibition | Why | Consequence |
|---|---|---|---|
| 1 | Skip the three harnesses before committing | The harnesses are the ground truth. Without them, correctness is unverified. | Change must be reverted. |
| 2 | Add npm dependencies without an ADR | Breaks invariant I-6. Introduces supply-chain risk. | Change must be reverted. |
| 3 | Modify harnesses to make code pass | Harnesses are the oracle. Changing the oracle is cheating. | Change must be reverted. |
| 4 | Rewrite git history (rebase, squash, amend) | Breaks invariant I-8. Corrupts commit hashes that other sessions reference. | Change must be reverted. |
| 5 | Implement a milestone out of order | Milestones build on each other. Skipping breaks the dependency chain. | Change must be reverted. |
| 6 | Skip documentation updates | Future AIs cannot resume work without accurate documentation. | Change must be reverted. |
| 7 | Commit secrets or API keys | Security breach. Repository may be public in future. | Keys must be rotated; commit must be reverted. |
| 8 | Assume the Kernel is present | The Runtime works without the Kernel for its own harnesses. Do not fail if `../radius1-kernel` is absent. | Fix the code to handle absence gracefully. |
| 9 | Use `eval()`, `Function()`, or dynamic code execution | Security risk. The Runtime must never execute arbitrary code. | Change must be reverted. |
| 10 | Trust natural-language explanations as evidence | The Runtime validates artifacts, not explanations. Never use free-text fields for verification. | Change must be reverted. |
| 11 | Delete or modify `MACHINE_CONTEXT.md`, `REPOSITORY_CHARTER.md`, `HANDOFF.md`, or `ARCHITECTURE_DECISIONS.md` without recording the reason | These are the foundation documents. Modifying them silently breaks future sessions. | Change must be reverted; reason must be documented in ADR. |
| 12 | Assume `npm install` is needed | This repository has zero dependencies. Do not run `npm install` or add `package.json` dependencies. | Change must be reverted. |

### 4.2 Never Assume These

| # | Assumption | Why False | Correct Action |
|---|---|---|---|
| 1 | "The harnesses probably still pass" | You have not verified. | Run the harnesses. |
| 2 | "The Kernel is present" | It may not be cloned. | Check `node src/cli.js verify`. |
| 3 | "Node version is compatible" | The environment may have Node < 20. | Check `node --version`. |
| 4 | "Line ending differences mean the file changed" | Windows `core.autocrlf` converts LF to CRLF. | Use `git diff --ignore-space-at-eol` or clone with `--config core.autocrlf=false`. |
| 5 | "This is a small change, I don't need a plan" | All changes affect the harnesses. | Write a plan document. |
| 6 | "I can fix this later" | Later sessions will not have your context. | Fix it now, or document the issue in `docs/issues/`. |

---

## 5. Permitted Behavior

### 5.1 You May Do These Without an ADR

- Add a new fixture worker in `src/workers/` or `src/ai-workers/` (if it tests new behavior and all harnesses still pass).
- Fix a typo in documentation (if it does not change meaning).
- Add a new adapter in `src/adapters.js` (if it does not break existing harnesses and follows the registry pattern).
- Add a new profile in `profiles/` (if it does not break existing harnesses).
- Add a new schema in `spec/schemas/` (if it is referenced by new code and does not break existing harnesses).

### 5.2 You May Do These With an ADR

- Add npm dependencies.
- Change the canonical serialization format.
- Modify the rejection taxonomy (`REJECTION_REASONS`).
- Change the protocol version (`PROTOCOL_VERSION`).
- Modify a gate's logic or add a new gate.
- Change the Kernel entity mapping.
- Modify the `entityMap` in `src/kernel.js`.
- Remove or rename a source file.
- Change the CLI command structure.

---

## 6. Escalation

If you encounter a situation not covered by this document:

1. Read `HANDOFF.md` to understand the last known good state.
2. Read `ARCHITECTURE_DECISIONS.md` to see if a similar decision was already made.
3. If still uncertain, create an issue in `abdo-net/engineering-runtime` with:
   - The exact situation.
   - What you have read and verified.
   - What you planned to do.
   - Why you are uncertain.
   - The exact output of the three harnesses.

Do not proceed with an uncertain change. The harnesses are the ground truth, but they cannot tell you what to do — only whether what you did is correct.

---

*This document was established on 2026-06-28. Any AI that modifies it must update the version and date, and record the change in `ARCHITECTURE_DECISIONS.md`.*

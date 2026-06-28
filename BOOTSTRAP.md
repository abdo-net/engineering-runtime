# BOOTSTRAP.md — How Any AI Starts a Fresh Session

**Version:** 0.1.0  
**Branch:** `master` (default)  
**Canonical repository:** `https://github.com/abdo-net/engineering-runtime`  
**Last updated:** 2026-06-28

---

## 1. Clone the Repository

```bash
git clone https://github.com/abdo-net/engineering-runtime.git
cd engineering-runtime
```

**Expected branch:** `master` must be the default branch.

**Expected HEAD:** `bdec48219f9e2ee48d6304ae1d22b727bff20edb`

**Expected commit count:** 3

```bash
git log --oneline --all
```

Must output:

```
bdec482 AI Conformance Framework: vendor-agnostic Input/Output Package protocol + validator
ccf90d3 Runtime Validation milestone: vendor-agnostic submission protocol + validator
c4cb82c Milestone 1: deterministic reconstruction + frozen Execution Package
```

If any commit hash differs, **STOP**. Do not proceed. History has been altered.

---

## 2. Read the Mandatory Documents (in this order)

| # | Document | Purpose | Read time |
|---|---|---|---|
| 1 | `MACHINE_CONTEXT.md` | Repository identity, versions, invariants, milestones | 1 min |
| 2 | `REPOSITORY_CHARTER.md` | What this repository is, what it is not, its boundaries | 2 min |
| 3 | `CURRENT_STATE.md` | Exact implementation status as of today | 3 min |
| 4 | `ROADMAP.md` | What milestone is next and what it contains | 2 min |
| 5 | `DEVELOPMENT_PROTOCOL.md` | What you must do before touching any code | 2 min |
| 6 | `CONTRIBUTING.md` | Evidence requirements, validation rules, prohibited behavior | 2 min |
| 7 | `HANDOFF.md` | What the previous AI established; what you must verify | 2 min |
| 8 | `ARCHITECTURE_DECISIONS.md` | Every architectural decision already made | 3 min |
| 9 | `README.md` | Full technical description of implemented subsystems | 5 min |

**Total:** ~22 minutes. Do not skip any document.

---

## 3. Verify the Runtime is Functional

**Prerequisites:** Node.js ≥ 20, zero npm dependencies (no `npm install` needed).

Run all three harnesses in order:

```bash
node src/detharness.js
node src/validation-harness.js
node src/conformance-harness.js
```

**Expected outcomes:**

| Harness | Expected output | Exit code |
|---|---|---|
| `detharness.js` | `DETERMINISM PROVEN` | 0 |
| `validation-harness.js` | `RUNTIME VALIDATION PROVEN — all 10 properties hold` | 0 |
| `conformance-harness.js` | `AI CONFORMANCE FRAMEWORK PROVEN — every untrusted behavior rejected` | 0 |

**Package snapshot hash** (from `detharness.js`): `e88cc4fc631a9a6d12fc665804770b15fc13c5711d222b23211e7e5cbef9ee5d`

If any harness fails, **STOP**. Do not modify code. Report the failure.

---

## 4. Verify the Kernel Dependency (if available)

The Runtime consumes `abdo-net/radius1-kernel` read-only. The kernel is pinned at commit `96042489b39e9a589280483054349ac2d7da00bc` in `kernel.lock`.

```bash
node src/cli.js verify
```

If the kernel sibling directory `../radius1-kernel` does not exist, the Runtime still functions for its own harnesses but the `verify` command will report `verified: false`. This is acceptable for development that does not modify kernel interfaces.

---

## 5. Understand the Current Milestone

As of this writing, **Milestone 1.6 (AI Conformance Framework)** is complete. The next milestone is **Milestone 2 (S13 Mediation + live multi-vendor AI loop)**.

See `ROADMAP.md` for the full milestone sequence and success criteria.

---

## 6. What You May Do Now

After steps 1–5 pass, you may:

- Read any source file to understand the implementation.
- Run the CLI commands (`verify`, `reconstruct`, `impact`, `package`, `validate`, `conformance`).
- Read `ROADMAP.md` to understand what work is scheduled next.
- Prepare an implementation plan for the next milestone (do not execute it until you have followed `DEVELOPMENT_PROTOCOL.md`).

---

## 7. What You Must NOT Do

- **Never** modify `src/` or `spec/` files without first running all three harnesses and confirming they pass.
- **Never** add `npm install` or `package.json` dependencies without an explicit Architecture Decision Record (ADR).
- **Never** rewrite git history, squash, amend, or rebase commits.
- **Never** skip the three harnesses before committing changes.
- **Never** implement a milestone out of order.
- **Never** delete or modify `MACHINE_CONTEXT.md`, `REPOSITORY_CHARTER.md`, `HANDOFF.md`, or `ARCHITECTURE_DECISIONS.md` without updating the version stamp and recording the reason.

---

## 8. Session Evidence Requirement

Every AI session that modifies code must produce a session artifact in `docs/sessions/` (create the directory if needed):

```markdown
docs/sessions/YYYY-MM-DD-session-{vendor-id}.md
```

Content:
- What was read and verified before starting work.
- What harness results were observed.
- What changes were planned and why.
- What the actual diff was.
- What harness results were after the change.
- Any anomalies or blocking issues.

If no code was modified, a session artifact is still required confirming the verification was performed and the state was unchanged.

---

*Any AI that cannot complete steps 1–5 must stop and report the failure rather than proceeding.*

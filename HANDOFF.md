# HANDOFF.md — What the Next AI Must Read, Verify, Execute, and Never Assume

**Version:** 0.1.0  
**Branch:** `master`  
**Last updated:** 2026-06-28

---

## 1. What Was Established by the Previous AI (This Session)

The repository was recovered from a git bundle and a worktree tarball, then published to `https://github.com/abdo-net/engineering-runtime`. All management actions were performed via GitHub API and verified through local git operations.

### 1.1 Recovery Actions Completed

| Action | Status | Evidence |
|---|---|---|
| SHA-256 verification of bundle | ✅ | `8e9685d78f79…` |
| SHA-256 verification of tarball | ✅ | `7a964eb28468…` |
| Git bundle validity | ✅ | `git bundle verify` passed |
| Complete history recovered | ✅ | 3 commits preserved exactly |
| Cross-verification repo vs tarball | ✅ | Byte-equivalent (LF-normalized) |

### 1.2 Publication Actions Completed

| Action | Status | Evidence |
|---|---|---|
| `master` pushed to GitHub | ✅ | `git push -u origin master` |
| Commit hash preserved | ✅ | `bdec482…` remote = local |
| Tree hash preserved | ✅ | `b66df45…` remote = local |
| Default branch changed to `master` | ✅ | GitHub API `PATCH` |
| Placeholder `main` branch removed | ✅ | GitHub API `DELETE` |
| Clean clone verified | ✅ | Fresh clone reproduces exact history |

### 1.3 Harness Verification Results (from Clean Clone)

| Harness | Result | Exit Code |
|---|---|---|
| `detharness.js` | `DETERMINISM PROVEN` | 0 |
| `validation-harness.js` | `RUNTIME VALIDATION PROVEN` (10/10) | 0 |
| `conformance-harness.js` | `AI CONFORMANCE PROVEN` (7/7) | 0 |

**Package snapshot hash:** `e88cc4fc631a9a6d12fc665804770b15fc13c5711d222b23211e7e5cbef9ee5d`

---

## 2. What the Next AI Must Read (Mandatory)

In this exact order:

1. `BOOTSTRAP.md` — to understand how to start.
2. `MACHINE_CONTEXT.md` — to verify repository identity and invariants.
3. `REPOSITORY_CHARTER.md` — to understand boundaries and relationships.
4. `CURRENT_STATE.md` — to know exactly what is implemented.
5. `ROADMAP.md` — to know what milestone is next.
6. `DEVELOPMENT_PROTOCOL.md` — to know the mandatory workflow before code changes.
7. `CONTRIBUTING.md` — to know evidence and validation requirements.
8. `ARCHITECTURE_DECISIONS.md` — to know every decision already made.
9. `README.md` — for full technical context.

**Total reading time: ~22 minutes.** Do not skip any document.

---

## 3. What the Next AI Must Verify (Mandatory)

Before doing any work, the next AI must verify:

### 3.1 Repository Identity

```bash
git log --oneline --all
```

Must show exactly:

```
bdec482 AI Conformance Framework: vendor-agnostic Input/Output Package protocol + validator
ccf90d3 Runtime Validation milestone: vendor-agnostic submission protocol + validator
c4cb82c Milestone 1: deterministic reconstruction + frozen Execution Package
```

If any hash differs, **STOP** and report the anomaly.

### 3.2 Branch State

```bash
git branch -a
```

Must show only `master` (and `remotes/origin/master`). No `main` branch should remain.

```bash
git symbolic-ref refs/remotes/origin/HEAD
```

Must output `refs/remotes/origin/master`.

### 3.3 Harness Passes

```bash
node src/detharness.js
node src/validation-harness.js
node src/conformance-harness.js
```

All three must exit 0. If any fails, **STOP**.

### 3.4 Working Tree Clean

```bash
git status --short
```

Must produce no output. Uncommitted changes are an anomaly.

---

## 4. What the Next AI Must Execute (If Implementing)

If the next AI is tasked with implementing the next milestone (Milestone 2), the mandatory sequence is:

1. Read all documents listed in §2.
2. Verify all conditions listed in §3.
3. Read `ROADMAP.md` to understand Milestone 2's deliverables and success criteria.
4. Read `DEVELOPMENT_PROTOCOL.md` to understand the mandatory development workflow.
5. Create a plan document in `docs/plans/` (create the directory if needed).
6. Implement the plan, running `detharness.js` after every significant change.
7. When complete, run all three harnesses and confirm they pass.
8. Commit with a descriptive message referencing the milestone.
9. Push to `master`.

---

## 5. What the Next AI Must Never Assume

### 5.1 Do Not Assume History is Intact

Always verify commit hashes with `git log --oneline`. Do not assume the repository was not tampered with between sessions.

### 5.2 Do Not Assume Harnesses Still Pass

Always run all three harnesses before and after any code change. Do not assume they still pass because they passed last time.

### 5.3 Do Not Assume the Kernel is Present

The Runtime works without the Kernel sibling directory for its own harnesses, but `node src/cli.js verify` will report `verified: false`. This is not an error unless you are testing kernel integration.

### 5.4 Do Not Assume `npm install` is Needed

This repository has zero npm dependencies. Do not run `npm install` or add dependencies without an ADR.

### 5.5 Do Not Assume Node Version Compatibility

The runtime requires Node ≥ 20. Verify with `node --version`. Do not assume the environment meets this.

### 5.6 Do Not Assume Line Endings Mean Content Changed

On Windows, `core.autocrlf` may convert LF to CRLF. If `diff` shows line-ending differences only, this is an environmental artifact, not a content discrepancy. Use `git diff --ignore-space-at-eol` or clone with `--config core.autocrlf=false` to verify.

### 5.7 Do Not Assume You Can Skip Documentation

Every milestone must be documented. Every architectural change must have an ADR. Every session must produce a session artifact. Do not assume documentation is optional.

### 5.8 Do Not Assume You Can Rewrite History

Never squash, rebase, amend, or force-push. The three commits must remain with their exact hashes forever.

---

## 6. Known Anomalies (As of This Session)

| Anomaly | Severity | Details | Action Required |
|---|---|---|---|
| `kernel.lock.schema.json` missing | Low | Referenced by `kernel.lock` but file does not exist | Create when implementing S1 full-hash verification |
| `main` branch deleted | Resolved | Was a GitHub auto-init placeholder, no unique work | None; `master` is now default |
| Live multi-vendor API calls unproven | Medium | Only deterministic fixtures exist; no Claude/GPT/Gemini/Kimi/xAI API keys configured | Milestone 2 will address this |
| S2 git-file persistence absent | Medium | Store is in-memory only | Milestone 3 will address this |

---

## 7. Contact and Escalation

This repository is owned by `abdo-net`. The Engineering Kernel is `abdo-net/radius1-kernel`. The Runtime is a consumer repository; it never modifies the Kernel.

If a blocking anomaly is found that cannot be resolved within the session, create an issue in `abdo-net/engineering-runtime` describing the anomaly, the verification steps performed, and the exact output observed.

---

*This HANDOFF.md was established on 2026-06-28 by the Orchestrator agent during repository recovery and certification. Any AI that modifies this file must record the reason in `ARCHITECTURE_DECISIONS.md`.*

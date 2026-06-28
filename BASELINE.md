# BASELINE.md — Signed v0.1.0 Baseline

**Version:** 0.1.0
**Tag:** v0.1.0
**Status:** BASELINE FROZEN — Immutable
**Date:** 2026-06-28

---

## Baseline Identity

```
Repository:     abdo-net/engineering-runtime
Canonical URL:  https://github.com/abdo-net/engineering-runtime
Default Branch: master
Commit:         c03d4bed289365603dd6f81c07f76f151e0e1aab
Tree Hash:      72620319525089fcaad302e1fcf45bdf7b605687
Parent:         bdec48219f9e2ee48d6304ae1d22b727bff20edb
Author:         Engineering Kernel Architect <albraa20186@gmail.com>
Date:           2026-06-28 20:50:27 +0300
```

## Kernel Dependency

```
Kernel Repo:    abdo-net/radius1-kernel
Kernel Path:    ../radius1-kernel
Kernel Commit:  96042489b39e9a589280483054349ac2d7da00bc
Kernel Version: 1.x
Charter ID:     engineering-runtime-consumer
```

## Runtime Version

```
Version:        0.1.0
Node Engine:    >= 20
Dependencies:   0
License:        UNLICENSED
Private:        true
```

## Validation Status

| Harness | Status | Exit Code | Evidence |
|---|---|---|---|
| Determinism (`detharness.js`) | PASS | 0 | `DETERMINISM PROVEN` — identical Execution Package from identical inputs |
| Runtime Validation (`validation-harness.js`) | PASS | 0 | `RUNTIME VALIDATION PROVEN` — all 10 properties hold with measured evidence |
| AI Conformance (`conformance-harness.js`) | PASS | 0 | `AI CONFORMANCE FRAMEWORK PROVEN` — every untrusted behavior rejected by structure, the compliant worker accepted |

## Package Snapshot Hash

```
e88cc4fc631a9a6d12fc665804770b15fc13c5711d222b23211e7e5cbef9ee5d
```

This hash is the canonical SHA-256 of the frozen Execution Package produced by the Runtime from identical inputs. Any future version of the Runtime must either:
- Produce the same hash from the same inputs (if the core engines are unchanged), or
- Document the reason for the change in an ADR.

## Document Versions

| Document | Version | Last Updated |
|---|---|---|
| README.md | 0.1.0 | 2026-06-28 |
| BOOTSTRAP.md | 0.1.0 | 2026-06-28 |
| HANDOFF.md | 0.1.0 | 2026-06-28 |
| MACHINE_CONTEXT.md | 0.1.0 | 2026-06-28 |
| REPOSITORY_CHARTER.md | 0.1.0 | 2026-06-28 |
| DEVELOPMENT_PROTOCOL.md | 0.1.0 | 2026-06-28 |
| CURRENT_STATE.md | 0.1.0 | 2026-06-28 |
| ROADMAP.md | 0.1.0 | 2026-06-28 |
| ARCHITECTURE_DECISIONS.md | 0.1.0 | 2026-06-28 |
| CONTRIBUTING.md | 0.1.0 | 2026-06-28 |
| VERSION.md | 0.1.0 | 2026-06-28 |
| CHANGELOG.md | 0.1.0 | 2026-06-28 |
| RELEASE_NOTES_v0.1.0.md | 0.1.0 | 2026-06-28 |
| BASELINE.md | 0.1.0 | 2026-06-28 |
| RELEASE_MANIFEST.json | 0.1.0 | 2026-06-28 |
| BOOTSTRAP_CHECKLIST.md | 0.1.0 | 2026-06-28 |

## File Inventory

| Category | Count |
|---|---|
| Source files | 32 |
| Schema files | 5 |
| Profile files | 1 |
| Fixture files | 5 |
| Configuration files | 3 |
| Documentation files | 16 |
| **Total tracked files** | **57** |

## Invariant Status

| ID | Invariant | Status | Verification |
|---|---|---|---|
| I-1 | Kernel is read-only | ✅ | `node src/cli.js verify` |
| I-2 | Deterministic output from identical inputs | ✅ | `node src/detharness.js` |
| I-3 | Runtime measures completeness, never asserts it | ✅ | `node src/validation-harness.js` Q8 |
| I-4 | AI never touches project directly | ✅ | Architecture (no implement() in orchestrator) |
| I-5 | Every AI submission is validated, never trusted | ✅ | `node src/conformance-harness.js` |
| I-6 | Zero npm dependencies | ✅ | `package.json` has no `dependencies` field |
| I-7 | Ontology-first, not CRUD-hardcoded | ✅ | `profiles/crud-web.json` parameterizes engines |
| I-8 | Zero history rewrite | ✅ | Commit hashes immutable |

## Signature

This baseline was signed on 2026-06-28 by the Orchestrator agent after:
1. Verifying SHA-256 hashes of recovery artifacts.
2. Verifying git bundle validity and complete history.
3. Cross-verifying recovered repo against worktree tarball.
4. Publishing to `abdo-net/engineering-runtime` on GitHub.
5. Making `master` the default branch and removing the placeholder `main`.
6. Running all three harnesses on a clean clone.
7. Creating all operational documentation.
8. Verifying internal consistency of all documents.
9. Committing and pushing as one atomic commit.
10. Creating the v0.1.0 tag.
11. Verifying a clean clone reproduces the same baseline.

```
Signed:    2026-06-28
Signer:    Orchestrator
Witness:   git commit c03d4bed289365603dd6f81c07f76f151e0e1aab
Evidence:  RELEASE_MANIFEST.json (file hash manifest)
```

---

*This baseline is frozen. Any modification to this file invalidates the baseline certification. Future baselines (v0.2.0, etc.) will be created as new tags, not as modifications to this file.*
# VERSION.md — Engineering Runtime v0.1.0

**Version:** 0.1.0  
**Branch:** `master`  
**Tag:** `v0.1.0`  
**Commit:** `c03d4bed289365603dd6f81c07f76f151e0e1aab`  
**Tree Hash:** `72620319525089fcaad302e1fcf45bdf7b605687`  
**Date:** 2026-06-28  
**Status:** BASELINE FROZEN — Immutable

---

## 1. What v0.1.0 Contains

### 1.1 Completed Milestones

| Milestone | Description | Status |
|---|---|---|
| Milestone 1 | Deterministic reconstruction + frozen Execution Package | ✅ COMPLETE |
| Milestone 1.5 | Runtime Validation (vendor-agnostic submission protocol + validator) | ✅ COMPLETE |
| Milestone 1.6 | AI Conformance Framework (wire protocol + validator + 7 fixtures) | ✅ COMPLETE |

### 1.2 Implemented Subsystems (15 total)

| ID | Name | File(s) | Lines | Status |
|---|---|---|---|---|
| S1 | Kernel Bridge | `src/kernel.js` | 25 | ✅ |
| S2 | Store / Persistence | `src/store.js`, `src/util.js` | 53 | ✅ (in-memory only) |
| S3 | Adapter Framework | `src/adapters.js` | 129 | ✅ |
| S4 | Ontology Engine | `src/ontology.js`, `profiles/crud-web.json` | 38 | ✅ (warm read) |
| S5 | Reconstruction Engines | `src/engines.js` | 43 | ✅ (deterministic) |
| S6 | Graph + Impact | `src/graph.js` | 30 | ✅ |
| S7 | Truth Engine | `src/engines.js` | — | ✅ (DIRECT_OBSERVATION only) |
| S8 | Coverage / Completeness | `src/coverage.js` | 37 | ✅ |
| S10 | Packaging Engine | `src/packaging.js` | 36 | ✅ |
| S11 | Orchestrator | `src/orchestrator.js` | 54 | ✅ |
| S12 | Gates | `src/gates.js` | 20 | ✅ |
| S-VAL | Runtime Validation | `src/validator.js`, `src/validation.js`, `src/workers/` | 287 | ✅ |
| S-AICONF | AI Conformance Framework | `src/protocol.js`, `src/conformance.js`, `src/ai-conformance.js`, `src/ai-workers/` | 423 | ✅ |

### 1.3 Implemented CLI Commands (6 total)

- `verify` — Check Kernel pin
- `reconstruct` — Build model, coverage, gate
- `impact <node>` — Deterministic impact closure
- `package <node>` — Freeze Execution Package
- `validate [node]` — Runtime Validation report
- `conformance [node]` — AI Conformance report

### 1.4 Implemented Harnesses (3 total)

- `src/detharness.js` — Proves determinism (model, impact, package byte-identical across runs)
- `src/validation-harness.js` — Proves 10 Runtime Validation properties
- `src/conformance-harness.js` — Proves AI Conformance Framework rejects 6 untrusted behaviors

### 1.5 Implemented Schemas (5 total)

- `spec/schemas/node.schema.json`
- `spec/schemas/edge.schema.json`
- `spec/schemas/truth.schema.json`
- `spec/schemas/ai-input-package.schema.json`
- `spec/schemas/ai-output-package.schema.json`

### 1.6 Operational Documentation (16 files)

- `README.md` — Technical description of all subsystems
- `BOOTSTRAP.md` — Fresh session start protocol
- `HANDOFF.md` — Session handoff protocol
- `MACHINE_CONTEXT.md` — Machine-readable repository state
- `REPOSITORY_CHARTER.md` — Purpose, boundaries, governance
- `DEVELOPMENT_PROTOCOL.md` — Mandatory workflow before code changes
- `CURRENT_STATE.md` — Exact implementation status
- `ROADMAP.md` — Milestones 2–5 in execution order
- `ARCHITECTURE_DECISIONS.md` — 12 ADRs
- `CONTRIBUTING.md` — AI contributor rules
- `VERSION.md` — This file
- `CHANGELOG.md` — Milestone history
- `RELEASE_NOTES_v0.1.0.md` — Release notes
- `BASELINE.md` — Signed baseline
- `RELEASE_MANIFEST.json` — File hash manifest
- `BOOTSTRAP_CHECKLIST.md` — Pre-code checklist

### 1.7 Test Fixtures

- `fixtures/sample-project/` — NestJS/TypeORM sample project (5 files)
- `src/workers/` — 5 Runtime Validation conformance workers
- `src/ai-workers/` — 7 AI Conformance Framework conformance workers

---

## 2. What v0.1.0 Does NOT Contain

### 2.1 Missing Subsystems (by design, deferred to later milestones)

| ID | Name | Deferred To | Reason |
|---|---|---|---|
| S9 | Planning Engine | Milestone 3 | Planning requires a frozen Execution Package; Milestone 1 only produces one |
| S13 | Mediation (AI driver) | Milestone 2 | Live AI vendor API integration not yet available |
| S14 | Execution + escape hatch | Milestone 4 | Code generation must not exist until gates that constrain it are proven |
| S15 | Handoff | Milestone 4 | Human review requires execution artifacts; no artifacts exist yet |
| S2-persist | Git-file persistence | Milestone 3 | In-memory store is sufficient for deterministic proof |
| S7-promote | Truth promotion/invalidation | Milestone 3 | Truth stays at DIRECT_OBSERVATION; promotion needs persistence |
| S4-cold | Cold ontology inference | Milestone 3 | Warm read from committed profile is sufficient for Milestone 1 |
| S1-hash | Full Kernel hash verification | Milestone 2 | Path existence check is sufficient for Milestone 1 |

### 2.2 Missing Infrastructure

- CI/CD pipeline (GitHub Actions)
- Performance benchmarks
- Security audit automation
- `kernel.lock.schema.json` (referenced but not present)
- Live multi-vendor API calls (only deterministic fixtures exist)

### 2.3 What Will Never Be in v0.1.0

v0.1.0 is a **baseline**, not a moving target. The following are explicitly excluded from this version and will only appear in v0.2.0 or later:

- Code generation (S14)
- Live AI vendor integration (S13)
- Planning engine (S9)
- Git-file persistence (S2-persist)
- Truth promotion (S7-promote)
- CI/CD
- Performance benchmarks

---

## 3. Invariants (Must Hold for v0.1.0)

| ID | Invariant | Verification |
|---|---|---|
| I-1 | Kernel is read-only | `node src/cli.js verify` |
| I-2 | Deterministic output from identical inputs | `node src/detharness.js` |
| I-3 | Runtime measures completeness, never asserts it | `node src/validation-harness.js` Q8 |
| I-4 | AI never touches project directly | Architecture (no implement() in orchestrator) |
| I-5 | Every AI submission is validated, never trusted | `node src/conformance-harness.js` |
| I-6 | Zero npm dependencies | `package.json` has no `dependencies` field |
| I-7 | Ontology-first, not CRUD-hardcoded | `profiles/crud-web.json` parameterizes engines |
| I-8 | Zero history rewrite | Commit hashes immutable (`c4cb82c`, `ccf90d3`, `bdec482`, `c03d4be`) |

---

## 4. Baseline Verification

| Check | Expected | Actual | Status |
|---|---|---|---|
| HEAD | `c03d4be...` | `c03d4be...` | ✅ |
| Tree hash | `72620319...` | `72620319...` | ✅ |
| Determinism | `DETERMINISM PROVEN` | `DETERMINISM PROVEN` | ✅ |
| Validation | 10/10 PASS | 10/10 PASS | ✅ |
| Conformance | 7/7 PASS | 7/7 PASS | ✅ |
| Package snapshot | `e88cc4fc...` | `e88cc4fc...` | ✅ |
| Source files | 32 | 32 | ✅ |
| Total files | 57 | 57 | ✅ |
| npm dependencies | 0 | 0 | ✅ |

---

## 5. Usage

```bash
# Clone the baseline
git clone https://github.com/abdo-net/engineering-runtime.git
cd engineering-runtime

# Verify baseline
git log --oneline --all
node src/detharness.js
node src/validation-harness.js
node src/conformance-harness.js

# Use the CLI
node src/cli.js verify
node src/cli.js reconstruct
node src/cli.js impact column:users.status
node src/cli.js package column:users.status
node src/cli.js validate column:users.status
node src/cli.js conformance column:users.status
```

---

*v0.1.0 is frozen. All future work starts from this certified baseline and is tagged as part of Milestone 2 or later.*

# CHANGELOG.md — Engineering Runtime Milestone History

**Version:** 0.1.0  
**Tag:** `v0.1.0`  
**Commit:** `c03d4bed289365603dd6f81c07f76f151e0e1aab`  
**Date:** 2026-06-28  
**Status:** BASELINE FROZEN

---

## Changelog Format

Each entry contains:
- **Milestone:** The milestone name and number
- **Commit:** The git commit hash
- **Date:** When the milestone was completed
- **What Changed:** A summary of new subsystems, files, and features
- **What Broke:** Any backward-incompatible changes (none in v0.1.0)
- **Harness Status:** Whether the harnesses passed after this milestone
- **Known Issues:** Documented gaps that are not bugs

---

## Milestone 1: Deterministic Reconstruction + Frozen Execution Package

**Commit:** `c4cb82c84b5844f91881f8a0d72e81626901a2b0`  
**Date:** 2026-06-28 15:43:31 +0000

### Added

#### Subsystems
- **S1 Kernel Bridge** (`src/kernel.js`) — Loads `kernel.lock`, verifies pinned Kernel path exists, maps Runtime entities to Kernel RMM entities.
- **S2 Store / Persistence** (`src/store.js`, `src/util.js`) — In-memory model store with deterministic ordering, freeze guard, canonical JSON serialization, SHA-256 hashing.
- **S3 Adapter Framework** (`src/adapters.js`) — Regex-based parsers for SQL DDL, TypeORM entities, repositories, services, controllers, OpenAPI. Files processed in sorted order.
- **S4 Ontology Engine** (`src/ontology.js`, `profiles/crud-web.json`) — Loads committed ontology profile, derives edge type lookup and propagation set.
- **S5 Reconstruction Engines** (`src/engines.js`) — `buildStructural()` (E01/E03) and `buildTraceability()` (E11). Every node/edge gets a `DIRECT_OBSERVATION` truth record.
- **S6 Graph + Impact** (`src/graph.js`) — Forward BFS along propagating edges, returns lower-bound closure with coverage stamp.
- **S8 Coverage / Completeness** (`src/coverage.js`) — Measures closure coverage against ontology `impact_classes`, names blind spots.
- **S10 Packaging Engine** (`src/packaging.js`) — Freezes impact closure into Execution Package with `allowed_scope`, `gating_truth`, `repository_snapshot`, acceptance criteria.
- **S11 Orchestrator** (`src/orchestrator.js`) — Reconstruction pipeline: adapters → engines → coverage → gate → freeze.
- **S12 Gates** (`src/gates.js`) — `G-COVERAGE` and `G-RECONSTRUCTION-COMPLETE`: blocks with `INVESTIGATION` remediation when coverage < target.

#### CLI Commands
- `verify` — Check Kernel pin
- `reconstruct` — Build model, coverage, gate
- `impact <node>` — Deterministic impact closure
- `package <node>` — Freeze Execution Package

#### Harnesses
- `src/detharness.js` — Determinism proof: runs execution package twice, asserts byte-identical output.

#### Fixtures
- `fixtures/sample-project/` — NestJS/TypeORM sample project (5 files: `db.sql`, `openapi.json`, `user.entity.ts`, `users.controller.ts`, `users.repository.ts`, `users.service.ts`).
- `profiles/crud-web.json` — CRUD-web ontology profile.

#### Schemas
- `spec/schemas/node.schema.json` — Node schema
- `spec/schemas/edge.schema.json` — Edge schema
- `spec/schemas/truth.schema.json` — Truth schema

#### Configuration
- `package.json` — Zero dependencies, Node ≥ 20, CommonJS
- `kernel.lock` — Pins Kernel at `96042489b39e9a589280483054349ac2d7da00bc`
- `.gitignore` — Standard ignores

### Harness Status
- `detharness.js`: ✅ `DETERMINISM PROVEN` — package snapshot hash identical across runs.

### Known Issues
- Store is in-memory only (no persistence).
- Kernel verification only checks path existence, not commit hash.
- Ontology must be committed (no cold inference).
- Truth stays at `DIRECT_OBSERVATION` (no promotion).
- Coverage is a lower bound (absence of an edge is not proof of no dependency).

---

## Milestone 1.5: Runtime Validation

**Commit:** `ccf90d36193ed1baa84f98910a130c3842ca49da`  
**Date:** 2026-06-28 15:55:16 +0000

### Added

#### Subsystems
- **S-VAL Runtime Validation** (`src/validator.js`, `src/validation.js`) — Jaccard-based convergence measurement, set difference, unsupported detection, skipped analysis detection.

#### Workers (Conformance Fixtures)
- `src/workers/faithful-reorder.js` — Simulates vendor with different emission order. Tests order-independence.
- `src/workers/faithful-independent.js` — Simulates independent re-derivation from scratch. Tests cross-vendor convergence.
- `src/workers/guessing.js` — Simulates hallucinated unsupported node/edge. Tests automatic rejection.
- `src/workers/lazy.js` — Simulates skipped analysis with misreported coverage. Tests coverage consistency.
- `src/workers/resume-only.js` — Simulates artifact-only resume. Tests frozen artifact sufficiency.

#### Harnesses
- `src/validation-harness.js` — 10-property proof harness answering:
  - Q1: Topology convergence (independent reconstruction)
  - Q2: Knowledge graph convergence
  - Q3: Engineering truth convergence
  - Q4: Impact graph convergence
  - Q5: Execution package constraint equivalence
  - Q6: Detect skipped/guessed analysis
  - Q7: Automatic rejection of unsupported conclusions
  - Q8: Gate blocks missing reconstruction before planning
  - Q9: Resume from frozen artifacts only
  - Q10: Two independent executions converge

#### CLI Commands
- `validate [node]` — Runtime Validation report

### Harness Status
- `detharness.js`: ✅ `DETERMINISM PROVEN`
- `validation-harness.js`: ✅ `RUNTIME VALIDATION PROVEN` — all 10 properties pass with measured evidence.

### Known Issues
- Only deterministic fixtures exist. Live multi-vendor API calls are not yet exercised.
- The honesty caveat: convergence holds because the contract (deterministic id derivation + ontology classification + fixed schema) removes discretion, not because reconstruction was asserted identical.

---

## Milestone 1.6: AI Conformance Framework

**Commit:** `bdec48219f9e2ee48d6304ae1d22b727bff20edb`  
**Date:** 2026-06-28 16:03:02 +0000

### Added

#### Subsystems
- **S-AICONF AI Conformance Framework** — Wire protocol between Runtime and AI workers.
  - `src/protocol.js` — `buildInputPackage()`, `readAllowedFile()`, `REJECTION_REASONS` taxonomy (12 fixed codes), `TRUTH_CLASSES` enum.
  - `src/conformance.js` — Ordered validator pipeline: `verifySchema()` → `verifyContract()` → `verifyEvidence()` → `verifyImpact()` → `verifyScope()` → `verifyCoverageClaim()` → `evaluate()`.
  - `src/ai-conformance.js` — Orchestrator: runs 7 workers through the protocol, returns verdicts.

#### Workers (AI Conformance Fixtures)
- `src/ai-workers/compliant.js` — Fully compliant AI worker (must be accepted).
- `src/ai-workers/hallucinator.js` — Invents non-existent API (rejected: `UNSUPPORTED_NODE` + `EVIDENCE_NOT_VERIFIABLE`).
- `src/ai-workers/evidence-forger.js` — Cites real file, fake quote (rejected: `EVIDENCE_NOT_VERIFIABLE` + `UNSUPPORTED_NODE`).
- `src/ai-workers/lazy-coverage-liar.js` — Incomplete reconstruction, lies about coverage (rejected: `COVERAGE_MISCLAIM`).
- `src/ai-workers/scope-violator.js` — Proposes edit outside scope (rejected: `SCOPE_VIOLATION`).
- `src/ai-workers/instruction-ignorer.js` — Answers wrong target (rejected: `CONTRACT_VIOLATION`).
- `src/ai-workers/impact-underclaimer.js` — Omits required downstream nodes (rejected: `IMPACT_UNDERCLAIM`).

#### Schemas
- `spec/schemas/ai-input-package.schema.json` — AI Input Package schema
- `spec/schemas/ai-output-package.schema.json` — AI Output Package schema

#### Harnesses
- `src/conformance-harness.js` — 7-worker proof harness asserting expected verdicts and rejection codes.

#### CLI Commands
- `conformance [node]` — AI Conformance report

### Updated
- `src/cli.js` — Added `validate` and `conformance` commands.
- `README.md` — Updated with full Milestone 1.5 and 1.6 descriptions.

### Harness Status
- `detharness.js`: ✅ `DETERMINISM PROVEN`
- `validation-harness.js`: ✅ `RUNTIME VALIDATION PROVEN` (10/10)
- `conformance-harness.js`: ✅ `AI CONFORMANCE FRAMEWORK PROVEN` — all 7 workers pass with correct rejection codes.

### Known Issues
- Only deterministic fixtures exist. Live multi-vendor API calls are not yet exercised.
- The protocol is proven against known failure modes, ready for live integration in Milestone 2.

---

## Repository Initialization (Documentation Foundation)

**Commit:** `c03d4bed289365603dd6f81c07f76f151e0e1aab`  
**Date:** 2026-06-28 20:50:27 +0300

### Added

- `BOOTSTRAP.md` — Fresh session start protocol for any AI vendor
- `HANDOFF.md` — What the next AI must read, verify, execute, never assume
- `MACHINE_CONTEXT.md` — Machine-readable repository identity and state
- `REPOSITORY_CHARTER.md` — Purpose, boundaries, relationships with Kernel
- `DEVELOPMENT_PROTOCOL.md` — Mandatory 8-step workflow before code changes
- `CURRENT_STATE.md` — Exact implementation status, file inventory, known gaps
- `ROADMAP.md` — Milestones 2–5 in execution order with success criteria
- `ARCHITECTURE_DECISIONS.md` — 12 ADRs documenting decisions from recovery and initialization
- `CONTRIBUTING.md` — AI contributor rules: evidence, validation, 12 prohibitions

### Harness Status
- `detharness.js`: ✅ `DETERMINISM PROVEN`
- `validation-harness.js`: ✅ `RUNTIME VALIDATION PROVEN` (10/10)
- `conformance-harness.js`: ✅ `AI CONFORMANCE FRAMEWORK PROVEN` (7/7)
- **No source code modified.** Only documentation added.

---

## Release Freeze (v0.1.0)

**Tag:** `v0.1.0`  
**Commit:** `c03d4bed289365603dd6f81c07f76f151e0e1aab` (same as Repository Initialization)  
**Date:** 2026-06-28

### Added (Release Documents)

- `VERSION.md` — What v0.1.0 contains and does not contain
- `CHANGELOG.md` — This file
- `RELEASE_NOTES_v0.1.0.md` — Release notes
- `BASELINE.md` — Signed baseline with commit, tree hash, validation status
- `RELEASE_MANIFEST.json` — File hash manifest for all 57 tracked files
- `BOOTSTRAP_CHECKLIST.md` — Pre-code checklist for any future AI

### Harness Status (Final)
- `detharness.js`: ✅ `DETERMINISM PROVEN` — snapshot: `e88cc4fc...`
- `validation-harness.js`: ✅ `RUNTIME VALIDATION PROVEN` — 10/10 PASS
- `conformance-harness.js`: ✅ `AI CONFORMANCE FRAMEWORK PROVEN` — 7/7 PASS

### Baseline Verification
| Check | Value | Status |
|---|---|---|
| HEAD | `c03d4be...` | ✅ |
| Tree hash | `72620319...` | ✅ |
| Runtime version | 0.1.0 | ✅ |
| Kernel commit | `96042489...` | ✅ |
| Source files | 32 | ✅ |
| Total files | 57 | ✅ |
| npm dependencies | 0 | ✅ |
| Node engine | ≥ 20 | ✅ |

---

*v0.1.0 is frozen. All future work starts from this certified baseline and is tagged as part of Milestone 2 or later.*

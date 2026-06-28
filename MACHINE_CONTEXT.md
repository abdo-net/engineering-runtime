# MACHINE_CONTEXT.md — Machine-Readable Repository Identity

**Version:** 0.1.0  
**Format:** Structured key-value pairs designed for automated parsing and AI context injection.  
**Last updated:** 2026-06-28

---

## Repository Identity

```json
{
  "repository_name": "engineering-runtime",
  "repository_owner": "abdo-net",
  "canonical_url": "https://github.com/abdo-net/engineering-runtime",
  "default_branch": "master",
  "current_head": "bdec48219f9e2ee48d6304ae1d22b727bff20edb",
  "head_tree_hash": "b66df451e548305f0fe368a56f46e532bad0e215",
  "commit_count": 3,
  "license": "UNLICENSED",
  "private": true
}
```

## Kernel Dependency

```json
{
  "kernel_repo": "abdo-net/radius1-kernel",
  "kernel_path": "../radius1-kernel",
  "kernel_commit": "96042489b39e9a589280483054349ac2d7da00bc",
  "kernel_version": "1.x",
  "charter_id": "engineering-runtime-consumer",
  "kernel_access_mode": "read-only",
  "kernel_schema_ref": "spec/schemas/kernel.lock.schema.json",
  "kernel_schema_exists": false
}
```

## Runtime Version

```json
{
  "runtime_version": "0.1.0",
  "node_engine": ">=20",
  "npm_dependencies": 0,
  "package_type": "commonjs"
}
```

## Repository Role

| Property | Value |
|---|---|
| Role | Consumer repository (separate from Kernel, per `KERNEL_SCOPE_DEFINITION.md` §9.5) |
| Purpose | Deterministic Engineering Operating System that reconstructs a project's engineering model before any planning or code generation |
| Scope | Runtime logic, adapters, engines, validators, gates, orchestration, packaging, conformance, and mediation |
| What it is NOT | The Engineering Kernel (that is `abdo-net/radius1-kernel`) |
| What it does NOT do | Modify the Kernel; generate code (until Milestone 4); directly edit project files (until S14 Execution) |

## Milestones

### Completed

| Milestone | Commit | Description | Status |
|---|---|---|---|
| Milestone 1 | `c4cb82c` | Deterministic reconstruction + frozen Execution Package | ✅ COMPLETE |
| Milestone 1.5 | `ccf90d3` | Runtime Validation (vendor-agnostic submission protocol + validator) | ✅ COMPLETE |
| Milestone 1.6 | `bdec482` | AI Conformance Framework (wire protocol + validator + 7 fixtures) | ✅ COMPLETE |

### Pending

| Milestone | Target | Status |
|---|---|---|
| Milestone 2 | S13 Mediation + live multi-vendor AI loop | 🔄 PENDING |
| Milestone 3 | S9 Planning + S7 truth promotion + S2 git-file persistence | 🔄 PENDING |
| Milestone 4 | S14 Execution + escape hatch + S15 handoff | 🔄 PENDING |
| Milestone 5 | Multi-vendor determinism + production hardening | 🔄 PENDING |

## Invariants (Must Never Be Violated)

| ID | Invariant | Enforcement | Test |
|---|---|---|---|
| I-1 | Kernel is read-only | `kernel.js` never writes; `kernel.lock` pins commit | `node src/cli.js verify` |
| I-2 | Deterministic output from identical inputs | `canonical()` serialization; sorted keys/arrays; no timestamps | `node src/detharness.js` |
| I-3 | Runtime measures completeness, never asserts it | Coverage engine reports blind spots; gate blocks on false completeness | `node src/validation-harness.js` Q8 |
| I-4 | AI never touches project directly | All interaction through CLI/runtime; no direct file edits | Architecture enforcement |
| I-5 | Every AI submission is validated, never trusted | Conformance validator checks schema/evidence/impact/scope/coverage | `node src/conformance-harness.js` |
| I-6 | No npm dependencies | `package.json` has no `dependencies` or `devDependencies` | Static check |
| I-7 | Ontology-first, not CRUD-hardcoded | `profiles/crud-web.json` parameterizes all engines | `node src/cli.js reconstruct` |
| I-8 | Zero history rewrite | Commits are immutable; no squash/rebase/amend/force | Git policy (enforced by process) |

## Current Implementation State

### Subsystems

| Spec ID | Name | Module | Status |
|---|---|---|---|
| S1 | Kernel Bridge | `src/kernel.js` | ✅ Implemented (pin verify; full-hash verify = TODO) |
| S2 | Store / Persistence | `src/store.js`, `src/util.js` | ✅ Implemented (in-memory + canonical; git-file persistence = TODO) |
| S3 | Adapter Framework | `src/adapters.js` | ✅ Implemented |
| S4 | Ontology Engine | `src/ontology.js`, `profiles/crud-web.json` | ✅ Implemented (warm read; cold inference = TODO) |
| S5 | Reconstruction Engines | `src/engines.js` | ✅ Implemented (deterministic; reasoning engines = TODO) |
| S6 | Graph + Impact | `src/graph.js` | ✅ Implemented |
| S7 | Truth Engine | `src/engines.js` | ✅ Implemented (DIRECT_OBSERVATION only; promotion/invalidation = TODO) |
| S8 | Coverage / Completeness | `src/coverage.js` | ✅ Implemented |
| S9 | Planning | — | ❌ TODO (Milestone 3) |
| S10 | Packaging Engine | `src/packaging.js` | ✅ Implemented |
| S11 | Orchestrator | `src/orchestrator.js` | ✅ Implemented |
| S12 | Gates | `src/gates.js` | ✅ Implemented |
| S-VAL | Runtime Validation | `src/validator.js`, `src/validation.js`, `src/workers/` | ✅ Implemented (fixtures only; live multi-vendor = TODO) |
| S-AICONF | AI Conformance Framework | `src/protocol.js`, `src/conformance.js`, `src/ai-conformance.js`, `src/ai-workers/` | ✅ Implemented (fixtures only; live multi-vendor = TODO) |
| S13 | Mediation (AI driver) | — | ❌ TODO (Milestone 2) |
| S14 | Execution + escape hatch | — | ❌ TODO (Milestone 4) — by design |
| S15 | Handoff | — | ❌ TODO |

### Schemas

| Schema | File | Status |
|---|---|---|
| Node | `spec/schemas/node.schema.json` | ✅ Present |
| Edge | `spec/schemas/edge.schema.json` | ✅ Present |
| Truth | `spec/schemas/truth.schema.json` | ✅ Present |
| AI Input Package | `spec/schemas/ai-input-package.schema.json` | ✅ Present |
| AI Output Package | `spec/schemas/ai-output-package.schema.json` | ✅ Present |
| Kernel Lock | `spec/schemas/kernel.lock.schema.json` | ❌ Missing (referenced, not present) |

### Harnesses

| Harness | Tests | Status |
|---|---|---|
| `src/detharness.js` | Determinism (model, impact, package) | ✅ All PASS |
| `src/validation-harness.js` | 10 Runtime Validation properties | ✅ All PASS |
| `src/conformance-harness.js` | 7 AI conformance workers | ✅ All PASS |

### Source Module Inventory

```
src/adapters.js              (129 lines)  S3 — Adapter Framework
src/ai-conformance.js        (41 lines)   S-AICONF — Conformance orchestrator
src/ai-workers/compliant.js            (56 lines)   Compliant AI fixture
src/ai-workers/evidence-forger.js      (18 lines)   Evidence-forger fixture
src/ai-workers/hallucinator.js         (19 lines)   Hallucinator fixture
src/ai-workers/impact-underclaimer.js  (13 lines)   Impact-underclaimer fixture
src/ai-workers/instruction-ignorer.js  (12 lines)   Instruction-ignorer fixture
src/ai-workers/lazy-coverage-liar.js   (25 lines)   Lazy-coverage-liar fixture
src/ai-workers/scope-violator.js       (15 lines)   Scope-violator fixture
src/cli.js                   (73 lines)   CLI surface
src/conformance-harness.js   (39 lines)   AI Conformance proof harness
src/conformance.js           (168 lines)  S-AICONF — Conformance validator
src/coverage.js            (37 lines)   S8 — Coverage engine
src/detharness.js          (39 lines)   Determinism proof harness
src/engines.js             (43 lines)   S5 — Reconstruction engines
src/gates.js               (20 lines)   S12 — Gates
src/graph.js               (30 lines)   S6 — Graph + Impact
src/kernel.js              (25 lines)   S1 — Kernel Bridge
src/ontology.js            (14 lines)   S4 — Ontology Engine
src/orchestrator.js        (54 lines)   S11 — Orchestrator
src/packaging.js           (36 lines)   S10 — Packaging Engine
src/protocol.js            (59 lines)   S-AICONF — AI Input/Output Protocol
src/store.js               (31 lines)   S2 — Store
src/util.js                (22 lines)   S2 — Canonical JSON + Hashing
src/validation-harness.js  (44 lines)   Runtime Validation proof harness
src/validation.js          (97 lines)   S-VAL — Runtime Validation orchestrator
src/validator.js           (112 lines)  S-VAL — Validation engine
src/workers/faithful-independent.js    (31 lines)   Faithful-independent fixture
src/workers/faithful-reorder.js        (24 lines)   Faithful-reorder fixture
src/workers/guessing.js                (39 lines)   Guessing fixture
src/workers/lazy.js                    (29 lines)   Lazy fixture
src/workers/resume-only.js             (25 lines)   Resume-only fixture
```

**Total source code:** 1,306 lines across 33 files (excluding fixtures and harnesses).

---

*This file is machine-readable and human-readable. Any AI that modifies this file must update the `runtime_version` or `last_updated` field and record the change in `ARCHITECTURE_DECISIONS.md`.*

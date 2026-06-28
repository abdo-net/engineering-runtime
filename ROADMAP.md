# ROADMAP.md — Engineering Runtime Implementation Roadmap

**Version:** 0.1.0 → 0.2.0+  
**Branch:** `master`  
**Last reviewed:** 2026-06-28  
**Review conclusion:** REWRITTEN — optimal execution order established

---

## Roadmap Philosophy

The objective of the Engineering Runtime is **not** to implement subsystems in isolation. The objective is to build a deterministic system that allows any AI to:

1. Reconstruct a project completely before coding.
2. Understand architecture, semantics, behavior, and engineering intent.
3. Build Topology, Knowledge Graph, Engineering Truth, and Impact Graph.
4. Generate a deterministic Execution Package.
5. Execute only from that package.
6. Persist engineering state between sessions.
7. Allow another AI to resume work without losing understanding.
8. Guarantee deterministic engineering behavior through Runtime validation.

**Every milestone must directly advance one or more of these objectives.** If a milestone does not, it is removed or reordered.

**Rule:** Every milestone ships only when `detharness.js` stays green. The harness is the invariant gate.

---

## Completed Milestones (Baseline v0.1.0)

| # | Name | Objective Contribution | Status | Commit |
|---|---|---|---|---|
| 1 | Deterministic reconstruction | #1, #3, #4 — Topology, Knowledge Graph, Truth, Impact, Execution Package | ✅ COMPLETE | `c4cb82c` |
| 1.5 | Runtime Validation | #8 — vendor-agnostic convergence proof | ✅ COMPLETE | `ccf90d3` |
| 1.6 | AI Conformance Framework | #5, #8 — wire protocol + structured validation | ✅ COMPLETE | `bdec482` |
| 2 | S2 Git-File Persistence | #6, #7 — persist state; enable AI resumption | ✅ COMPLETE | `b877c35` |

---

## Critical Finding from Review

The existing roadmap (pre-review) placed **live vendor API integration** before **persistence**, **reasoning**, and **planning**. This was backwards. The core Runtime pipeline must work with deterministic fixtures before any live vendor is ever called. Vendor integration is a **deployment plugin**, not a core dependency.

More critically, the existing roadmap **omitted S5 Reasoning Engines entirely**. The current Runtime parses structure (tables, entities, endpoints) via regex, but it does **not** understand semantics, behavior, or engineering intent. Without reasoning engines, the Runtime cannot fulfill objective #2: "understand architecture, semantics, behavior and engineering intent."

**This roadmap has been rewritten to correct both errors.**

---

## Pending Milestones (Optimal Execution Order)

| # | Name | Objective Contribution | Primary Spec | Ships When |
|---|---|---|---|---|
| 3 | S5 Reasoning Engines | #2 — understand semantics, behavior, intent | ✅ COMPLETE | `fc2fe02` |
| 4 | S7 Truth Promotion + Invalidation | #3 — deepen Engineering Truth quality | ✅ COMPLETE | `18c99fb` |
| 5 | S9 Planning Engine | #4 — plan changes from frozen package | S9 | `detharness.js` green |
| 6 | S13 Mediation (Core AI Loop) | #5 — AI driver loop with fixtures | S13 | `detharness.js` green |
| 7 | S14 Execution + S15 Handoff | #5 — execute from package; hand off to human | S14, S15 | `detharness.js` green |
| 8 | S4 Cold Ontology Inference | #2 — infer ontology from raw source without committed profile | S4 | `detharness.js` green |
| 9 | Live Vendor Integration | #8 — plugin adapters for Claude, GPT, Gemini, Kimi, xAI | S13 plugin | `detharness.js` green + live tests |
| 10 | Production Hardening | #8 — CI/CD, benchmarks, security, performance | Infrastructure | All harnesses green |

---

## Milestone 2 — S2 Git-File Persistence

### Why First?

The objective says: "persist engineering state between sessions" and "allow another AI to resume work without losing understanding." Without persistence, every Runtime invocation starts from zero. No AI can resume another AI's work. Persistence is the **foundation for all subsequent milestones** that involve state accumulation over time.

### What the Existing Roadmap Got Wrong

Placed persistence after live vendor integration and bundled it with planning and truth promotion. Persistence is independent of vendors, planning, and truth. It must exist first.

### Deliverables

1. **`src/persistence.js`** — Git-file persistence layer
   - Each analyzed project gets a `<project>-runtime/` sibling git repository.
   - Stores: `model.json`, `impact.json`, `package.json`, `truth.json` (canonical, deterministic).
   - Commit hash becomes the Runtime snapshot ID (replaces SHA-256 of in-memory JSON).
   - `git tag` marks package versions.
   - Deterministic ordering: sorted keys, no timestamps, no volatile fields.
   - `load()` and `save()` round-trip: `canonical(load(path)) === canonical(save(store, path))`.

2. **`src/cli.js`** — New command:
   - `persist <projectDir>` — Write model to `<project>-runtime/` git repo.

3. **`src/session.js`** — Session state tracking (new module)
   - `sessionId`, `previousSessionId`, `mission`, `target`, `status` (active / blocked / completed).
   - Stored in `<project>-runtime/sessions/` as JSON files.
   - Enables "another AI to resume work without losing understanding."

4. **`src/handoff-protocol.js`** — Formal resumption protocol (new module)
   - `generateHandoff()` — Produces a `HANDOFF.md` in `<project>-runtime/` describing:
     - What was the previous AI working on.
     - What was discovered.
     - What was blocked and why.
     - What the next AI should do.
   - `loadHandoff()` — Parses the handoff for a new AI session.
   - This is the machine-readable equivalent of `HANDOFF.md` for the Runtime itself.

### Success Criteria
- [x] `node src/cli.js persist fixtures/sample-project` produces a `<project>-runtime/` git repo with `model.json`, `impact.json`, `package.json`, `truth.json`.
- [x] Persistence round-trip: write → read → `canonical()` matches original.
- [x] Git tags are created for each persisted package.
- [x] `detharness.js` still passes (determinism of the Runtime itself is invariant).
- [x] A second AI can clone `<project>-runtime/` and reconstruct the exact same model by reading `model.json`.

### Dependencies
- Git must be available in the environment.
- No dependency on Milestone 3–10.

---

## Milestone 3 — S5 Reasoning Engines

### Why Now?

The objective says: "understand architecture, semantics, behavior and engineering intent." The current S5 only has `buildStructural()` and `buildTraceability()` — deterministic regex-based parsers that extract *what* exists, not *what it means* or *what it does*. This is the most critical gap in the current implementation.

Without reasoning engines, the Runtime can say "there is a function `updateUser`" but it cannot say "this function updates a user entity after validating the input DTO and checking permissions, then emits a domain event." The latter is engineering intent. It is the difference between a parser and an understanding system.

### What the Existing Roadmap Got Wrong

**Omitted entirely.** The existing roadmap had no milestone for reasoning engines. It jumped from vendor integration to planning without ever building the understanding layer that makes planning meaningful.

### Deliverables

1. **`src/reasoning.js`** — Reasoning Engine (new module, E02/E04/E05/E06/E07/E08/E09/E10)
   - `inferSemantics()` — Extract semantic meaning from code comments, JSDoc, docstrings, and naming conventions. E.g., `updateUser` → "updates user entity".
   - `inferBehavior()` — Extract behavioral contracts from function bodies: side effects, error paths, async boundaries, state mutations.
   - `inferBusinessRules()` — Extract rules from validation logic, conditionals, guard clauses, and assertions.
   - `inferStateMachines()` — Extract state transitions from switch/case, enum usage, and state variable patterns.
   - `inferDtoTransformations()` — Map data transformations between layers (Controller → Service → Repository → Entity).
   - `inferPermissions()` — Extract authorization patterns from decorator usage, guard references, and role checks.
   - `inferErrorHandling()` — Extract error strategy from try/catch, error classes, and fallback patterns.
   - Every inference produces a `DERIVED_FACT` truth record with evidence and confidence level.

2. **`src/engines.js` updates**
   - Add `buildReasoning()` function that calls all inference functions above.
   - Reasoning runs after structural and traceability engines, using their output as input.
   - Reasoning is deterministic: same source + same structural model → same derived facts.
   - Confidence level is not discretionary — it is computed from evidence density (e.g., how many code locations support the inference).

3. **`spec/schemas/reasoning.schema.json`** — Schema for reasoning outputs
   - `inference_type`: `SEMANTIC`, `BEHAVIOR`, `BUSINESS_RULE`, `STATE_MACHINE`, `DTO_TRANSFORMATION`, `PERMISSION`, `ERROR_HANDLING`.
   - `confidence`: `0.0` to `1.0`, computed deterministically from evidence.
   - `evidence`: array of `source_ref` + `line_range` + `quote`.
   - `truth_id`: reference to the `DERIVED_FACT` truth record.

4. **`src/cli.js`** — New command:
   - `reason <projectDir>` — Run reasoning engines on a project and print derived facts.

### Success Criteria
- [x] `node src/cli.js reason fixtures/sample-project` produces at least 5 derived facts with evidence and confidence > 0.5.
- [x] Reasoning output is deterministic: same input → same derived facts on every run.
- [x] `detharness.js` still passes (the determinism harness may need to be updated to include reasoning output in the canonical form, but the core must remain deterministic).
- [x] Every derived fact has a `source_ref` and `evidence_quote` that the validator can verify.
- [x] Reasoning does not break existing structural and traceability engines.
- [ ] Reasoning does not break existing structural and traceability engines.

### Dependencies
- Milestone 2 (persistence) — reasoning outputs should be persisted to `<project>-runtime/reasoning.json`.

### Design Note

Reasoning engines are **not** AI-driven. They are deterministic code analyzers that use static analysis patterns (AST traversal, control flow analysis, data flow analysis) to extract meaning. The *output* (derived facts) is fed into the model store. An AI worker (via Mediation) may later *challenge* a derived fact, but the Runtime generates the initial set deterministically.

This preserves the Runtime's deterministic guarantee while still producing deeper understanding than regex parsing.

---

## Milestone 4 — S7 Truth Promotion + Invalidation

### Why Now?

The objective says: "build Engineering Truth." The current S7 only produces `DIRECT_OBSERVATION` truth records. But engineering truth has a lifecycle: Observed → Documented → Validated → Published → Challenged → Corrected. Without promotion and invalidation, the Truth layer is static. It cannot deepen as the Runtime learns more about the project.

Reasoning engines (Milestone 3) produce `DERIVED_FACT` truths. Truth promotion (Milestone 4) allows those derived facts to mature into `VERIFIED_FACT` or `HYPOTHESIS` as more evidence accumulates. This creates a deepening model, not a static one.

### What the Existing Roadmap Got Wrong

Bundled truth promotion with planning and persistence. Truth promotion is a separate concern about model quality. It also depended on live vendor integration, which is unnecessary.

### Deliverables

1. **`src/truth.js`** — Truth Lifecycle Engine (new module, E15 promotion)
   - `promoteTruth(id, toClass)` — transitions: `Observed → Documented → Validated → Published`.
   - `invalidateTruth(id, reason)` — transitions: `Published → Challenged → Corrected | Rejected | Superseded`.
   - `evaluateTruth(id)` — Recompute confidence of a truth based on current evidence.
   - `mergeTruth(oldId, newId)` — When two truths converge on the same finding, merge them and preserve both evidence chains.
   - Gate: `G-TRUTH-VALID` — all `Published` truths must have ≥ 2 independent evidence sources.
   - Gate: `G-TRUTH-CONSISTENT` — no two Published truths may contradict each other.

2. **`src/engines.js` updates**
   - Add `buildTruth()` function that calls `promoteTruth()` on newly derived facts from reasoning engines.
   - Add `pruneTruth()` function that removes `REJECTED` or `SUPERSEDED` truths from the active model (but preserves them in the persisted store for auditability).

3. **`src/cli.js`** — New commands:
   - `promote <truthId>` — Promote a truth record.
   - `invalidate <truthId> <reason>` — Invalidate a truth record.
   - `truth <projectDir>` — Print all truth records with their lifecycle state.

4. **`src/gates.js`** — New gates:
   - `G-TRUTH-VALID` — all Published truths have ≥ 2 evidence sources.
   - `G-TRUTH-CONSISTENT` — no contradictions among Published truths.

### Success Criteria
- [x] Truth promotion produces a git diff in the `<project>-runtime` repo (new truth state committed).
- [x] `G-TRUTH-VALID` blocks when a Published truth has < 2 evidence sources.
- [x] `G-TRUTH-CONSISTENT` blocks when two Published truths contradict.
- [x] `detharness.js` still passes (determinism preserved — truth transitions are deterministic for a given evidence set).
- [x] Reasoning-derived facts can be promoted to Published and invalidated when challenged.

### Dependencies
- Milestone 2 (persistence) — truth state must be persisted.
- Milestone 3 (reasoning) — derived facts must exist to be promoted.

---

## Milestone 5 — S9 Planning Engine

### Why Now?

The objective says: "generate a deterministic Execution Package" and "execute only from that package." Planning is the bridge between "understanding the project" and "knowing what to change." Without planning, the Execution Package is just a frozen snapshot — it has no forward direction.

### What the Existing Roadmap Got Wrong

Planned before reasoning and truth promotion. But planning requires understanding what to change and why. Reasoning engines produce the semantic understanding that makes planning meaningful. Truth promotion ensures the plan is grounded in verified facts, not assumptions.

### Deliverables

1. **`src/planning.js`** — Planning Engine (E16)
   - Input: frozen Execution Package + target change + verified truth model.
   - Output: ordered plan of `HYPOTHESIS`-only proposals (no execution yet).
   - Each proposal: `id`, `type` (`CREATE` | `MODIFY` | `DELETE`), `target`, `rationale`, `dependencies`, `required_truths` (list of truth IDs that must be verified before execution), `risk_level` (`LOW`, `MEDIUM`, `HIGH`, computed from impact closure size and affected node classes).
   - Gate: `G-PLAN-VALID` — plan must be a subgraph of the Execution Package impact closure.
   - Gate: `G-PLAN-TRUTH-BASED` — every proposal must reference at least one `Published` truth as rationale.
   - Plan generation is deterministic: same package + same target + same truth model → same plan.

2. **`src/cli.js`** — New command:
   - `plan <target>` — Generate plan from frozen package + truth model.

3. **`src/gates.js`** — New gates:
   - `G-PLAN-VALID` — plan references only nodes in impact closure.
   - `G-PLAN-TRUTH-BASED` — every proposal is grounded in a Published truth.
   - `G-PLAN-RISK-ACCEPTABLE` — no proposal exceeds the project's configured risk threshold.

### Success Criteria
- [ ] `node src/cli.js plan column:users.status` produces a valid plan constrained to the package's `allowed_scope`.
- [ ] Every proposal in the plan references at least one `Published` truth.
- [ ] Plan risk levels are computed deterministically.
- [ ] Gate `G-PLAN-VALID` blocks plans that reference nodes outside the impact closure.
- [ ] Gate `G-PLAN-TRUTH-BASED` blocks plans with no Published truth rationale.
- [ ] `detharness.js` still passes (planning is deterministic for identical inputs).

### Dependencies
- Milestone 3 (reasoning) — semantic understanding needed to generate meaningful plans.
- Milestone 4 (truth promotion) — Published truths needed as plan rationale.
- Milestone 2 (persistence) — plans must be persisted to `<project>-runtime/plans/`.

---

## Milestone 6 — S13 Mediation (Core AI Loop)

### Why Now?

The objective says: "guarantee deterministic engineering behavior through Runtime validation." The Mediation subsystem is the AI driver loop — how the Runtime sends work to an AI worker and receives results. It validates every submission before it is accepted. This is the operational core of the Runtime's trust model.

### What the Existing Roadmap Got Wrong

Conflated "Mediation" with "live vendor API calls." Mediation is the core loop; vendor adapters are plugins. The core loop must work with fixtures before any live vendor is ever called. Also, the existing roadmap placed Mediation before planning and persistence, which is backwards — the AI worker needs a persisted plan to execute, and the Runtime needs to persist the AI's output.

### Deliverables

1. **`src/mediation.js`** — Core AI Mediation Loop (S13)
   - `mediate(inputPackage, worker)` — Sends Input Package to a worker (fixture or live), receives Output Package, validates with `src/conformance.js`, returns verdict.
   - `retry()` — On `SCHEMA_INVALID`, retry once with the same worker.
   - `sandbox()` — Runs the worker in a timeout-constrained environment (`deadline_ms`).
   - `record()` — Records the full Input/Output/Verdict triple to `<project>-runtime/mediation/` for auditability.
   - The loop is deterministic in its validation behavior: same Input + same Output → same verdict, every time.

2. **`src/config.js`** — Configuration management (no secrets)
   - `getTimeout()` — Returns `deadline_ms` from environment or default (30000).
   - `getWorkerRegistry()` — Returns list of available workers (fixtures + configured vendors).
   - No API keys in this file. Keys are only read in vendor adapters (Milestone 9).

3. **`src/session.js` updates**
   - `startSession()` — Creates a new session with a unique ID, records the mission/target.
   - `endSession()` — Finalizes the session, writes the handoff document.
   - `resumeSession(sessionId)` — Loads a previous session's state from `<project>-runtime/sessions/`.

4. **`src/cli.js`** — New command:
   - `mediate <target>` — Run the full mediation loop: reconstruct → package → build Input Package → send to default worker → validate → record verdict.

### Success Criteria
- [ ] `node src/cli.js mediate column:users.status` produces a valid Input Package, receives an Output Package (from fixture or live worker), and returns a verdict.
- [ ] Mediation loop is deterministic: same Input + same Output → same verdict.
- [ ] Every mediation interaction is recorded to `<project>-runtime/mediation/`.
- [ ] `detharness.js` still passes.
- [ ] Works with fixtures when no vendor keys are configured.

### Dependencies
- Milestone 2 (persistence) — mediation records must be persisted.
- Milestone 5 (planning) — AI worker needs a plan to execute, not just a reconstruction.

---

## Milestone 7 — S14 Execution + S15 Handoff

### Why Now?

The objective says: "execute only from that package" and "allow another AI to resume work without losing understanding." Execution is the step where the Runtime actually modifies project files. The Handoff is the step where the Runtime passes the result to a human or another AI for review. Both require the full pipeline to be in place: reconstruct → reason → plan → mediate → execute → handoff.

### What the Existing Roadmap Got Right

Execution and handoff were correctly placed after planning. This was the only correct ordering in the original roadmap.

### Deliverables

1. **`src/execution.js`** — Execution Engine (S14)
   - Input: approved plan + frozen Execution Package + validated AI Output Package.
   - Output: file modifications (git patches or direct file writes).
   - Each edit is a `HYPOTHESIS` proposal until the human or AI accepts it.
   - Modifies only files in `allowed_scope`.
   - Preserves deterministic ordering and canonical formatting.
   - `generatePatch()` — Produces a git diff from the plan.
   - `applyPatch()` — Applies the patch to the project files.
   - `rollback()` — Reverts the patch if the escape hatch detects a contradiction.

2. **`src/escape-hatch.js`** — Contradiction Detection (new module)
   - Re-runs adapters and reasoning engines on modified source post-edit.
   - Compares new model against expected model from plan.
   - Mismatch → `CONTRADICTION` finding + automatic rollback.
   - Rollback restores files from git stash or backup.
   - Gate: `G-CONTRADICTION-FREE` — escape hatch detects no contradiction.

3. **`src/handoff.js`** — Human Review Handoff (S15)
   - Generates PR description from plan + impact closure + truth records + reasoning-derived facts.
   - Includes: `allowed_scope`, `coverage`, `blindspots`, `gating_truth`, `acceptance_criteria`, `reasoning_summary`, `risk_assessment`.
   - Human or AI approves/rejects each proposed edit individually.
   - Rejected edits are reverted; accepted edits are committed.
   - Handoff document is also written to `<project>-runtime/handoffs/` for the next AI session.

4. **`src/cli.js`** — New commands:
   - `execute <planId>` — Generate patches from an approved plan.
   - `review <planId>` — Generate handoff report.
   - `submit <planId>` — Create PR with handoff metadata.
   - `rollback <planId>` — Revert an executed plan.

5. **`src/gates.js`** — New gates:
   - `G-EXECUTION-VALID` — all edits are within `allowed_scope`.
   - `G-CONTRADICTION-FREE` — escape hatch detects no contradiction.
   - `G-HANDOFF-COMPLETE` — handoff report includes all required fields.

### Success Criteria
- [ ] A plan can be executed and produce a git diff that only touches files in `allowed_scope`.
- [ ] Escape hatch detects a contradiction (e.g., plan says "add field" but adapter finds no new field after edit).
- [ ] Handoff report includes all required evidence for human or AI review.
- [ ] `detharness.js` still passes (determinism of the Runtime itself is invariant).
- [ ] Gate `G-EXECUTION-VALID` blocks edits outside `allowed_scope`.
- [ ] Gate `G-CONTRADICTION-FREE` blocks when escape hatch detects a mismatch.
- [ ] A second AI can read the handoff document and resume the project without re-reading the original source.

### Dependencies
- Milestone 5 (planning) — execution requires an approved plan.
- Milestone 6 (mediation) — execution requires a validated AI submission.
- Milestone 2 (persistence) — handoff documents must be persisted.

---

## Milestone 8 — S4 Cold Ontology Inference

### Why Now?

The objective says: "reconstruct a project completely." The current ontology is "warm read" — a committed JSON file (`profiles/crud-web.json`) that a human must write before the Runtime can analyze a project. Cold ontology inference allows the Runtime to discover the ontology from the project itself, without human intervention. This is what makes the Runtime truly autonomous.

Placed after execution because it is an optimization, not a dependency. The Runtime works with committed profiles. Cold inference makes it work with *any* project.

### Deliverables

1. **`src/ontology-inference.js`** — Cold Ontology Inference Engine (new module, E00 cold)
   - Analyzes project files to infer: node classes, edge types, impact classes, coverage targets.
   - Uses reasoning engine outputs (from Milestone 3) as input: semantic types, behavioral patterns, state machines.
   - Produces a `discovered-ontology.json` that a human can review and ratify.
   - Inference is deterministic: same project → same discovered ontology.
   - Ratified ontologies are committed to `profiles/` and become warm-read ontologies.

2. **`src/cli.js`** — New command:
   - `infer-ontology <projectDir>` — Infer ontology from raw project source.

### Success Criteria
- [ ] `node src/cli.js infer-ontology fixtures/sample-project` produces a `discovered-ontology.json` that matches `profiles/crud-web.json` within 90% overlap (Jaccard on node classes and edge types).
- [ ] Discovered ontology is deterministic for a given project.
- [ ] `detharness.js` still passes (warm-read ontologies are still the primary path; cold inference is an optional bootstrap step).

### Dependencies
- Milestone 3 (reasoning) — semantic understanding needed to infer ontology.

---

## Milestone 9 — Live Vendor Integration

### Why Now?

The objective says: "guarantee deterministic engineering behavior through Runtime validation." Live vendor integration is the **deployment plugin** that allows the Runtime to use real AI models (Claude, GPT, Gemini, Kimi, xAI) instead of deterministic fixtures. It is not a core feature. The core pipeline must work with fixtures before any live vendor is ever called.

Placed after execution because the entire pipeline must be proven with fixtures before testing with live vendors. A vendor adapter is worthless if the pipeline it feeds into is broken.

### What the Existing Roadmap Got Wrong

Placed vendor integration as Milestone 2, before planning, persistence, reasoning, and execution. This made the entire Runtime dependent on external API keys and network access. The core pipeline was blocked by a deployment plugin.

### Deliverables

1. **`src/vendors/claude.js`** — Anthropic API adapter (`/v1/messages`).
2. **`src/vendors/openai.js`** — OpenAI API adapter (`/v1/chat/completions`).
3. **`src/vendors/gemini.js`** — Google Gemini API adapter (`/v1beta/models/...`).
4. **`src/vendors/kimi.js`** — Moonshot Kimi API adapter (`/v1/chat/completions`).
5. **`src/vendors/xai.js`** — xAI Grok API adapter (`/v1/chat/completions`).
6. **Environment variable configuration** — `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `KIMI_API_KEY`, `XAI_API_KEY`.
7. **Cross-vendor convergence test** — Run the full pipeline with 3+ vendors, prove Jaccard ≥ 0.95.

### Success Criteria
- [ ] At least 2 live vendors produce accepted compliant submissions through the Runtime.
- [ ] At least 1 live vendor's untrusted behavior is caught by the validator with the correct rejection code.
- [ ] Cross-vendor Jaccard ≥ 0.95 for full pipeline output.
- [ ] No API keys committed to the repository.
- [ ] `detharness.js` still passes with fixtures.
- [ ] All 3 harnesses pass with both fixtures and live vendors.

### Dependencies
- Milestone 6 (mediation core) — the vendor adapters plug into the mediation loop.
- Milestone 7 (execution) — the vendor's output must be executable.
- API keys for at least 2 vendors.
- Network access to vendor APIs.

---

## Milestone 10 — Production Hardening

### Why Now?

The objective says: "guarantee deterministic engineering behavior through Runtime validation." Production hardening is the infrastructure that validates the Runtime continuously: CI/CD, benchmarks, security audit, performance monitoring. It is not a feature, but it is necessary for the Runtime to be trusted in production.

Placed last because it validates everything that came before. CI/CD with no pipeline to test is useless.

### Deliverables

1. **CI/CD pipeline** — GitHub Actions
   - Run all 3 harnesses on every PR.
   - Run security audit on every PR.
   - Run performance benchmarks on every PR.
   - All checks must pass before merge.

2. **Performance benchmarks**
   - Adapter parsing speed (files/sec).
   - Impact closure speed (nodes + edges).
   - Package freeze speed (model size vs. time).
   - Reasoning engine speed (facts/sec).
   - Planning speed (proposals/sec).
   - Benchmarks run in CI on every PR.

3. **Security audit**
   - No secrets in repository (scan for API keys, tokens, passwords).
   - No `eval()` or `Function()` usage.
   - No network calls in core engines (S1–S12, S5 reasoning, S7, S9, S14, S15).
   - Network calls only in `src/vendors/` (Milestone 9) and `src/mediation.js` (Milestone 6).
   - Input validation on all external-facing functions.

### Success Criteria
- [ ] All 3 harnesses run in CI < 30 seconds.
- [ ] No security warnings (trivially true — zero dependencies in core).
- [ ] Performance benchmarks establish baseline for future regression detection.
- [ ] CI blocks PRs with failing harnesses.
- [ ] CI blocks PRs with security warnings.
- [ ] CI blocks PRs with performance regressions > 10%.

### Dependencies
- All previous milestones (1–9) must be complete.

---

## Dependency Graph

```
Milestone 1 (Reconstruction) ──┐
Milestone 1.5 (Validation) ────┤
Milestone 1.6 (Conformance) ───┤
                                 │
                                 ▼
                    Milestone 2 (Persistence)
                                 │
                                 ▼
                    Milestone 3 (Reasoning)
                                 │
                                 ▼
                    Milestone 4 (Truth Promotion)
                                 │
                                 ▼
                    Milestone 5 (Planning)
                                 │
                                 ▼
                    Milestone 6 (Mediation Core)
                                 │
                                 ▼
                    Milestone 7 (Execution + Handoff)
                                 │
                                 ▼
                    Milestone 8 (Cold Ontology Inference)
                                 │
                                 ▼
                    Milestone 9 (Live Vendor Integration)
                                 │
                                 ▼
                    Milestone 10 (Production Hardening)
```

**Key rule:** No milestone can be skipped. Each builds on the previous. The only exception is Milestone 8 (Cold Ontology Inference), which is an optional optimization that can be deferred if needed.

---

## Review Summary: Why the Original Roadmap Was Wrong

| Original | Problem | Fix |
|---|---|---|
| Milestone 2: Live Vendor Integration | Blocked entire pipeline on external API keys; conflated Mediation with vendor plugins | Moved to Milestone 9; split Mediation core into Milestone 6 |
| Milestone 3: Planning + Truth + Persistence | Bundled three unrelated subsystems; depended on live vendors | Split into three separate milestones (2, 4, 5); removed vendor dependency |
| Milestone 5: Multi-vendor + CI/CD | Conflated integration test with infrastructure | Split into Milestone 9 (vendor integration) and Milestone 10 (production hardening) |
| **Missing: Reasoning Engines** | No milestone for understanding semantics, behavior, intent | Added Milestone 3 (S5 Reasoning Engines) |
| **Missing: Session Resumption** | No formal protocol for AI-to-AI handoff | Added `src/session.js` and `src/handoff-protocol.js` in Milestone 2 |
| **Missing: Cold Ontology Inference** | No milestone for autonomous ontology discovery | Added Milestone 8 (S4 Cold Inference) |

---

## Post-Milestone 10

After Milestone 10, the Engineering Runtime is **production-ready**. Future work may include:

- Additional adapter types (GraphQL, gRPC, microservices, embedded).
- Additional reasoning inference types (performance patterns, security patterns, accessibility patterns).
- Additional ontology profiles (event-driven, serverless, blockchain, ML pipelines).
- Additional vendor support (local LLMs, self-hosted models, enterprise API gateways).
- Performance optimizations (incremental reconstruction, model caching, parallel reasoning).
- Integration with IDE plugins (VS Code, JetBrains, Neovim).
- Multi-project orchestration (monorepo support, cross-service impact analysis).

These are outside the current roadmap and require new ADRs.

---

*This roadmap was rewritten on 2026-06-28 after an engineering review of the original roadmap. The review found that the original order was backwards (vendor integration before core pipeline) and that reasoning engines were omitted entirely. This rewritten roadmap establishes the optimal execution order for all future Engineering Runtime implementation.*

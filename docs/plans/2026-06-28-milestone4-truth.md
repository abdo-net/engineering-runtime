# Milestone 4 Plan: S7 Truth Promotion + Invalidation

**Date:** 2026-06-28  
**Milestone:** 4 — S7 Truth Promotion + Invalidation  
**Objective:** Implement truth lifecycle transitions (Observed → Documented → Validated → Published → Challenged → Corrected → Archived), validate truth quality via gates, and enable deterministic truth promotion with git-tracked changes.

---

## 1. Background

Truth records currently exist in two forms:
- `DIRECT_OBSERVATION` from adapters (CODE authority) — lifecycle: Observed
- `DERIVED_FACT` from reasoning engines (REASONING authority) — lifecycle: Derived

Neither has lifecycle transitions. Truth stays at its initial state forever. There is no validation of truth quality, no promotion, no contradiction detection, and no invalidation.

This milestone implements the full truth lifecycle:

```
Observed → Documented → Validated → Published → Challenged → Corrected → Archived
```

And two gates:
- `G-TRUTH-VALID` — published truths must have ≥ 2 evidence sources
- `G-TRUTH-CONSISTENT` — no two published truths may contradict

---

## 2. Deliverables

### 2.1 `src/truth.js` — Truth Lifecycle Engine (new module)

Functions:
| Function | Purpose |
|---|---|
| `evaluateTruth()` | Check if a truth record meets promotion criteria for its target state |
| `promoteTruth()` | Advance a truth record to the next lifecycle state |
| `invalidateTruth()` | Mark a truth as Challenged or Invalid with reason |
| `mergeTruth()` | Merge two truths with the same subject, keeping higher-confidence evidence |
| `findContradictions()` | Detect pairs of published truths that contradict each other |
| `buildTruthLifecycle()` | Process all truth records in a store, auto-promote where eligible |

Promotion criteria:
| From → To | Criteria |
|---|---|
| Observed → Documented | Has `statement` and ≥ 1 evidence source |
| Documented → Validated | Has ≥ 2 independent evidence sources |
| Validated → Published | All dependencies are at least Validated; no contradictions |
| Published → Challenged | Explicit invalidation with evidence |
| Challenged → Corrected | New evidence supersedes the challenge |
| Any → Archived | Explicit archival request |

Contradiction detection: Two truths contradict when they share the same `subject` but have opposite `statement` values (determined by string comparison of normalized statements).

### 2.2 `src/gates.js` — New gates

- `G-TRUTH-VALID` — blocks when any Published truth has < 2 evidence sources
- `G-TRUTH-CONSISTENT` — blocks when any two Published truths contradict

### 2.3 `src/cli.js` — New commands

- `promote <truthId>` — promote a truth record to the next lifecycle state
- `invalidate <truthId> --reason="..."` — invalidate a truth record
- `truth` — list all truth records with lifecycle state and evidence count

### 2.4 `src/persistence.js` — Update

Truth lifecycle state is already persisted via `truth.json` (part of the model). No changes needed — the `save()` function writes all truth records including their `lifecycle` field.

### 2.5 `harnesses/truth-harness.js`

Tests:
1. Truth promotion works through all lifecycle states
2. `G-TRUTH-VALID` blocks when Published truth has < 2 evidence
3. `G-TRUTH-CONSISTENT` blocks when two truths contradict
4. Determinism: same store → same truth lifecycle results
5. Invalidation produces Challenged state with reason
6. Merge combines truth records correctly
7. CLI integration

---

## 3. Success Criteria (from ROADMAP)

- [ ] Truth promotion produces a git diff in `<project>-runtime` repo.
- [ ] `G-TRUTH-VALID` blocks when Published truth has < 2 evidence sources.
- [ ] `G-TRUTH-CONSISTENT` blocks when two Published truths contradict.
- [ ] `detharness.js` still passes.
- [ ] Every truth lifecycle transition is deterministic and reversible.

---

## 4. Implementation Order

1. Write `src/truth.js`
2. Update `src/gates.js`
3. Update `src/cli.js`
4. Create `harnesses/truth-harness.js`
5. Run all 5 harnesses (4 original + 1 new)
6. Commit and push

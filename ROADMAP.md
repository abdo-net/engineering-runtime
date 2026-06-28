# ROADMAP.md — Remaining Milestones in Execution Order

**Version:** 0.1.0  
**Branch:** `master`  
**Last updated:** 2026-06-28

---

## 1. Milestone Overview

| # | Name | Spec | Status | Ships When |
|---|---|---|---|---|
| 1 | Deterministic reconstruction | S1–S12 | ✅ COMPLETE | `c4cb82c` |
| 1.5 | Runtime Validation | S-VAL | ✅ COMPLETE | `ccf90d3` |
| 1.6 | AI Conformance Framework | S-AICONF | ✅ COMPLETE | `bdec482` |
| 2 | S13 Mediation + live AI loop | S13 | 🔄 PENDING | `detharness.js` green |
| 3 | S9 Planning + truth promotion + persistence | S9, S7, S2 | 🔄 PENDING | `detharness.js` green |
| 4 | S14 Execution + escape hatch + S15 handoff | S14, S15 | 🔄 PENDING | `detharness.js` green |
| 5 | Multi-vendor determinism + production | All | 🔄 PENDING | CI green, benchmarks pass |

**Rule:** Every milestone ships only when `detharness.js` stays green. The harness is the invariant gate.

---

## 2. Milestone 2 — S13 Mediation + Live Multi-Vendor AI Loop

### Goal
Replace the deterministic `src/ai-workers/` fixtures with live AI vendor calls through the proven Input/Output Package protocol.

### Deliverables

1. **`src/mediation.js`** — JSON-RPC client loop
   - Accepts `buildInputPackage()` output.
   - Sends to configured vendor endpoints.
   - Receives AI Output Package, validates with `src/conformance.js`.
   - Retries on `SCHEMA_INVALID` with 1-level retry.
   - Timeout: 30s default (configurable via `deadline_ms`).

2. **`src/vendors/`** — per-vendor adapter modules
   - `claude.js` — Anthropic API adapter (`/v1/messages`).
   - `openai.js` — OpenAI API adapter (`/v1/chat/completions`).
   - `gemini.js` — Google Gemini API adapter (`/v1beta/models/...`).
   - `kimi.js` — Moonshot Kimi API adapter (`/v1/chat/completions`).
   - `xai.js` — xAI Grok API adapter (`/v1/chat/completions`).
   - Each adapter: `send(inputPackage) → outputPackage` (or throws vendor error).
   - Each adapter must respect the `deadline_ms` timeout.

3. **`src/config.js`** — API key management
   - Reads from environment variables: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `KIMI_API_KEY`, `XAI_API_KEY`.
   - No keys committed to the repository. `.gitignore` already excludes `.env` files.
   - Validates that at least one vendor key is present before mediation starts.

4. **Update `src/ai-conformance.js`**
   - Optionally run live vendors alongside fixtures.
   - When `LIVE_VENDOR` env var is set, include live calls in the conformance suite.
   - When unset, run only fixtures (backward compatible).

5. **Update `src/conformance-harness.js`**
   - Assert live vendor conformance when available.
   - Maintain deterministic fixture assertions when live vendors are unavailable.

### Success Criteria
- [ ] At least 2 live vendors produce accepted compliant submissions.
- [ ] At least 1 live vendor's untrusted behavior (hallucination, forged evidence, etc.) is caught by the validator with the correct rejection code.
- [ ] `detharness.js` stays green (determinism of the Runtime itself, not the AI).
- [ ] `validation-harness.js` Q1–Q5 show Jaccard ≥ 0.95 for live vendors (not 1.0 — tolerance for vendor variation is expected).
- [ ] `conformance-harness.js` passes for both fixtures and live vendors.
- [ ] No API keys committed to the repository.

### Dependencies
- API keys for at least 2 vendors.
- Network access to vendor APIs.

### Risk
- Vendor API rate limits may slow development.
- Vendor API schema changes may break the adapter.
- Vendor responses may not conform to the AI Output Package schema (the Runtime must handle this gracefully via `SCHEMA_INVALID` retry).

---

## 3. Milestone 3 — S9 Planning + S7 Truth Promotion + S2 Git-File Persistence

### Goal
The Runtime can plan changes from a frozen Execution Package, truth records can mature beyond `DIRECT_OBSERVATION`, and project state persists across reboots.

### Deliverables

1. **`src/planning.js`** — Planning Engine (E16)
   - Input: frozen Execution Package + target change.
   - Output: ordered plan of HYPOTHESIS-only proposals (no execution yet).
   - Each proposal: `id`, `type` (`CREATE` | `MODIFY` | `DELETE`), `target`, `rationale`, `dependencies`.
   - Gate: `G-PLAN-VALID` — plan must be a subgraph of the Execution Package impact closure.
   - Plan must not reference any node outside the impact closure.

2. **`src/engines.js`** — Truth promotion/invalidation
   - `promoteTruth(id, toClass)` — transitions: `Observed → Documented → Validated → Published`.
   - `invalidateTruth(id, reason)` — transitions: `Published → Challenged → Corrected | Rejected | Superseded`.
   - Gate: `G-TRUTH-VALID` — all `Published` truths must have ≥ 2 independent evidence sources.
   - Truth lifecycle is defined in `spec/schemas/truth.schema.json`.

3. **`src/persistence.js`** — Git-file persistence for S2
   - Each project gets a `<project>-runtime/` sibling git repository.
   - Stores: `model.json`, `impact.json`, `package.json`, `truth.json` (canonical, deterministic).
   - Commit hash becomes the Runtime snapshot ID (replaces SHA-256 of in-memory JSON).
   - `git tag` marks package versions.
   - Deterministic ordering: sorted keys, no timestamps, no volatile fields.

4. **`src/cli.js`** — New commands:
   - `plan <target>` — Generate plan from frozen package.
   - `promote <truthId>` — Promote truth record.
   - `persist` — Write model to git-file store.

5. **`src/gates.js`** — New gates:
   - `G-PLAN-VALID` — plan references only nodes in impact closure.
   - `G-TRUTH-VALID` — all Published truths have ≥ 2 evidence sources.

### Success Criteria
- [ ] `node src/cli.js plan column:users.status` produces a valid plan constrained to the package's `allowed_scope`.
- [ ] Truth promotion produces a git diff in the `<project>-runtime` repo.
- [ ] `detharness.js` still passes (determinism preserved).
- [ ] Gate `G-PLAN-VALID` blocks plans that reference nodes outside the impact closure.
- [ ] Gate `G-TRUTH-VALID` blocks when a Published truth has < 2 evidence sources.
- [ ] Persistence round-trip: write → read → `canonical()` matches original.

### Dependencies
- Milestone 2 must be complete (mediation loop exists, but planning does not require live vendors).
- Git must be available in the environment.

---

## 4. Milestone 4 — S14 Execution + Escape Hatch + S15 Handoff

### Goal
The Runtime can execute plans, generate code modifications, and hand off to human review with full evidence.

### Deliverables

1. **`src/execution.js`** — Execution Engine
   - Input: approved plan + frozen Execution Package.
   - Output: file modifications (git patches or direct file writes).
   - Each edit is a `HYPOTHESIS` proposal until the human accepts it.
   - Modifies only files in `allowed_scope`.
   - Preserves deterministic ordering and canonical formatting.

2. **`src/escape-hatch.js`** — Contradiction detection
   - Re-runs adapters on modified source post-edit.
   - Compares new model against expected model from plan.
   - Mismatch → `CONTRADICTION` finding + automatic rollback.
   - Rollback restores files from git stash or backup.

3. **`src/handoff.js`** — Human review handoff
   - Generates PR description from plan + impact closure + truth records.
   - Includes: `allowed_scope`, `coverage`, `blindspots`, `gating_truth`, `acceptance_criteria`.
   - Human approves/rejects each proposed edit individually.
   - Rejected edits are reverted; accepted edits are committed.

4. **`src/cli.js`** — New commands:
   - `execute <planId>` — Generate patches.
   - `review <planId>` — Generate handoff report.
   - `submit <planId>` — Create PR with handoff metadata.

5. **`src/gates.js`** — New gates:
   - `G-EXECUTION-VALID` — all edits are within `allowed_scope`.
   - `G-CONTRADICTION-FREE` — escape hatch detects no contradiction.

### Success Criteria
- [ ] A plan can be executed and produce a git diff that only touches files in `allowed_scope`.
- [ ] Escape hatch detects a contradiction (e.g., plan says "add field" but adapter finds no new field after edit).
- [ ] Handoff report includes all required evidence for human review.
- [ ] `detharness.js` still passes (determinism of the Runtime itself is invariant).
- [ ] Gate `G-EXECUTION-VALID` blocks edits outside `allowed_scope`.
- [ ] Gate `G-CONTRADICTION-FREE` blocks when escape hatch detects a mismatch.

### Dependencies
- Milestone 3 must be complete (planning engine exists).
- Git must be available for patch generation and rollback.
- Human review interface (GitHub PRs, or manual review process).

### Design Note
The absence of S14 in Milestone 1 was intentional. Code generation must not exist until the gates that constrain it (coverage, truth, plan validity) are proven. This milestone makes execution reachable only after those gates exist.

---

## 5. Milestone 5 — Multi-Vendor Determinism + Production Hardening

### Goal
Prove the entire pipeline (reconstruction → validation → planning → execution) produces identical results across different AI vendors when given the same Input Package, and harden the repository for production use.

### Deliverables

1. **Cross-vendor `detharness.js`**
   - Run the full pipeline with 3+ live vendors.
   - Prove output convergence (Jaccard ≥ 0.95).
   - Report per-vendor divergence if any.

2. **Performance benchmarks**
   - Adapter parsing speed (files/sec).
   - Impact closure speed (nodes + edges).
   - Package freeze speed (model size vs. time).
   - Benchmarks run in CI on every PR.

3. **Security audit**
   - No secrets in repository (scan for API keys, tokens, passwords).
   - No `eval()` or `Function()` usage.
   - No network calls in core engines (S1–S12).
   - Network calls only in `src/vendors/` (Milestone 2) and `src/mediation.js`.
   - Input validation on all external-facing functions.

4. **Documentation**
   - `ARCHITECTURE.md` — Full system architecture (if not already covered by existing docs).
   - `CHANGELOG.md` — Per-milestone changelog.
   - Update `README.md` with production usage instructions.

5. **CI/CD pipeline**
   - GitHub Actions workflow running all 3 harnesses on every PR.
   - GitHub Actions workflow running security audit on every PR.
   - GitHub Actions workflow running performance benchmarks on every PR.
   - All checks must pass before merge.

### Success Criteria
- [ ] Cross-vendor Jaccard ≥ 0.95 for full pipeline output.
- [ ] All 3 harnesses run in CI < 30 seconds.
- [ ] No security warnings (trivially true — zero dependencies).
- [ ] Performance benchmarks establish baseline for future regression detection.
- [ ] CI blocks PRs with failing harnesses.

---

## 6. Post-Milestone 5

After Milestone 5, the Engineering Runtime is considered **production-ready**. Future work may include:

- Additional adapter types (e.g., GraphQL, gRPC, microservices).
- Additional ontology profiles (e.g., event-driven, serverless, embedded).
- Additional vendor support (e.g., local LLMs, self-hosted models).
- Performance optimizations (e.g., incremental reconstruction, caching).
- Integration with IDE plugins (e.g., VS Code extension).

These are outside the current roadmap and require new ADRs.

---

*This roadmap was established on 2026-06-28. Any milestone modification requires an ADR.*

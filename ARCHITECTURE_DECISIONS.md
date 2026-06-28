# ARCHITECTURE_DECISIONS.md — ADR Record

**Version:** 0.1.0  
**Branch:** `master`  
**Last updated:** 2026-06-28

---

## ADR-001: Repository Recovery from Git Bundle (Preservation-First)

**Date:** 2026-06-28  
**Status:** Accepted  
**Context:** The repository was exported as a git bundle (`engineering-runtime.bundle`) and a worktree tarball (`engineering-runtime-worktree.tar.gz`) because the producing session had no working push path to a remote.

**Decision:**
1. Verify SHA-256 hashes of both artifacts before any recovery action.
2. Verify `git bundle verify` before cloning.
3. Clone from the bundle (not the tarball) to preserve full commit history.
4. Cross-verify the cloned repo against the tarball for byte-equivalence.
5. Push the recovered `master` branch to the remote without force.

**Consequences:**
- All 3 commits (`c4cb82c`, `ccf90d3`, `bdec482`) are preserved with exact hashes.
- No history was rewritten, squashed, or recreated.
- The tarball serves as a secondary verification source, not the primary history source.

**Evidence:** `SHA256SUMS.txt`, `RESTORE.md`, `FINAL_REPOSITORY_CERTIFICATION.md`.

---

## ADR-002: Default Branch is `master` (Not `main`)

**Date:** 2026-06-28  
**Status:** Accepted  
**Context:** The remote repository was auto-initialized by GitHub with a placeholder `main` branch containing a single file (`...`). The recovered history was on `master`.

**Decision:**
1. Delete the placeholder `main` branch (it contained no unique work — only a renamed README placeholder).
2. Make `master` the default branch via GitHub API.
3. Update local tracking refs to reflect the change.

**Consequences:**
- The repository has one canonical branch: `master`.
- Future clones default to `master`.
- No risk of confusion between `main` and `master`.

**Evidence:** GitHub API response confirming `default_branch: master`; local `git branch -a` showing only `master`.

---

## ADR-003: Zero npm Dependencies (Invariant I-6)

**Date:** 2026-06-28 (original decision, documented retroactively)  
**Status:** Accepted  
**Context:** The Engineering Runtime must be deterministic, reproducible, and free from supply-chain risk. Adding dependencies introduces version drift, security vulnerabilities, and non-deterministic behavior from third-party code.

**Decision:**
1. The repository shall have zero npm dependencies.
2. Only Node.js built-in modules (`fs`, `path`, `crypto`) are used.
3. Any future dependency requires an explicit ADR with a compelling justification.

**Consequences:**
- No `npm install` step is required.
- No `node_modules/` directory exists.
- No `package-lock.json` or `yarn.lock` exists.
- Supply-chain attacks are impossible (no external packages to compromise).
- The repository is self-contained and portable.

**Evidence:** `package.json` has no `dependencies` or `devDependencies` field.

---

## ADR-004: Canonical JSON Serialization for Determinism (Invariant I-2)

**Date:** 2026-06-28 (original decision, documented retroactively)  
**Status:** Accepted  
**Context:** To prove that identical inputs produce identical outputs, the Runtime must serialize objects in a way that is independent of insertion order, platform, or implementation details.

**Decision:**
1. All serialization uses `canonical()` from `src/util.js`.
2. Object keys are sorted alphabetically.
3. Array elements are serialized in their natural order (already deterministic due to sorted inputs).
4. No timestamps, no random values, no volatile fields are included in serialized output.
5. SHA-256 is computed over the canonical string, not `JSON.stringify()`.

**Consequences:**
- `detharness.js` proves byte-identical output across runs.
- Cross-vendor convergence is measurable because the canonical form removes ordering discretion.
- The canonical form is human-readable but not pretty-printed (no newlines, no indentation).

**Evidence:** `src/util.js` (lines 6–13); `src/detharness.js` passing with identical snapshot hashes.

---

## ADR-005: In-Memory Store with Explicit Freeze (S2)

**Date:** 2026-06-28 (original decision, documented retroactively)  
**Status:** Accepted  
**Context:** The Store must be deterministic, mutable during reconstruction, and immutable before packaging. Disk persistence is deferred to Milestone 3.

**Decision:**
1. Store is in-memory (`Map` objects for nodes, edges, truth).
2. Store has an explicit `freeze()` method that sets `_frozen = true`.
3. Any mutation after `freeze()` throws `E_IMMUTABLE`.
4. All retrieval methods (`allNodes()`, `allEdges()`, `allTruth()`) return deterministically sorted arrays.
5. Disk persistence (git-file) is a future Milestone 3 deliverable, not a current requirement.

**Consequences:**
- No state survives process exit.
- The model must be reconstructed from scratch on every Runtime invocation.
- This is acceptable for Milestone 1 because reconstruction is fast and deterministic.
- Milestone 3 will add `src/persistence.js` to address this.

**Evidence:** `src/store.js` (lines 7–29); `src/orchestrator.js` line 38 (`store.freeze()`).

---

## ADR-006: Regex-Based Adapters (S3)

**Date:** 2026-06-28 (original decision, documented retroactively)  
**Status:** Accepted  
**Context:** The Runtime must parse project source files without depending on language-specific AST parsers (which would require npm dependencies). The fixtures are NestJS/TypeORM-style, but the adapter architecture is language-agnostic.

**Decision:**
1. Adapters use regex-based parsing over raw text.
2. Each adapter returns a list of `observations` (nodes and relations) with `source_ref`.
3. Parse failures are marked `UNSUPPORTED`, not fabricated.
4. Adapters are registered in a `REGISTRY` array and matched by file extension.
5. New adapters can be added to `REGISTRY` without modifying existing code.

**Consequences:**
- Regex parsing is fragile for complex syntax but sufficient for the fixture set.
- Parse failures are safe: they mark the region as unsupported rather than guessing.
- The adapter architecture is extensible but not as robust as AST-based parsing.
- Future adapters may use AST parsers if an ADR justifies adding a dependency.

**Evidence:** `src/adapters.js` (lines 101–127); parse failure handling on lines 121–123.

---

## ADR-007: Warm Read Ontology (S4) — Cold Inference Deferred

**Date:** 2026-06-28 (original decision, documented retroactively)  
**Status:** Accepted  
**Context:** The Runtime needs an ontology to classify nodes and edges. A fully inferred ontology (cold inference from raw source) is complex and requires reasoning engines not yet built.

**Decision:**
1. For Milestone 1, the ontology is a committed JSON file (`profiles/crud-web.json`).
2. The ontology is loaded by `src/ontology.js` and parameterizes all downstream engines.
3. Cold inference (inferring the ontology from project structure without a committed profile) is deferred to Milestone 3.
4. Multiple profiles can coexist (e.g., `profiles/crud-web.json`, `profiles/event-driven.json`).

**Consequences:**
- The Runtime is parameterized, not hardcoded.
- New project types require a new profile, not new code.
- Cold inference remains a TODO and will be addressed in Milestone 3.

**Evidence:** `src/ontology.js` (lines 7–12); `profiles/crud-web.json`.

---

## ADR-008: Jaccard-Based Convergence for Runtime Validation (S-VAL)

**Date:** 2026-06-28 (original decision, documented retroactively)  
**Status:** Accepted  
**Context:** The Runtime must measure whether independently-produced reconstructions converge on the same model. Ordering and phrasing must not affect the verdict.

**Decision:**
1. Convergence is measured as Jaccard similarity (intersection / union) on sets of ids.
2. Per-layer convergence: topology (nodes), knowledge graph (nodes + edges), truth (truth keys), impact graph (closure nodes), package (allowed_scope + gating_truth).
3. Unsupported nodes/edges are detected by id + source_ref matching, not by natural-language comparison.
4. Skipped analysis is detected by recomputing coverage from the submitted model and comparing to the claimed coverage.

**Consequences:**
- Vendor-specific ordering does not affect the verdict (proven by `faithful-reorder` worker).
- Independent re-derivation converges because the contract (deterministic id scheme + ontology) removes discretion (proven by `faithful-independent` worker).
- The validator catches fabricated and skipped analysis automatically (proven by `guessing` and `lazy` workers).

**Evidence:** `src/validator.js` (lines 11–17, 68–96); `src/validation.js` (lines 52–60).

---

## ADR-009: AI Input/Output Package Wire Protocol (S-AICONF)

**Date:** 2026-06-28 (original decision, documented retroactively)  
**Status:** Accepted  
**Context:** The Runtime must communicate with AI vendors through a fixed, verifiable protocol. Natural-language explanations cannot be trusted as evidence.

**Decision:**
1. The Runtime sends an **AI Input Package** (`buildInputPackage()`) containing: mission, target, allowed_reads, ontology, node_id_scheme, evidence_requirement, rejection_reasons taxonomy.
2. The AI returns an **AI Output Package** containing: claims (nodes, edges, truth), impact_closure, coverage_self_report, proposed_edits.
3. Every claim must cite a `source_ref` (file in `allowed_reads`) and an `evidence_quote` (literal substring of that file).
4. The Runtime validates the Output Package structurally and against project sources — never by reading natural-language explanations.
5. Rejection reasons are fixed to a taxonomy of 12 codes (`SCHEMA_INVALID`, `CONTRACT_VIOLATION`, etc.).

**Consequences:**
- Any compliant AI, regardless of vendor, communicates through the same wire protocol.
- The Runtime validates artifacts, not models. The AI's internal reasoning is irrelevant.
- Every rejection is mechanical and reproducible.
- The protocol is versioned (`PROTOCOL_VERSION = '1.0'`).

**Evidence:** `src/protocol.js`; `src/conformance.js`; `spec/schemas/ai-input-package.schema.json`; `spec/schemas/ai-output-package.schema.json`.

---

## ADR-010: Placeholder `main` Branch Deletion

**Date:** 2026-06-28  
**Status:** Accepted  
**Context:** The remote repository had a `main` branch created by GitHub auto-initialization. The recovered history was on `master`. The `main` branch contained a single commit (`dd606c4`) that renamed a placeholder README to `...`.

**Decision:**
1. The `main` branch contained no engineering work, no unique commits, and no files that are not superseded by `master`.
2. Deleting `main` is safe and desirable to establish a single canonical branch.
3. Deletion was performed via GitHub API after confirming `main` had no unique content.

**Consequences:**
- Only `master` exists as a remote branch.
- Future clones default to `master`.
- No risk of contributors accidentally working on `main`.

**Evidence:** GitHub API `DELETE` response (empty body = success); `git ls-remote origin` after deletion showing only `master`.

---

## ADR-011: Line-Ending Differences Are Environmental Artifacts (Not Content Issues)

**Date:** 2026-06-28  
**Status:** Accepted  
**Context:** During cross-verification (Phase 3), `diff -r` showed differences in every file between the recovered repo and the tarball. Analysis revealed these were exclusively Windows CRLF (`\r\n`) vs Unix LF (`\n`) line endings.

**Decision:**
1. The difference is caused by `core.autocrlf=true` on the local git checkout.
2. The true source of truth is the git-indexed blobs, not the working tree.
3. A clone with `core.autocrlf=false` proved byte-equivalence between the bundle and the tarball.
4. This finding is documented as a known environmental issue, not a content discrepancy.

**Consequences:**
- Future cross-verification on Windows must use `core.autocrlf=false` or compare via git-indexed blobs.
- The repository content is identical; only the working tree representation differs.

**Evidence:** `BOOTSTRAP.md` §5.6; `HANDOFF.md` §5.6.

---

## ADR-012: Missing `kernel.lock.schema.json` Is a Documented Gap, Not a Bug

**Date:** 2026-06-28  
**Status:** Accepted  
**Context:** `kernel.lock` references `spec/schemas/kernel.lock.schema.json`, but the file does not exist in the repository.

**Decision:**
1. The missing schema is not a bug because the Kernel lock validation currently only checks path existence (not schema conformance).
2. The schema will be created when S1 full-hash verification is implemented (Milestone 2 or 3).
3. Until then, the gap is documented in `CURRENT_STATE.md` and `MACHINE_CONTEXT.md`.

**Consequences:**
- No runtime error occurs from the missing schema.
- The gap is tracked and will be closed when the corresponding feature is implemented.

**Evidence:** `kernel.lock` line 2 (`$schema`); `CURRENT_STATE.md` §4.

---

*New ADRs must be appended to this file, never inserted in the middle. Each ADR must have a unique sequential number, date, status, context, decision, consequences, and evidence.*

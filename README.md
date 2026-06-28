# engineering-runtime

Deterministic **Engineering Operating System** for AI. It sits on top of the frozen
[Engineering Kernel](../radius1-kernel) (consumed read-only, pinned in `kernel.lock`)
and reconstructs the complete engineering model of a project **before** any planning
or code generation is allowed. The AI never touches the project directly — it acts
only through the Runtime.

This repository is the *separate consumer repository* required by
`KERNEL_SCOPE_DEFINITION.md` §9.5 (Kernel directories may not hold product content).
Nothing here modifies the Kernel.

## Milestone 1 (this commit): deterministic reconstruction + frozen Execution Package

> The first milestone is NOT writing engines. It is producing an executable Runtime
> capable of reconstructing the exact engineering model of a project from its
> repository and producing an **identical Execution Package every time from identical
> inputs**.

Met. Zero dependencies; Node ≥ 20.

```
node src/cli.js verify                       # check the Kernel pin
node src/cli.js reconstruct                  # build the model; coverage + blocking gate
node src/cli.js impact column:users.status   # deterministic impact closure (a lower bound)
node src/cli.js package column:users.status  # freeze the Execution Package
node src/cli.js validate column:users.status # Runtime Validation report (see Milestone 1.5)
node src/cli.js conformance column:users.status # AI Conformance report (see Milestone 1.6)
node src/detharness.js                        # PROVE byte-identical output across runs
node src/validation-harness.js                # PROVE the 10 Runtime Validation properties
node src/conformance-harness.js               # PROVE the AI Conformance Framework rejects untrusted AI output
```

`detharness` prints `DETERMINISM PROVEN` and an identical package snapshot hash on
every run — the executable proof of cross-session/cross-model determinism (invariant I-2)
**for the deterministic engines themselves.** See Milestone 1.5 below for why that claim
is weaker than "vendor-independent," and what was built to close the gap.

## Milestone 1.5: Runtime Validation (measured, not asserted)

Milestone 1's `detharness` proves the JS engines (S1–S12) are deterministic — true, but
close to trivial, since pure functions are deterministic by construction. It does **not**
prove the actual product claim: that different AI vendors, reconstructing the same project
cold, converge on the same engineering model. The Runtime had no AI-in-the-loop component
to test that claim against, and S13 Mediation (the JSON-RPC AI loop) was explicitly paused
pending this milestone.

`src/validator.js` + `src/validation.js` implement a vendor-agnostic **submission protocol
and validator**: any reconstruction (model + impact + package), regardless of who produced
it, is checked against the ground truth by (a) automatic rejection of fabricated or
internally-inconsistent claims, and (b) measured set-based convergence (Jaccard) per layer
— topology, knowledge graph, truth, impact graph, package constraints — independent of
ordering or phrasing.

**Honesty caveat**: this environment has no configured access to call Claude, GPT, Gemini,
Kimi, or xAI APIs directly, so "different AI models" is not yet exercised with live
cross-vendor calls. Instead `src/workers/` provides five deterministic **conformance
fixtures** standing in for vendor behavior classes the validator must handle correctly:

| Worker | Simulates | Expected verdict |
|---|---|---|
| `faithful-reorder.js` | same analysis, different emission order | accepted, convergence = 1.0 |
| `faithful-independent.js` | a *different process* re-deriving the model from scratch via the same adapter/ontology contract (not copied) | accepted, convergence = 1.0 |
| `guessing.js` | a model that hallucinates a node/edge with no source observation | **rejected** — `UNSUPPORTED_NODE`/`UNSUPPORTED_EDGE` |
| `lazy.js` | a model that skips reading part of the project but reports the old coverage anyway | **rejected** — `SKIPPED_ANALYSIS` (claimed vs. recomputed coverage mismatch) |
| `resume-only.js` | a second AI given ONLY the frozen model artifact, no source, no conversation | accepted, impact closure jaccard = 1.0 |

`node src/validation-harness.js` answers all 10 of the user's questions with measured
evidence (Jaccard scores, violation lists, gate state) and exits non-zero if any expectation
is violated. Current run: **all 10 PASS** — see Revision History for the precise finding,
which is more specific than "yes": convergence holds **because the contract (deterministic
id derivation + ontology classification + fixed schema) removes the discretion that would
otherwise let independent reasoning diverge**, not because reconstruction was asserted
identical. The validator's job — and the thing actually being proved — is that it catches
guessed and skipped analysis automatically, by structure, not by trusting the submitter.

The real cross-vendor test (live API calls from multiple vendors submitting through this
same protocol) is the integration point for S13 Mediation, still deferred. This milestone's
contribution is that the **validator and protocol it must satisfy already exist and are
proven against the known failure modes**, so S13 has something objective to be checked
against on day one rather than being trusted on its own say-so.

## Milestone 1.6: AI Conformance Framework — the Runtime never trusts the AI

Milestone 1.5 validated the Runtime's *internal model store* representation. It still
left the AI free to express its claims however it wanted before the Runtime translated
them — that translation step itself was never specified or enforced. This milestone fixes
that: it defines the literal wire contract between the Runtime and any AI worker, and
proves the Runtime rejects untrustworthy submissions by structure alone, never by reading
or trusting natural-language explanations.

- **AI Input Package** (`src/protocol.js: buildInputPackage`, schema
  `spec/schemas/ai-input-package.schema.json`) — exactly what is sent to the model: the
  mission/target, the deterministic `allowed_reads` file list, the ontology, the fixed
  node-id derivation scheme, the evidence requirement, and the rejection-reason taxonomy
  itself. Built only from the Kernel-pinned ontology and the project's own file listing —
  never from conversation history.
- **AI Output Package** (schema `spec/schemas/ai-output-package.schema.json`) — exactly
  what the model must return: `claims.{nodes,edges,truth}`, each with a `source_ref` and a
  literal `evidence_quote`; an `impact_closure`; a `coverage_self_report`; optional
  `proposed_edits`. No free-text field is ever read for verification purposes.
- **`src/conformance.js`** — the validator. Schema check first (structurally invalid output
  is rejected before any semantic check runs); then contract conformance (target/mission/
  stage/protocol_version must be echoed exactly — "ignoring instructions" is caught here);
  then mandatory evidence (every `source_ref` must be in `allowed_reads`, and the
  `evidence_quote` must be a literal substring **actually present in that file on disk** —
  citing a real file is not enough, the quote itself is independently re-verified); then
  impact verification (the claimed closure must be a superset of the Runtime's own
  deterministic floor — under-claiming impact is rejected, not just over-claiming); then
  scope verification (`proposed_edits` must stay inside the Execution Package's
  `allowed_scope`); then coverage-claim verification (self-reported coverage must match
  what the submitted claims actually support).
- **Fixed rejection taxonomy** (`src/protocol.js: REJECTION_REASONS`) — `SCHEMA_INVALID`,
  `CONTRACT_VIOLATION`, `READ_OUTSIDE_ALLOWED`, `MISSING_EVIDENCE`,
  `EVIDENCE_NOT_VERIFIABLE`, `EVIDENCE_NAME_MISMATCH`, `UNSUPPORTED_NODE/EDGE`,
  `SCOPE_VIOLATION`, `IMPACT_UNDERCLAIM`, `COVERAGE_MISCLAIM`, `TRUTH_CLASS_INVALID`. Every
  verdict in the framework reduces to one or more of these codes — never to "the model
  seemed unsure" or any other natural-language judgment.

`src/ai-workers/` provides seven workers exercising this protocol directly (not the
internal store shape Milestone 1.5 used): `compliant` (must be accepted) and six untrusted
behaviors named explicitly in the directive — `hallucinator` (invents an API),
`evidence-forger` (cites a real file but a quote that was never written there),
`lazy-coverage-liar` (incomplete reconstruction, misreported coverage),
`scope-violator` (proposes an edit outside the package's allowed scope),
`instruction-ignorer` (answers about a different target than requested), and
`impact-underclaimer` (omits required downstream nodes from its impact closure).
`node src/conformance-harness.js` runs all seven through the real protocol and asserts the
Runtime's verdict and rejection code for each. Current run: **all 7 PASS** — the compliant
worker is accepted with zero rejections, and each untrusted behavior is rejected with
exactly the reason code that behavior should trigger.

Same honesty caveat as Milestone 1.5: these seven are deterministic conformance fixtures,
not live calls to Claude/GPT/Gemini/Kimi/xAI — this environment has no multi-vendor API
access configured. What's proven is that the wire protocol and validator are complete
enough to catch every behavior named in the directive (skip analysis, hallucinate, ignore
instructions, fabricate facts, incomplete reconstruction, violate the execution package,
modify files outside scope, invent APIs, ignore contracts) by artifact inspection alone.
Any compliant AI — regardless of vendor — communicates through exactly this Input/Output
Package pair; the Runtime validates the artifacts it returns, never the model itself. This
is the protocol S13 Mediation must implement against once live multi-vendor calls exist.

## What the demo shows (and deliberately does not hide)

On the bundled `fixtures/sample-project`, changing `users.status` yields the closure
`Column → Field → Entity → Repository → Service → Controller → Endpoint → OpenAPI`.
Coverage is reported as **0.444 with named blind spots** (DTO, Validation, Permission,
Frontend, Tests, …) and the reconstruction gate **blocks** with an `INVESTIGATION`
remediation. This is invariant **I-3 on purpose**: the Runtime *measures* completeness
and refuses to assert it — false completeness is worse than a known gap.

## Code ↔ specification map (`05-EVIDENCE/ENGINEERING_RUNTIME_IMPLEMENTATION_SPEC.md`)

| Spec subsystem | Module | Status |
|---|---|---|
| S1 Kernel Bridge | `src/kernel.js` | implemented (pin verify; full-hash verify = TODO) |
| S2 Store / Persistence | `src/store.js`, `src/util.js` | implemented (in-memory + canonical; git-file persistence = TODO) |
| S3 Adapter Framework | `src/adapters.js` | implemented (sql/entity/repo/service/controller/openapi) |
| S4 Ontology (E00) | `src/ontology.js`, `profiles/crud-web.json` | warm read implemented; cold inference = TODO |
| S5 Reconstruction (E01/E03/E11) | `src/engines.js` | deterministic engines implemented; reasoning engines = TODO |
| S6 Graph + Impact (E12) | `src/graph.js` | implemented |
| S7 Truth (E15) | `src/engines.js` (DIRECT_OBSERVATION) | observation-level implemented; promotion/invalidation = TODO |
| S8 Coverage (E14) | `src/coverage.js` | implemented |
| S9 Planning (E16) | — | TODO (milestone 3) |
| S10 Packaging (E17) | `src/packaging.js` | implemented (freeze + snapshot) |
| S11 Orchestrator | `src/orchestrator.js` | reconstruction pipeline + gates implemented |
| S12 Gates | `src/gates.js` | G-COVERAGE / G-RECONSTRUCTION-COMPLETE implemented |
| S-VAL Runtime Validation | `src/validator.js`, `src/validation.js`, `src/workers/` | implemented (internal-model convergence; live multi-vendor calls = TODO) |
| S-AICONF AI Conformance Framework | `src/protocol.js`, `src/conformance.js`, `src/ai-conformance.js`, `src/ai-workers/` | implemented (wire protocol + validator + 7 conformance fixtures; live multi-vendor calls = TODO) |
| S13 Mediation (AI driver/sandbox) | — | TODO (milestone 2, paused until S-AICONF validated against live vendors) |
| S14 Execution + escape hatch | — | TODO (milestone 4) — intentionally absent: code-gen must not exist yet |
| S15 Handoff | — | TODO |

The absence of S14 is the point: at milestone 1 the Runtime *cannot* generate code,
only reconstruct and freeze. Execution becomes reachable only after later milestones
add the gates that must pass first.

## Next milestones

2. S13 Mediation + the JSON-RPC AI loop, wired to submit through the Milestone 1.5
   validation protocol (scope sandbox, HYPOTHESIS-only proposals) — including live calls
   to multiple vendor APIs once available, to replace the simulated `src/workers/` fixtures
   with real cross-vendor submissions.
3. S9 Planning + S7 truth promotion/invalidation + S2 git-file persistence (`<project>-runtime`).
4. S14 Execution-from-package + escape hatch + S15 handoff + multi-vendor determinism.

Each milestone ships only when `detharness` stays green.

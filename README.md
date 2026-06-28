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
node src/detharness.js                        # PROVE byte-identical output across runs
```

`detharness` prints `DETERMINISM PROVEN` and an identical package snapshot hash on
every run — the executable proof of cross-session/cross-model determinism (invariant I-2).

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
| S13 Mediation (AI driver/sandbox) | — | TODO (milestone 2) |
| S14 Execution + escape hatch | — | TODO (milestone 4) — intentionally absent: code-gen must not exist yet |
| S15 Handoff | — | TODO |

The absence of S14 is the point: at milestone 1 the Runtime *cannot* generate code,
only reconstruct and freeze. Execution becomes reachable only after later milestones
add the gates that must pass first.

## Next milestones

2. S13 Mediation + the JSON-RPC AI loop (scope sandbox, HYPOTHESIS-only proposals).
3. S9 Planning + S7 truth promotion/invalidation + S2 git-file persistence (`<project>-runtime`).
4. S14 Execution-from-package + escape hatch + S15 handoff + multi-vendor determinism.

Each milestone ships only when `detharness` stays green.

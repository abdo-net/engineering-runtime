# REPOSITORY_CHARTER.md — Purpose, Boundaries, and Relationships

**Version:** 0.1.0  
**Branch:** `master`  
**Last updated:** 2026-06-28

---

## 1. Purpose

`abdo-net/engineering-runtime` is the **Deterministic Engineering Operating System** for AI. It sits on top of the frozen Engineering Kernel (`abdo-net/radius1-kernel`) and reconstructs the complete engineering model of a project **before** any planning or code generation is allowed.

The AI never touches the project directly. It acts only through the Runtime.

### 1.1 What This Means in Practice

- The Runtime reads project source files through deterministic adapters.
- The Runtime builds a typed engineering model (nodes, edges, truth) from those sources.
- The Runtime measures coverage and reports blind spots honestly.
- The Runtime validates any AI submission (from any vendor) against project artifacts, not against trust.
- The Runtime freezes an Execution Package that constrains what the AI may later do.
- The Runtime does not generate code until Milestone 4. Until then, its job is to **measure and constrain**.

---

## 2. Boundaries

### 2.1 What This Repository Is

| Aspect | Description |
|---|---|
| **Product repository** | Contains the Runtime itself — its engines, validators, gates, and orchestration |
| **Consumer repository** | Consumes the Engineering Kernel read-only; never modifies it |
| **Deterministic system** | Produces identical output from identical inputs, provably |
| **Zero-dependency** | No `npm install` required; runs on Node ≥ 20 with no external packages |
| **Schema-first** | All external-facing structures have JSON Schema definitions |
| **Protocol-driven** | All AI interaction happens through a fixed Input/Output Package wire protocol |

### 2.2 What This Repository Is NOT

| Aspect | Description |
|---|---|
| **NOT the Kernel** | The Kernel lives in `abdo-net/radius1-kernel`. This repo never modifies it. |
| **NOT a project generator** | It does not generate code until Milestone 4. Reconstruction and freezing come first. |
| **NOT a chat interface** | The AI does not "talk" to the Runtime. It submits structured packages. The Runtime validates them. |
| **NOT a build tool** | It does not compile, bundle, or deploy. It produces engineering models and execution packages. |
| **NOT a framework** | It is not a library to be imported into other projects. It is a standalone operating system that runs against a project. |
| **NOT opinionated about language** | The adapters currently parse NestJS/TypeORM/SQL fixtures, but the architecture supports any adapter. The Runtime itself is language-agnostic. |

### 2.3 What Lives Outside This Repository

| Entity | Location | Relationship |
|---|---|---|
| Engineering Kernel | `abdo-net/radius1-kernel` | Consumed read-only. Pinned by `kernel.lock`. |
| Project under analysis | Any directory on disk | The Runtime's `projectDir` parameter. Not part of this repo. |
| `<project>-runtime` state repo | Sibling git repo (future) | Will store frozen models, impact closures, and execution packages per-project. Not yet implemented (Milestone 3). |
| AI vendor APIs | External (Claude, GPT, Gemini, Kimi, xAI) | Called via S13 Mediation (Milestone 2). Not yet implemented. |
| Human reviewers | External | Receive handoff reports from S15 Handoff (Milestone 4). Not yet implemented. |

---

## 3. Responsibilities

### 3.1 The Runtime's Responsibilities

1. **Reconstruct** the engineering model from project sources deterministically.
2. **Measure** coverage and report blind spots honestly.
3. **Gate** reconstruction before planning or execution.
4. **Validate** any external AI submission against project artifacts, not trust.
5. **Freeze** the Execution Package that constrains all subsequent AI activity.
6. **Never** let the AI modify the project outside the allowed scope.

### 3.2 This Repository's Responsibilities

1. Implement the Runtime subsystems (S1–S15).
2. Maintain the harnesses that prove correctness.
3. Preserve the three invariants (I-1 through I-8) in `MACHINE_CONTEXT.md`.
4. Document every architectural decision in `ARCHITECTURE_DECISIONS.md`.
5. Ship each milestone only when `detharness.js` stays green.

### 3.3 What This Repository Does NOT Do

1. **Does NOT** modify the Engineering Kernel. Ever.
2. **Does NOT** generate code until Milestone 4.
3. **Does NOT** store credentials or API keys in the repository.
4. **Does NOT** add npm dependencies without an Architecture Decision Record.
5. **Does NOT** rewrite git history.

---

## 4. Relationship with the Engineering Kernel

### 4.1 Kernel-Consumer Contract

The Runtime is a **consumer** of the Engineering Kernel, as defined by `KERNEL_SCOPE_DEFINITION.md` §9.5:

> Kernel directories may not hold product content. Consumer repositories must be separate.

### 4.2 How the Kernel is Consumed

The Kernel is consumed through `kernel.lock`:

```json
{
  "kernel_repo": "abdo-net/radius1-kernel",
  "kernel_path": "../radius1-kernel",
  "kernel_commit": "96042489b39e9a589280483054349ac2d7da00bc",
  "kernel_version": "1.x",
  "charter_id": "engineering-runtime-consumer"
}
```

- The Runtime reads the Kernel's ontology, schemas, and entity definitions from the pinned commit.
- The Runtime maps its own objects to Kernel RMM entities as read-only extensions (§9.7).
- The Runtime **never** writes to the Kernel directory.
- The Runtime does not depend on the Kernel being present for its own harnesses (it works with the bundled fixtures), but the `verify` command will report `verified: false` if the Kernel is absent.

### 4.3 Kernel Entity Mapping

```javascript
// From src/kernel.js
entityMap: {
  node: 'TOPOLOGY/ASSEMBLY',
  edge: 'TRACEABILITY_LINK',
  truth: 'FINDING',
  decision: 'DECISION',
  plan: 'PLAN',
  package: 'SNAPSHOT',
  evidence: 'EVIDENCE'
}
```

---

## 5. Relationship with Future Project-Runtime Repositories

In Milestone 3, each project under analysis will get a `<project>-runtime` sibling git repository. This repository will store:

- The frozen engineering model (`model.json`)
- The impact closure for each change (`impact.json`)
- The Execution Package for each change (`package.json`)
- The truth records with their lifecycle states (`truth.json`)
- Git tags marking package versions

The `engineering-runtime` repository (this one) contains the **engine** that produces those artifacts. The `<project>-runtime` repositories contain the **artifacts** produced by the engine. This separation is intentional: the engine is versioned and tested independently; the artifacts are project-specific and durable.

---

## 6. Governance

### 6.1 Who Can Modify

Any AI contributor (Claude, Kimi, GPT, Gemini, xAI, etc.) may modify this repository **if and only if** they follow:

1. `BOOTSTRAP.md` (session start)
2. `DEVELOPMENT_PROTOCOL.md` (before modifying code)
3. `CONTRIBUTING.md` (evidence and validation requirements)

### 6.2 Who Cannot Modify

No one may modify this repository without:
- Running all three harnesses before and after changes.
- Documenting the change in `ARCHITECTURE_DECISIONS.md` if it is architectural.
- Updating `CURRENT_STATE.md` if it changes implementation status.
- Updating `MACHINE_CONTEXT.md` if it changes version or milestone state.

### 6.3 Change Review

There is no pull request review process defined yet (Milestone 5). Until then, every AI contributor must self-certify via the harnesses and document their session in `docs/sessions/`.

---

*This charter was established on 2026-06-28. Any modification requires an ADR.*

# Milestone 3 Plan: S5 Reasoning Engines

**Date:** 2026-06-28  
**Milestone:** 3 — S5 Reasoning Engines  
**Objective:** Extract semantics, behavior, business rules, DTO transformations, permissions, and error handling patterns from project source code using deterministic static analysis. No AI calls. No AST parser. Regex-based pattern matching only.

---

## 1. Background

The Runtime currently parses structure via `src/adapters.js` (tables, entities, repositories, services, controllers, endpoints) and connects them via `src/engines.js` (structural nodes + traceability edges). It knows *what* exists but not *what it means* or *what it does*.

Reasoning engines bridge this gap by deriving **DERIVED_FACT** truth records from naming conventions, decorator patterns, file relationships, and cross-reference analysis.

---

## 2. Deliverables

### 2.1 `src/reasoning.js` — Reasoning Engine (new module)

Seven inference functions, each producing an array of derived facts:

| Function | Inference Type | What it extracts |
|---|---|---|
| `inferSemantics()` | `SEMANTIC` | Meaning from names: `UsersController` → "handles HTTP requests for user entities" |
| `inferBehavior()` | `BEHAVIOR` | Layered call chains: Controller → Service → Repository → Entity → Table |
| `inferBusinessRules()` | `BUSINESS_RULE` | Constraints from schema: `NOT NULL`, `PRIMARY KEY`, type validations |
| `inferDtoTransformations()` | `DTO_TRANSFORMATION` | Data flow between layers: HTTP → Entity → DB column |
| `inferPermissions()` | `PERMISSION` | Auth patterns from controller guards, roles, decorators |
| `inferErrorHandling()` | `ERROR_HANDLING` | Try/catch, error classes, fallback patterns |
| `inferStateMachines()` | `STATE_MACHINE` | Enum usage, status fields, transition patterns |

Each derived fact:
```json
{
  "id": "derived:<type>:<subject>",
  "inference_type": "SEMANTIC|BEHAVIOR|...",
  "subject": "node id or file path",
  "statement": "human-readable inference",
  "confidence": 0.0-1.0,
  "evidence": [
    { "source_ref": "file", "line_range": "3-5", "quote": "matching text" }
  ],
  "dependencies": ["other derived fact ids"],
  "class": "DERIVED_FACT",
  "source_authority": "REASONING"
}
```

Confidence is computed deterministically from evidence count (not discretionary):
- 1 evidence → 0.5
- 2 evidence → 0.7
- 3+ evidence → 0.9

### 2.2 `src/engines.js` — Add `buildReasoning()`

Calls all seven inference functions after `buildStructural()` and `buildTraceability()`. Stores derived facts as truth records in the Store.

### 2.3 `spec/schemas/reasoning.schema.json`

Schema for `DERIVED_FACT` truth records.

### 2.4 `src/cli.js` — Add `reason` command

`node src/cli.js reason <projectDir>` → runs full pipeline including reasoning, prints derived facts.

### 2.5 `src/persistence.js` — Update `save()` / `load()`

Persist `reasoning.json` alongside model/impact/package/truth.

### 2.6 `harnesses/reasoning-harness.js`

Tests:
1. `node src/cli.js reason` produces ≥5 derived facts with confidence > 0.5
2. Determinism: same input → same derived facts
3. Every derived fact has source_ref + evidence_quote
4. Reasoning doesn't break existing structural/traceability engines
5. Reasoning output is persisted and loadable

---

## 3. Design Constraints

- **Zero npm dependencies** — regex only, no AST parser
- **Deterministic** — same source + same model → same derived facts
- **No AI calls** — pattern-based static analysis only
- **Confidence is computed, not guessed** — based on evidence density
- **DERIVED_FACT truth records** — same structure as DIRECT_OBSERVATION, different class

---

## 4. Implementation Order

1. Write `src/reasoning.js` with all inference functions
2. Update `src/engines.js` with `buildReasoning()`
3. Create `spec/schemas/reasoning.schema.json`
4. Update `src/cli.js` with `reason` command
5. Update `src/persistence.js` for reasoning.json
6. Create `harnesses/reasoning-harness.js`
7. Run all 4 harnesses (3 original + 1 new)
8. Commit and push

---

## 5. Success Criteria (from ROADMAP)

- [ ] `node src/cli.js reason fixtures/sample-project` produces at least 5 derived facts with evidence and confidence > 0.5
- [ ] Reasoning output is deterministic: same input → same derived facts on every run
- [ ] `detharness.js` still passes
- [ ] Every derived fact has a `source_ref` and `evidence_quote` that the validator can verify
- [ ] Reasoning does not break existing structural and traceability engines

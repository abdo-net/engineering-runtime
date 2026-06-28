# Plan: Milestone 2 — S2 Git-File Persistence

**Date:** 2026-06-28
**Milestone:** 2
**Subsystem:** S2 Store / Persistence
**Objective:** #6 (persist state), #7 (allow another AI to resume)

## What Will Change

### New Files (3)
- `src/persistence.js` — Git-file persistence layer
- `src/session.js` — Session state tracking
- `src/handoff-protocol.js` — Formal AI-to-AI resumption protocol

### Modified Files (1)
- `src/cli.js` — Add `persist` command

## What Each Module Does

### src/persistence.js
- `save(projectDir, store, impact, pkg)` — Writes model/impact/package/truth to `<project>-runtime/` as canonical JSON files
- `load(projectDir)` — Reads persisted files back into a reconstructed store
- Round-trip guarantee: `canonical(load(save(x))) === canonical(x)`
- Creates git repo if absent, commits with deterministic message, tags with package snapshot hash
- Uses `src/util.js` canonical() for deterministic serialization
- Never includes timestamps, random values, or volatile fields

### src/session.js
- `startSession(projectDir, mission, target)` — Creates session with unique ID, writes to `<project>-runtime/sessions/`
- `endSession(sessionId, status)` — Finalizes session, writes handoff trigger
- `resumeSession(projectDir)` — Loads latest session and handoff for a new AI
- Session records are canonical JSON, deterministic ordering

### src/handoff-protocol.js
- `generateHandoff(projectDir, session)` — Produces `HANDOFF.md` in `<project>-runtime/` with:
  - Previous AI's mission and target
  - What was discovered (model summary, coverage, blindspots)
  - What was blocked and why (gate state)
  - What the next AI should do
- `loadHandoff(projectDir)` — Parses the handoff for a new AI session

### src/cli.js
- New command: `persist <projectDir>` — Runs full pipeline, saves to `<project>-runtime/`

## Risk Assessment

- Could break determinism if persistence introduces timestamps or volatile fields
- Could break if git is not available in the environment
- Could break if `<project>-runtime/` path conflicts with existing directories
- Mitigation: use canonical() for all serialization, check git availability, use safe path creation

## Rollback Plan
- `git checkout -- src/cli.js` (revert CLI changes)
- `rm src/persistence.js src/session.js src/handoff-protocol.js` (remove new files)
- Re-run harnesses to confirm baseline restored

## Harness Impact
- `detharness.js` — should still pass; persistence is a side effect, not a core engine change
- `validation-harness.js` — should still pass
- `conformance-harness.js` — should still pass
- New harness needed: persistence round-trip test


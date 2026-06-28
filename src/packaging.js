'use strict';
// S10 — Packaging Engine (E17). Freezes an impact closure into the single Execution
// Package the AI is later allowed to act within. The package is a pure, deterministic
// function of (model, target): identical inputs -> byte-identical package (the milestone).
const { canonical, sha256 } = require('./util');

function buildPackage(store, ontology, impactReport, mission) {
  const closure = impactReport.nodes;
  const allowed_scope = [...new Set(
    closure.map(id => (store.getNode(id) || {}).source_ref).filter(Boolean)
  )].sort();
  const gating_truth = closure.map(id => `truth:${id}`).sort();
  // snapshot is derived from the canonical model — deterministic, stands in for a git HEAD
  const snapshot = sha256(canonical(store.serialize()));
  return {
    id: `pkg:${mission}`,
    mission,
    target: impactReport.target,
    affected_components: closure,            // BFS/propagation order, deterministic
    allowed_scope,
    coverage: impactReport.coverage,
    blindspots: impactReport.blindspots,
    gating_truth,
    acceptance_criteria: [
      { id: 'AC1', check: 'every affected component reconstructed before any edit' },
      { id: 'AC2', check: 'no edit outside allowed_scope' },
      { id: 'AC3', check: 'coverage gate satisfied or INVESTIGATION recorded' }
    ],
    repository_snapshot: snapshot,
    commit_hash: snapshot,
    escape_hatch: 'on live-code contradiction: HALT + emit CONTRADICTION finding',
    frozen: true
  };
}

module.exports = { buildPackage };

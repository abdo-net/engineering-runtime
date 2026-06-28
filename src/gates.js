'use strict';
// S12 — Gate / Validation Subsystem. Pure predicates between stages. A failed gate
// blocks the pipeline; G-COVERAGE specifically routes to the INVESTIGATION sub-workflow
// rather than letting reconstruction claim false completeness.

function gateCoverage(coverageReport, target) {
  const pass = coverageReport.coverage >= target;
  return {
    gate: 'G-COVERAGE', pass, blocking: !pass,
    detail: `coverage ${coverageReport.coverage} vs target ${target}`,
    remediation: pass ? null : { action: 'INVESTIGATION', blindspots: coverageReport.blindspots }
  };
}

function gateReconstructionComplete(modelCov, target) {
  const g = gateCoverage(modelCov, target);
  return { ...g, gate: 'G-RECONSTRUCTION-COMPLETE' };
}

function gateTruthValid(truths) {
  // G-TRUTH-VALID: Published truths must have ≥ 2 evidence sources
  const published = truths.filter(t => t.lifecycle === 'Published');
  const invalid = published.filter(t => !t.evidence || t.evidence.length < 2);
  const pass = invalid.length === 0;
  return {
    gate: 'G-TRUTH-VALID', pass, blocking: !pass,
    detail: pass ? 'all published truths have ≥ 2 evidence sources' : `${invalid.length} published truths have < 2 evidence sources`,
    remediation: pass ? null : { action: 'INVESTIGATE', truth_ids: invalid.map(t => t.id) }
  };
}

function gateTruthConsistent(truths) {
  // G-TRUTH-CONSISTENT: no two published truths may contradict
  const { findContradictions } = require('./truth');
  const contradictions = findContradictions(truths);
  const pass = contradictions.length === 0;
  return {
    gate: 'G-TRUTH-CONSISTENT', pass, blocking: !pass,
    detail: pass ? 'no contradictions among published truths' : `${contradictions.length} contradictions found`,
    remediation: pass ? null : { action: 'RECONCILE', contradictions }
  };
}

module.exports = { gateCoverage, gateReconstructionComplete, gateTruthValid, gateTruthConsistent };

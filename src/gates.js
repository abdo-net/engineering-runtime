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

module.exports = { gateCoverage, gateReconstructionComplete };

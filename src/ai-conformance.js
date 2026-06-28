'use strict';
// AI Conformance Framework orchestrator. Builds the AI Input Package, runs every
// worker through it, and evaluates each AI Output Package with the conformance
// validator. The Runtime never inspects worker_id/vendor_class to decide a verdict
// — every accept/reject decision comes only from schema, evidence, scope, impact,
// and coverage checks against the project's own artifacts.
const orch = require('./orchestrator');
const { buildInputPackage } = require('./protocol');
const { evaluate } = require('./conformance');

const workers = {
  compliant: require('./ai-workers/compliant'),
  hallucinator: require('./ai-workers/hallucinator'),
  'evidence-forger': require('./ai-workers/evidence-forger'),
  'lazy-coverage-liar': require('./ai-workers/lazy-coverage-liar'),
  'scope-violator': require('./ai-workers/scope-violator'),
  'instruction-ignorer': require('./ai-workers/instruction-ignorer'),
  'impact-underclaimer': require('./ai-workers/impact-underclaimer')
};

// Expected verdicts, used only by the harness to assert the framework itself is
// behaving correctly — never consulted by evaluate().
const EXPECTED_ACCEPT = new Set(['compliant']);

function runConformanceSuite(target, opts = {}) {
  const groundTruth = orch.executionPackage(target, opts);
  const ontology = groundTruth.ontology;
  const mission = opts.mission || `modify ${target}`;
  const input = buildInputPackage(target, mission, groundTruth.projectDir, ontology, opts);
  const ctx = { input, groundTruth, projectDir: groundTruth.projectDir, ontology };

  const results = Object.entries(workers).map(([name, w]) => {
    const output = w.run(ctx);
    const verdict = evaluate(output, ctx);
    return { worker_id: name, expected_accept: EXPECTED_ACCEPT.has(name), ...verdict };
  });

  return { target, mission, input, ground_truth_gate_coverage: groundTruth.modelCoverage.coverage, results };
}

module.exports = { runConformanceSuite, EXPECTED_ACCEPT };

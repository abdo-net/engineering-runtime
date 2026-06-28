'use strict';
// S-VAL — Runtime Validation. The required milestone before any further subsystem
// (S13 Mediation included) is built: proves, with measured evidence rather than
// assertion, whether independently-produced reconstructions converge on the same
// engineering model, and whether the Runtime automatically detects and rejects
// analysis that was skipped, guessed, or misreported. Answers the 10 questions
// directly; see README for the honesty caveat on what "independent" means here.
const orch = require('./orchestrator');
const { gateReconstructionComplete } = require('./gates');
const { validateSubmission } = require('./validator');
const { canonical } = require('./util');

const faithfulReorder = require('./workers/faithful-reorder');
const faithfulIndependent = require('./workers/faithful-independent');
const guessing = require('./workers/guessing');
const lazy = require('./workers/lazy');
const resumeOnly = require('./workers/resume-only');

function buildSubmissions(ctx) {
  return [
    faithfulReorder.run(ctx),
    faithfulIndependent.run(ctx),
    guessing.run(ctx),
    lazy.run(ctx),
    resumeOnly.run(ctx)
  ];
}

function runValidationSuite(target, opts = {}) {
  const groundTruth = orch.executionPackage(target, opts);
  const ontology = groundTruth.ontology;
  const mission = opts.mission || `modify ${target}`;
  const frozenModel = groundTruth.store.serialize();

  const ctx = { groundTruth, projectDir: groundTruth.projectDir, ontology, target, mission, frozenModel };
  const submissions = buildSubmissions(ctx);
  const verdicts = submissions.map(s => validateSubmission(s, groundTruth, ontology));
  const byId = Object.fromEntries(verdicts.map(v => [v.worker_id, v]));

  // Q8 — re-derive the gate directly from ground truth: reconstruction must be
  // measured and the gate must block before any package is treated as final.
  const gate = gateReconstructionComplete(groundTruth.modelCoverage, ontology.coverage_targets.default);

  // Q9 — resume-only must reproduce the exact ground-truth impact closure using
  // ONLY frozen artifacts, with zero access to project source.
  const resumeVerdict = byId['resume-only'];
  const q9 = {
    pass: resumeVerdict.convergence.impactGraph === 1 && resumeVerdict.accepted,
    impact_jaccard: resumeVerdict.convergence.impactGraph
  };

  // Q10 — two fully independent runs of reconstruct+impact+package (the det-harness
  // property) AND two independent validator runs over the same submissions must
  // produce byte-identical verdicts.
  const groundTruth2 = orch.executionPackage(target, opts);
  const modelsMatch = canonical(groundTruth.store.serialize()) === canonical(groundTruth2.store.serialize());
  const packagesMatch = canonical(groundTruth.package) === canonical(groundTruth2.package);
  const verdicts2 = submissions.map(s => validateSubmission(s, groundTruth2, ontology));
  const verdictsMatch = canonical(verdicts) === canonical(verdicts2);
  const q10 = { pass: modelsMatch && packagesMatch && verdictsMatch, modelsMatch, packagesMatch, verdictsMatch };

  const fi = byId['faithful-independent'].convergence;

  return {
    target, mission,
    ground_truth: {
      nodes: frozenModel.nodes.length, edges: frozenModel.edges.length, truth: frozenModel.truth.length,
      model_coverage: groundTruth.modelCoverage.coverage,
      gate
    },
    answers: {
      q1_topology: { pass: fi.topology === 1, evidence: fi.topology },
      q2_knowledge_graph: { pass: fi.knowledgeGraph === 1, evidence: fi.knowledgeGraph },
      q3_engineering_truth: { pass: fi.truth === 1, evidence: fi.truth },
      q4_impact_graph: { pass: fi.impactGraph === 1, evidence: fi.impactGraph },
      q5_execution_package: {
        pass: !!(fi.package && fi.package.allowed_scope === 1 && fi.package.coverage_match),
        evidence: fi.package
      },
      q6_detect_skipped_or_guessed: {
        pass: !byId['guessing'].accepted && !byId['lazy'].accepted,
        evidence: { guessing: byId['guessing'].violations, lazy: byId['lazy'].violations }
      },
      q7_reject_unsupported_automatically: {
        pass: !byId['guessing'].accepted &&
          byId['guessing'].violations.some(v => v.type === 'UNSUPPORTED_NODE' || v.type === 'UNSUPPORTED_EDGE'),
        evidence: byId['guessing'].violations
      },
      q8_detect_missing_reconstruction_before_planning: { pass: gate.blocking === true, evidence: gate },
      q9_resume_from_artifacts_only: q9,
      q10_two_executions_converge: q10
    },
    verdicts
  };
}

module.exports = { runValidationSuite };

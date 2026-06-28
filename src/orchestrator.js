'use strict';
// S11 — Orchestrator / Pipeline. Runs the mandatory, deterministic reconstruction
// sequence and only then allows impact + packaging. Execution (code generation) is
// structurally unreachable here: this module exposes no implement() — by design the
// first milestone is reconstruction + a frozen package, not code.
const path = require('path');
const { loadKernel } = require('./kernel');
const { loadOntology } = require('./ontology');
const { runAdapters } = require('./adapters');
const { buildStructural, buildTraceability } = require('./engines');
const { Store } = require('./store');
const { impact } = require('./graph');
const { modelCoverage } = require('./coverage');
const { gateReconstructionComplete } = require('./gates');
const { buildPackage } = require('./packaging');
const { buildReasoning } = require('./reasoning');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_PROJECT = path.join(ROOT, 'fixtures', 'sample-project');
const DEFAULT_ONTOLOGY = path.join(ROOT, 'profiles', 'crud-web.json');
const DEFAULT_LOCK = path.join(ROOT, 'kernel.lock');

// BOOT -> WARM reconstruct (cold inference of ontology is out of this milestone).
function reconstruct(opts = {}) {
  const { buildReasoning } = require('./reasoning');

  const projectDir = opts.projectDir || DEFAULT_PROJECT;
  const kernel = loadKernel(opts.lock || DEFAULT_LOCK);
  const ontology = loadOntology(opts.ontology || DEFAULT_ONTOLOGY);
  const store = new Store();

  // S3 adapters -> S5 engines (fixpoint trivially reached: deterministic single pass)
  const { observations, unsupported } = runAdapters(projectDir);
  buildStructural(store, observations);
  buildTraceability(store, observations, ontology);

  // S5 reasoning engines (opt-in, controlled by opts.reasoning)
  let facts = [];
  if (opts.reasoning === true) {
    facts = buildReasoning(store, projectDir);
  }

  const target = ontology.coverage_targets.default;
  const modelCov = modelCoverage(store, ontology);
  const gate = gateReconstructionComplete(modelCov, target);

  store.freeze(); // model is frozen before any planning/packaging
  return { projectDir, kernel, ontology, store, unsupported, modelCoverage: modelCov, gate, facts };
}

function impactReport(target, opts = {}) {
  const r = reconstruct(opts);
  return { ...r, impact: impact(r.store, r.ontology, target) };
}

function executionPackage(target, opts = {}) {
  const r = reconstruct(opts);
  const imp = impact(r.store, r.ontology, target);
  const pkg = buildPackage(r.store, r.ontology, imp, opts.mission || `modify ${target}`);
  return { ...r, impact: imp, package: pkg };
}

function reason(opts = {}) {
  const { buildReasoning } = require('./reasoning');
  const projectDir = opts.projectDir || DEFAULT_PROJECT;
  const kernel = loadKernel(opts.lock || DEFAULT_LOCK);
  const ontology = loadOntology(opts.ontology || DEFAULT_ONTOLOGY);
  const store = new Store();

  const { observations, unsupported } = runAdapters(projectDir);
  buildStructural(store, observations);
  buildTraceability(store, observations, ontology);

  const facts = buildReasoning(store, projectDir);

  const target = ontology.coverage_targets.default;
  const modelCov = modelCoverage(store, ontology);
  const gate = gateReconstructionComplete(modelCov, target);

  store.freeze();
  return { projectDir, kernel, ontology, store, unsupported, modelCoverage: modelCov, gate, facts };
}

module.exports = { reconstruct, impactReport, executionPackage, reason, DEFAULT_PROJECT };

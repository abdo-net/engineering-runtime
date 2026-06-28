'use strict';
// Simulated vendor behavior class: does NOT copy the ground-truth model. It
// independently re-runs the Runtime's mandatory contract (S3 adapters + S5/S6/S10
// deterministic engines) against the same project from scratch. This is the actual
// test of cross-vendor convergence: a different reasoning process converges on the
// same model not because it reasons identically, but because the Runtime's fixed
// contract (adapter parsing rules + ontology classification + deterministic id
// scheme) removes the discretion that would otherwise let vendors diverge.
const { runAdapters } = require('../adapters');
const { buildStructural, buildTraceability } = require('../engines');
const { Store } = require('../store');
const { impact } = require('../graph');
const { buildPackage } = require('../packaging');

function run(ctx) {
  const { projectDir, ontology, target, mission } = ctx;
  const store = new Store();
  const { observations } = runAdapters(projectDir);
  buildStructural(store, observations);
  buildTraceability(store, observations, ontology);
  store.freeze();
  const imp = impact(store, ontology, target);
  const pkg = buildPackage(store, ontology, imp, mission);
  return {
    worker_id: 'faithful-independent', vendor_class: 'faithful',
    mission, target, model: store.serialize(), impact: imp, package: pkg,
    artifacts_only: false
  };
}

module.exports = { run };

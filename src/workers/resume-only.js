'use strict';
// Simulated vendor behavior class for Q9: a SECOND, independent AI that never sees
// the project source files, the mission, or any prior conversation — only the
// frozen Runtime artifacts (the committed model). It must derive the same impact
// closure purely from those artifacts, proving the artifacts (not conversation or
// re-reading source) are sufficient for another AI to resume the project.
const { Store } = require('../store');
const { impact } = require('../graph');

function run(ctx) {
  const { frozenModel, ontology, target, mission } = ctx;
  const store = new Store();
  for (const n of frozenModel.nodes) store.putNode(n);
  for (const e of frozenModel.edges) store.putEdge(e);
  for (const t of frozenModel.truth) store.putTruth(t);
  store.freeze();
  const imp = impact(store, ontology, target);
  return {
    worker_id: 'resume-only', vendor_class: 'artifact-resume',
    mission, target, model: store.serialize(), impact: imp, package: null,
    artifacts_only: true
  };
}

module.exports = { run };

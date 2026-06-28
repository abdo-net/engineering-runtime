'use strict';
// Simulated vendor behavior class: a faithful reconstruction that copies the
// ground-truth model but emits nodes/edges/truth in reverse order, the way a
// different vendor's internal traversal order would differ even when the
// underlying analysis is identical. Tests whether convergence checking is
// order-independent (it must be: order is not part of the engineering contract).
function run(ctx) {
  const { groundTruth, target, mission } = ctx;
  const m = groundTruth.store.serialize();
  return {
    worker_id: 'faithful-reorder', vendor_class: 'faithful',
    mission, target,
    model: {
      nodes: [...m.nodes].reverse(),
      edges: [...m.edges].reverse(),
      truth: [...m.truth].reverse()
    },
    impact: { ...groundTruth.impact, nodes: [...groundTruth.impact.nodes].reverse() },
    package: groundTruth.package,
    artifacts_only: false
  };
}

module.exports = { run };

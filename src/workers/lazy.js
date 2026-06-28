'use strict';
// Simulated vendor behavior class: skips analysis of part of the project (drops the
// Controller/Endpoint/OpenAPI layer, as if those files were never read) but still
// reports the ground truth's coverage figure in its package — the "blind
// implementation" / shallow-reading failure mode the Runtime exists to prevent.
// Must be caught by the validator's claimed-vs-recomputed coverage consistency check.
function run(ctx) {
  const { groundTruth, target, mission } = ctx;
  const m = groundTruth.store.serialize();
  const dropped = new Set(['Controller', 'Endpoint', 'OpenAPI']);
  const nodes = m.nodes.filter(n => !dropped.has(n.class));
  const keepIds = new Set(nodes.map(n => n.id));
  const edges = m.edges.filter(e => keepIds.has(e.from) && keepIds.has(e.to));
  const edgeIds = new Set(edges.map(e => e.id));
  const truth = m.truth.filter(t => {
    const subj = t.id.replace(/^truth:/, '');
    return keepIds.has(subj) || edgeIds.has(subj);
  });
  return {
    worker_id: 'lazy', vendor_class: 'skipped-analysis',
    mission, target,
    model: { nodes, edges, truth },
    impact: { ...groundTruth.impact, nodes: groundTruth.impact.nodes.filter(id => keepIds.has(id)) },
    package: groundTruth.package, // claims the same (higher) coverage its own model no longer supports
    artifacts_only: false
  };
}

module.exports = { run };

'use strict';
// Simulated AI behavior: full, honest model reconstruction, but the reported
// impact closure for the mission target omits downstream nodes the Runtime's own
// deterministic BFS requires. Must be rejected as IMPACT_UNDERCLAIM.
const compliant = require('./compliant');

function run(ctx) {
  const base = compliant.run(ctx);
  const truncated = base.impact_closure.nodes.filter(id => !id.startsWith('endpoint:') && !id.startsWith('openapi:'));
  return { ...base, worker_id: 'impact-underclaimer', impact_closure: { ...base.impact_closure, nodes: truncated } };
}

module.exports = { run };

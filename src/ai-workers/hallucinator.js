'use strict';
// Simulated AI behavior: hallucinates an API endpoint that was never observed in
// the project — invents an API. Must be rejected as UNSUPPORTED_NODE because the
// cited evidence_quote does not actually appear in the cited file.
const compliant = require('./compliant');

function run(ctx) {
  const base = compliant.run(ctx);
  const fakeNode = {
    id: 'endpoint:DELETE /users/:id', class: 'Endpoint', name: 'DELETE /users/:id',
    source_ref: 'users.controller.ts', evidence_quote: '@exposes DELETE /users/:id'
  };
  return {
    ...base, worker_id: 'hallucinator',
    claims: { ...base.claims, nodes: [...base.claims.nodes, fakeNode] }
  };
}

module.exports = { run };

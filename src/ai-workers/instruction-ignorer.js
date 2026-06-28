'use strict';
// Simulated AI behavior: ignores the request and answers about a different target
// than the one it was asked to reconstruct. Must be rejected as CONTRACT_VIOLATION
// before any evidence/impact/scope check is even attempted.
const compliant = require('./compliant');

function run(ctx) {
  const base = compliant.run(ctx);
  return { ...base, worker_id: 'instruction-ignorer', target: 'column:users.email' };
}

module.exports = { run };

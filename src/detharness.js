#!/usr/bin/env node
'use strict';
// Determinism conformance harness (spec II.6). Proves the first milestone: from
// identical inputs the Runtime reconstructs a byte-identical model and produces a
// byte-identical Execution Package on every run. Exits non-zero on any divergence.
const { canonical } = require('./util');
const orch = require('./orchestrator');

const TARGET = process.argv[2] || 'column:users.status';

function run() {
  const r = orch.executionPackage(TARGET, { mission: `modify ${TARGET}` });
  return {
    model: canonical(r.store.serialize()),
    impact: canonical(r.impact),
    pkg: canonical(r.package),
    snapshot: r.package.repository_snapshot
  };
}

const a = run();
const b = run();

const checks = [
  ['model', a.model === b.model],
  ['impact closure', a.impact === b.impact],
  ['execution package', a.pkg === b.pkg]
];

let ok = true;
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  deterministic ${name}`);
  ok = ok && pass;
}
console.log(`\npackage snapshot (run 1): ${a.snapshot}`);
console.log(`package snapshot (run 2): ${b.snapshot}`);
console.log(`\n${ok ? 'DETERMINISM PROVEN — identical Execution Package from identical inputs'
                    : 'DETERMINISM VIOLATED'}`);
process.exit(ok ? 0 : 1);

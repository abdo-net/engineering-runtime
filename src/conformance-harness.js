#!/usr/bin/env node
'use strict';
// AI Conformance Framework proof harness. Runs every simulated AI worker through
// the real Input/Output Package protocol and asserts the Runtime's verdict matches
// what is required: the compliant worker accepted, every untrustworthy behavior
// (hallucination, forged evidence, skipped analysis, scope violation, ignored
// instructions, impact under-claim) automatically rejected with the correct
// machine-readable reason code. Exits non-zero on any mismatch.
const { runConformanceSuite } = require('./ai-conformance');

const TARGET = process.argv[2] || 'column:users.status';
const r = runConformanceSuite(TARGET, { mission: `modify ${TARGET}` });

const EXPECTED_REASON = {
  hallucinator: 'UNSUPPORTED_NODE',
  'evidence-forger': 'EVIDENCE_NOT_VERIFIABLE',
  'lazy-coverage-liar': 'COVERAGE_MISCLAIM',
  'scope-violator': 'SCOPE_VIOLATION',
  'instruction-ignorer': 'CONTRACT_VIOLATION',
  'impact-underclaimer': 'IMPACT_UNDERCLAIM'
};

let ok = true;
for (const res of r.results) {
  const codes = res.rejections.map(x => x.code);
  let pass;
  if (res.expected_accept) {
    pass = res.accepted === true;
  } else {
    pass = res.accepted === false && codes.includes(EXPECTED_REASON[res.worker_id]);
  }
  ok = ok && pass;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${res.worker_id}: accepted=${res.accepted} reasons=[${codes.join(', ')}]`);
}

console.log(`\nground truth model coverage: ${r.ground_truth_gate_coverage}`);
console.log(`\n${ok ? 'AI CONFORMANCE FRAMEWORK PROVEN — every untrusted behavior rejected by structure, the compliant worker accepted'
                    : 'AI CONFORMANCE FRAMEWORK FAILED — see FAIL lines above'}`);
process.exit(ok ? 0 : 1);

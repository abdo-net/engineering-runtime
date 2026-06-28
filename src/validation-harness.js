#!/usr/bin/env node
'use strict';
// Validation conformance harness. Proves the Runtime Validation milestone: runs the
// full suite and asserts every expected outcome — faithful submissions converge,
// unsupported/skipped submissions are rejected automatically, the gate blocks before
// planning, artifact-only resume reproduces the same impact closure, and two
// independent executions (model + package + validator verdicts) agree. Exits
// non-zero on any divergence, exactly like detharness.js does for Milestone 1.
const { runValidationSuite } = require('./validation');

const TARGET = process.argv[2] || 'column:users.status';
const r = runValidationSuite(TARGET, { mission: `modify ${TARGET}` });

const checks = [
  ['Q1 topology convergence (independent reconstruction)', r.answers.q1_topology.pass],
  ['Q2 knowledge graph convergence', r.answers.q2_knowledge_graph.pass],
  ['Q3 engineering truth convergence', r.answers.q3_engineering_truth.pass],
  ['Q4 impact graph convergence', r.answers.q4_impact_graph.pass],
  ['Q5 execution package constraint equivalence', r.answers.q5_execution_package.pass],
  ['Q6 detect skipped/guessed analysis', r.answers.q6_detect_skipped_or_guessed.pass],
  ['Q7 automatic rejection of unsupported conclusions', r.answers.q7_reject_unsupported_automatically.pass],
  ['Q8 gate blocks missing reconstruction before planning', r.answers.q8_detect_missing_reconstruction_before_planning.pass],
  ['Q9 resume from frozen artifacts only', r.answers.q9_resume_from_artifacts_only.pass],
  ['Q10 two independent executions converge', r.answers.q10_two_executions_converge.pass]
];

let ok = true;
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
  ok = ok && pass;
}

console.log(`\nfaithful-independent convergence: topology=${r.answers.q1_topology.evidence} ` +
  `knowledgeGraph=${r.answers.q2_knowledge_graph.evidence} truth=${r.answers.q3_engineering_truth.evidence} ` +
  `impact=${r.answers.q4_impact_graph.evidence}`);
console.log(`guessing worker violations: ${JSON.stringify(r.answers.q6_detect_skipped_or_guessed.evidence.guessing)}`);
console.log(`lazy worker violations: ${JSON.stringify(r.answers.q6_detect_skipped_or_guessed.evidence.lazy)}`);
console.log(`gate: ${JSON.stringify(r.ground_truth.gate)}`);
console.log(`q9 resume-only impact jaccard: ${r.answers.q9_resume_from_artifacts_only.impact_jaccard}`);
console.log(`q10: ${JSON.stringify(r.answers.q10_two_executions_converge)}`);

console.log(`\n${ok ? 'RUNTIME VALIDATION PROVEN — all 10 properties hold with measured evidence'
                    : 'RUNTIME VALIDATION FAILED — see FAIL lines above'}`);
process.exit(ok ? 0 : 1);

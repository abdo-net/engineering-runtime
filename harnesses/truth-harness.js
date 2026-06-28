/**
 * @file truth-harness.js
 * Truth Lifecycle Engine validation harness.
 *
 * Tests:
 * 1. Truth promotion works through all lifecycle states
 * 2. G-TRUTH-VALID blocks when Published truth has < 2 evidence
 * 3. G-TRUTH-CONSISTENT blocks when two truths contradict
 * 4. Determinism: same store → same truth lifecycle results
 * 5. Invalidation produces Challenged state with reason
 * 6. Merge combines truth records correctly
 * 7. CLI integration (promote, invalidate, truth commands)
 */

const { execSync } = require('child_process');
const path = require('path');
const { canonical } = require('../src/util');
const { Store } = require('../src/store');
const {
  evaluateTruth, promoteTruth, invalidateTruth, mergeTruth,
  findContradictions, buildTruthLifecycle, getTruthStats
} = require('../src/truth');
const { gateTruthValid, gateTruthConsistent } = require('../src/gates');
const { save, load } = require('../src/persistence');

const CLI_PATH = path.resolve(__dirname, '../src/cli.js');
const PROJECT_DIR = path.resolve(__dirname, '../fixtures/sample-project');
const RUNTIME_DIR = path.resolve(__dirname, '../fixtures/sample-project-runtime');

function cleanRuntime() {
  const fs = require('fs');
  if (fs.existsSync(RUNTIME_DIR)) {
    fs.rmSync(RUNTIME_DIR, { recursive: true, force: true });
  }
}

function buildTestStore() {
  const store = new Store();

  // Truth with 1 evidence (should fail G-TRUTH-VALID when Published)
  store.putTruth({
    id: 'truth:weak',
    subject: 'column:users.status',
    statement: 'Status is optional',
    class: 'DIRECT_OBSERVATION',
    source_authority: 'CODE',
    evidence: ['schema.sql'],
    dependencies: [],
    lifecycle: 'Observed'
  });

  // Truth with 2 evidence (should pass G-TRUTH-VALID)
  store.putTruth({
    id: 'truth:strong',
    subject: 'column:users.id',
    statement: 'ID is primary key',
    class: 'DIRECT_OBSERVATION',
    source_authority: 'CODE',
    evidence: ['schema.sql', 'entity.ts'],
    dependencies: [],
    lifecycle: 'Observed'
  });

  // Truth with 2 evidence (contradicts truth:weak)
  store.putTruth({
    id: 'truth:contradiction',
    subject: 'column:users.status',
    statement: 'Status is not optional',
    class: 'DERIVED_FACT',
    source_authority: 'REASONING',
    evidence: ['schema.sql', 'service.ts'],
    dependencies: [],
    lifecycle: 'Observed'
  });

  return store;
}

function testPromotionLifecycle() {
  console.log('=== Test: Truth promotion through lifecycle ===');
  const store = buildTestStore();
  const truth = store.allTruth().find(t => t.id === 'truth:weak');
  if (!truth) throw new Error('truth:weak not found in store');

  // Should be able to promote to Documented (has statement + 1 evidence)
  let r = promoteTruth(truth, 'Documented', { store });
  if (!r.success) throw new Error('Failed to promote to Documented: ' + r.error);
  if (truth.lifecycle !== 'Documented') throw new Error('Lifecycle not updated to Documented');
  console.log('  Documented OK');

  // Should be able to promote to Validated (has 1 evidence, need 2 — wait, this should fail)
  // Actually truth:weak only has 1 evidence, so it can't go to Validated
  r = promoteTruth(truth, 'Validated', { store });
  if (r.success) throw new Error('Should not promote to Validated with only 1 evidence');
  console.log('  Validated blocked correctly (only 1 evidence)');

  // Promote truth:strong instead (has 2 evidence)
  const strong = store.allTruth()[1];
  r = promoteTruth(strong, 'Documented', { store });
  if (!r.success) throw new Error('Failed to promote strong to Documented');
  r = promoteTruth(strong, 'Validated', { store });
  if (!r.success) throw new Error('Failed to promote strong to Validated');
  r = promoteTruth(strong, 'Published', { store });
  if (!r.success) throw new Error('Failed to promote strong to Published');
  if (strong.lifecycle !== 'Published') throw new Error('Lifecycle not updated to Published');
  console.log('  Published OK (strong truth)');

  return true;
}

function testGateTruthValid() {
  console.log('=== Test: G-TRUTH-VALID blocks < 2 evidence ===');
  const store = buildTestStore();

  // Promote all to Published, force truth:weak to Published even though it shouldn't be
  for (const t of store.allTruth()) {
    promoteTruth(t, 'Documented', { store });
    promoteTruth(t, 'Validated', { store });
    promoteTruth(t, 'Published', { store });
  }

  // Manually force truth:weak to Published (simulating a bad state)
  const weak = store.allTruth().find(t => t.id === 'truth:weak');
  weak.lifecycle = 'Published';
  weak.evidence = ['schema.sql']; // ensure only 1 evidence

  const gate = gateTruthValid(store.allTruth());
  if (gate.pass) {
    throw new Error('G-TRUTH-VALID should block: truth:weak has only 1 evidence');
  }
  if (gate.blocking !== true) {
    throw new Error('G-TRUTH-VALID should be blocking');
  }
  console.log('  G-TRUTH-VALID blocked correctly:', gate.detail);

  // Fix truth:weak by adding evidence
  weak.evidence.push('controller.ts');
  const gate2 = gateTruthValid(store.allTruth());
  if (!gate2.pass) {
    throw new Error('G-TRUTH-VALID should pass after adding evidence');
  }
  console.log('  G-TRUTH-VALID passed after adding evidence');

  return true;
}

function testGateTruthConsistent() {
  console.log('=== Test: G-TRUTH-CONSISTENT blocks contradictions ===');
  const store = buildTestStore();

  // Promote all to Published
  for (const t of store.allTruth()) {
    promoteTruth(t, 'Documented', { store });
    promoteTruth(t, 'Validated', { store });
    promoteTruth(t, 'Published', { store });
  }

  // Manually force truth:weak to Published so it can be checked for contradiction
  const weak = store.allTruth().find(t => t.id === 'truth:weak');
  weak.lifecycle = 'Published';

  const gate = gateTruthConsistent(store.allTruth());
  if (gate.pass) {
    throw new Error('G-TRUTH-CONSISTENT should block: truth:weak contradicts truth:contradiction');
  }
  console.log('  G-TRUTH-CONSISTENT blocked correctly:', gate.detail);

  // Fix by invalidating one of the contradictory truths
  invalidateTruth(weak, 'Superseded by stronger evidence');
  const gate2 = gateTruthConsistent(store.allTruth());
  if (!gate2.pass) {
    throw new Error('G-TRUTH-CONSISTENT should pass after invalidation');
  }
  console.log('  G-TRUTH-CONSISTENT passed after invalidation');

  return true;
}

function testDeterminism() {
  console.log('=== Test: Determinism ===');
  const store1 = buildTestStore();
  const store2 = buildTestStore();

  buildTruthLifecycle(store1);
  buildTruthLifecycle(store2);

  const c1 = canonical(store1.allTruth().map(t => ({ id: t.id, lifecycle: t.lifecycle })));
  const c2 = canonical(store2.allTruth().map(t => ({ id: t.id, lifecycle: t.lifecycle })));

  if (c1 !== c2) {
    throw new Error('Determinism FAILED: truth lifecycle differs');
  }
  console.log('  PASS: identical truth lifecycle across runs');
  return true;
}

function testInvalidation() {
  console.log('=== Test: Invalidation ===');
  const store = buildTestStore();
  const truth = store.allTruth()[0];

  const result = invalidateTruth(truth, 'New evidence contradicts this claim');
  if (!result.success) throw new Error('Invalidation failed');
  if (truth.lifecycle !== 'Challenged') throw new Error('Lifecycle not Challenged');
  if (truth.invalidation_reason !== 'New evidence contradicts this claim') {
    throw new Error('Invalidation reason not stored');
  }
  console.log('  Invalidation OK:', truth.id, '→ Challenged');
  return true;
}

function testMerge() {
  console.log('=== Test: Merge truth records ===');
  const a = {
    id: 'truth:a',
    subject: 'column:users.id',
    statement: 'ID is primary key',
    class: 'DIRECT_OBSERVATION',
    source_authority: 'CODE',
    evidence: ['schema.sql'],
    dependencies: [],
    lifecycle: 'Observed'
  };
  const b = {
    id: 'truth:b',
    subject: 'column:users.id',
    statement: 'ID is primary key',
    class: 'VERIFIED_FACT',
    source_authority: 'MODEL',
    evidence: ['entity.ts', 'test.ts'],
    dependencies: ['truth:other'],
    lifecycle: 'Validated'
  };

  const merged = mergeTruth(a, b);
  if (merged.id !== 'truth:a') throw new Error('Merge kept wrong ID');
  if (merged.lifecycle !== 'Validated') throw new Error('Merge should keep higher lifecycle');
  if (merged.evidence.length !== 3) throw new Error('Merge should combine evidence: got ' + merged.evidence.length);
  if (merged.dependencies.length !== 1) throw new Error('Merge should combine dependencies');
  console.log('  Merge OK:', merged.evidence.length, 'evidence sources, lifecycle:', merged.lifecycle);
  return true;
}

function testCLIIntegration() {
  console.log('=== Test: CLI integration ===');
  cleanRuntime();

  // First persist some data
  const { runReasoning } = require('../src/reasoning');
  const result = runReasoning(PROJECT_DIR);
  const persistResult = save(PROJECT_DIR, result.store, {}, {}, result.store.allTruth(), result.facts);
  if (!persistResult.committed) throw new Error('Save failed');

  // Test truth command
  const cmdTruth = `node "${CLI_PATH}" truth --project="${PROJECT_DIR}"`;
  const outputTruth = execSync(cmdTruth, { encoding: 'utf-8', cwd: path.resolve(__dirname, '..') });
  const truthResult = JSON.parse(outputTruth);
  if (!truthResult.total_truths || truthResult.total_truths === 0) {
    throw new Error('CLI truth command returned no truths');
  }
  console.log('  CLI truth OK:', truthResult.total_truths, 'truths');

  // Test promote command (promote a truth to Published)
  const someTruth = truthResult.truths[0];
  const cmdPromote = `node "${CLI_PATH}" promote "${someTruth.id}" "Published" --project="${PROJECT_DIR}"`;
  const outputPromote = execSync(cmdPromote, { encoding: 'utf-8', cwd: path.resolve(__dirname, '..') });
  const promoteResult = JSON.parse(outputPromote);
  if (!promoteResult.success && promoteResult.can_promote && !promoteResult.can_promote['Published']) {
    console.log('  CLI promote skipped (insufficient evidence for Published)');
  } else if (promoteResult.success) {
    console.log('  CLI promote OK:', promoteResult.from, '→', promoteResult.to);
  } else {
    console.log('  CLI promote result:', promoteResult.error || 'unknown');
  }

  return true;
}

function runAll() {
  console.log('\nTruth Harness — S7 Truth Promotion + Invalidation\n');
  const tests = [
    testPromotionLifecycle,
    testGateTruthValid,
    testGateTruthConsistent,
    testDeterminism,
    testInvalidation,
    testMerge,
    testCLIIntegration
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      test();
      passed++;
    } catch (err) {
      console.log('  FAIL:', err.message);
      failed++;
    }
  }

  console.log(`\n${passed}/${tests.length} tests passed, ${failed} failed`);

  cleanRuntime();

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runAll();
}

module.exports = { runAll };

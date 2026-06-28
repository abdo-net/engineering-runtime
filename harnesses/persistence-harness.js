/**
 * @file persistence-harness.js
 * Persistence layer round-trip test.
 *
 * Tests:
 * 1. Save + load round-trip preserves canonical form
 * 2. Session creation and retrieval
 * 3. Handoff generation and round-trip
 * 4. CLI persist command end-to-end
 *
 * Rule: canonical(load(save(x))) === canonical(x)
 */

const fs = require('fs');
const path = require('path');
const { canonical, sha256 } = require('../src/util');
const { Store } = require('../src/store');
const { save, load, roundTrip } = require('../src/persistence');
const { startSession, endSession, resumeSession } = require('../src/session');
const { generateHandoff, loadHandoff } = require('../src/handoff-protocol');

// Test project directory
const TEST_PROJECT_DIR = path.resolve(__dirname, '../fixtures/persistence-test');
const RUNTIME_DIR = path.resolve(__dirname, '../fixtures/persistence-test-runtime');

function ensureClean(projectDir, runtimeDir) {
  if (fs.existsSync(runtimeDir)) {
    fs.rmSync(runtimeDir, { recursive: true, force: true });
  }
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }
}

function buildTestStore() {
  const store = new Store();

  const userTable = {
    id: 'table:users',
    class: 'table',
    schema: 'public',
    name: 'users',
    sql: 'CREATE TABLE users (id int, status varchar(20))'
  };

  const statusColumn = {
    id: 'column:status',
    class: 'column',
    table: 'users',
    name: 'status',
    type: 'varchar'
  };

  const userTableEdge = {
    id: 'edge:contains:table:users:column:status',
    kind: 'contains',
    from: 'table:users',
    to: 'column:status',
    rel: {}
  };

  store.putNode(userTable);
  store.putNode(statusColumn);
  store.putEdge(userTableEdge);

  store.putTruth({
    id: 'truth:vendor:postgresql',
    statement: 'PostgreSQL 15.4',
    class: 'DIRECT_OBSERVATION',
    source_authority: 'CODE',
    evidence: ['pg_version'],
    dependencies: [],
    lifecycle: 'Observed'
  });

  store.putTruth({
    id: 'truth:source:users',
    statement: 'Table users exists',
    class: 'DIRECT_OBSERVATION',
    source_authority: 'CODE',
    evidence: ['schema.sql'],
    dependencies: [],
    lifecycle: 'Observed'
  });

  return store;
}

function buildTestImpact() {
  return {
    'table:users': {
      direct: ['column:status'],
      transitive: ['index:users_status_idx'],
      consumers: ['view:active_users'],
      riskLevel: 'medium'
    }
  };
}

function buildTestPackage() {
  return {
    repository_snapshot: 'abc123',
    schema: 'public',
    target: 'column:users.status',
    changes: ['ALTER TABLE users ALTER COLUMN status TYPE varchar(50)'],
    rollback: ['ALTER TABLE users ALTER COLUMN status TYPE varchar(20)']
  };
}

function testRoundTrip() {
  console.log('=== Test: Round-trip ===');
  ensureClean(TEST_PROJECT_DIR, RUNTIME_DIR);

  const store = buildTestStore();
  const impact = buildTestImpact();
  const pkg = buildTestPackage();
  const truth = store.allTruth();

  const saveResult = save(TEST_PROJECT_DIR, store, impact, pkg, truth);
  if (!saveResult.committed) {
    throw new Error('Save failed: not committed');
  }
  console.log('  Save OK:', saveResult.snapshot);

  const loaded = load(TEST_PROJECT_DIR);
  if (!loaded.exists) {
    throw new Error('Load failed: no runtime found');
  }
  console.log('  Load OK:', loaded.snapshot);

  // Verify canonical equality
  const origModel = canonical(store.serialize());
  const loadedModel = canonical(loaded.store.serialize());
  if (origModel !== loadedModel) {
    throw new Error('Round-trip FAILED: model mismatch');
  }

  const origImpact = canonical(impact);
  const loadedImpact = canonical(loaded.impact);
  if (origImpact !== loadedImpact) {
    throw new Error('Round-trip FAILED: impact mismatch');
  }

  const origPkg = canonical(pkg);
  const loadedPkg = canonical(loaded.package);
  if (origPkg !== loadedPkg) {
    throw new Error('Round-trip FAILED: package mismatch');
  }

  const origTruth = canonical(truth);
  const loadedTruth = canonical(loaded.truth);
  if (origTruth !== loadedTruth) {
    throw new Error('Round-trip FAILED: truth mismatch');
  }

  console.log('  Round-trip PASS: all canonical forms equal');
  return true;
}

function testRoundTripHelper() {
  console.log('=== Test: roundTrip helper ===');
  ensureClean(TEST_PROJECT_DIR, RUNTIME_DIR);

  const store = buildTestStore();
  const impact = buildTestImpact();
  const pkg = buildTestPackage();
  const truth = store.allTruth();

  const result = roundTrip(TEST_PROJECT_DIR, store, impact, pkg, truth);
  if (!result) {
    throw new Error('roundTrip helper returned false');
  }
  console.log('  roundTrip helper PASS');
  return true;
}

function testSessionLifecycle() {
  console.log('=== Test: Session lifecycle ===');
  ensureClean(TEST_PROJECT_DIR, RUNTIME_DIR);

  // First, save something so runtime dir exists
  const store = buildTestStore();
  save(TEST_PROJECT_DIR, store, {}, {}, []);

  const session = startSession(TEST_PROJECT_DIR, 'modify users.status', 'column:users.status');
  if (!session.session_id) {
    throw new Error('Session start failed: no ID');
  }
  console.log('  Session start OK:', session.session_id);

  endSession(session.session_id, TEST_PROJECT_DIR, 'completed', { nodes: 5, coverage: 1.0 });
  console.log('  Session end OK');

  const resumed = resumeSession(TEST_PROJECT_DIR);
  if (!resumed || resumed.session_id !== session.session_id) {
    throw new Error('Session resume failed');
  }
  console.log('  Session resume OK:', resumed.session_id);

  if (resumed.status !== 'completed') {
    throw new Error('Session status mismatch');
  }
  console.log('  Session status OK:', resumed.status);

  return true;
}

function testHandoffGeneration() {
  console.log('=== Test: Handoff generation ===');
  ensureClean(TEST_PROJECT_DIR, RUNTIME_DIR);

  const store = buildTestStore();
  save(TEST_PROJECT_DIR, store, {}, {}, []);

  const session = startSession(TEST_PROJECT_DIR, 'modify users.status', 'column:users.status');
  const impact = buildTestImpact();
  const pkg = buildTestPackage();
  const gate = { pass: true, coverage: 1.0, open_nodes: [], closed: true };

  const handoff = generateHandoff(TEST_PROJECT_DIR, session, store.serialize(), impact, pkg, gate);
  if (!handoff.handoff_id) {
    throw new Error('Handoff generation failed: no ID');
  }
  console.log('  Handoff generation OK:', handoff.handoff_id);

  // Verify handoff content
  if (!handoff.discovery || handoff.discovery.nodes === undefined) {
    throw new Error('Handoff missing discovery');
  }
  console.log('  Handoff discovery OK:', handoff.discovery.nodes, 'nodes');

  if (!handoff.next_steps || handoff.next_steps.length === 0) {
    throw new Error('Handoff missing next_steps');
  }
  console.log('  Handoff next_steps OK:', handoff.next_steps.map(s => s.action).join(', '));

  const loaded = loadHandoff(TEST_PROJECT_DIR);
  if (!loaded || loaded.handoff_id !== handoff.handoff_id) {
    throw new Error('Handoff load failed');
  }
  console.log('  Handoff load OK:', loaded.handoff_id);

  return true;
}

function testDeterminism() {
  console.log('=== Test: Determinism (snapshot hash stable) ===');
  ensureClean(TEST_PROJECT_DIR, RUNTIME_DIR);

  const store = buildTestStore();
  const impact = buildTestImpact();
  const pkg = buildTestPackage();
  const truth = store.allTruth();

  const r1 = save(TEST_PROJECT_DIR, store, impact, pkg, truth);
  const hash1 = r1.snapshot;

  // Clean and save again with same data
  if (fs.existsSync(RUNTIME_DIR)) {
    fs.rmSync(RUNTIME_DIR, { recursive: true, force: true });
  }

  const r2 = save(TEST_PROJECT_DIR, store, impact, pkg, truth);
  const hash2 = r2.snapshot;

  if (hash1 !== hash2) {
    throw new Error(`Determinism FAILED: ${hash1} !== ${hash2}`);
  }
  console.log('  Determinism PASS:', hash1);
  return true;
}

function testCLIIntegration() {
  console.log('=== Test: CLI integration (persist command) ===');
  const { execSync } = require('child_process');
  const cliPath = path.resolve(__dirname, '../src/cli.js');
  const projectDir = path.resolve(__dirname, '../fixtures/sample-project');
  const runtimeDir = path.resolve(__dirname, '../fixtures/sample-project-runtime');

  // Clean runtime dir
  if (fs.existsSync(runtimeDir)) {
    fs.rmSync(runtimeDir, { recursive: true, force: true });
  }

  const cmd = `node "${cliPath}" persist "column:users.status" --projectDir="${projectDir}" --mission="test integration"`;
  const output = execSync(cmd, { encoding: 'utf-8', cwd: path.resolve(__dirname, '..') });
  const result = JSON.parse(output);

  if (!result.session) {
    throw new Error('CLI persist failed: no session ID');
  }
  console.log('  CLI session OK:', result.session);

  if (!result.persisted) {
    throw new Error('CLI persist failed: not persisted');
  }
  console.log('  CLI persisted OK:', result.snapshot);

  if (!result.handoff) {
    throw new Error('CLI persist failed: no handoff');
  }
  console.log('  CLI handoff OK:', result.handoff);

  if (!result.next_steps || result.next_steps.length === 0) {
    throw new Error('CLI persist failed: no next_steps');
  }
  console.log('  CLI next_steps OK:', result.next_steps.map(s => s.action).join(', '));

  return true;
}

function runAll() {
  console.log('\nPersistence Harness — S2 Git-File Persistence\n');
  const tests = [
    testRoundTrip,
    testRoundTripHelper,
    testSessionLifecycle,
    testHandoffGeneration,
    testDeterminism,
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

  // Cleanup
  if (fs.existsSync(RUNTIME_DIR)) {
    fs.rmSync(RUNTIME_DIR, { recursive: true, force: true });
  }
  if (fs.existsSync(TEST_PROJECT_DIR)) {
    fs.rmSync(TEST_PROJECT_DIR, { recursive: true, force: true });
  }

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runAll();
}

module.exports = { runAll };

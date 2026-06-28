/**
 * @file reasoning-harness.js
 * Reasoning Engine validation harness.
 *
 * Tests:
 * 1. CLI reason produces ≥5 derived facts with confidence > 0.5
 * 2. Determinism: same input → same derived facts on every run
 * 3. Every derived fact has source_ref and evidence_quote
 * 4. Reasoning does not break existing structural/traceability engines
 * 5. Reasoning output is persisted and loadable
 */

const { execSync } = require('child_process');
const path = require('path');
const { canonical } = require('../src/util');
const { runReasoning } = require('../src/reasoning');
const { Store } = require('../src/store');
const { save, load, roundTrip } = require('../src/persistence');

const CLI_PATH = path.resolve(__dirname, '../src/cli.js');
const PROJECT_DIR = path.resolve(__dirname, '../fixtures/sample-project');
const RUNTIME_DIR = path.resolve(__dirname, '../fixtures/sample-project-runtime');

function cleanRuntime() {
  if (require('fs').existsSync(RUNTIME_DIR)) {
    require('fs').rmSync(RUNTIME_DIR, { recursive: true, force: true });
  }
}

function testAtLeastFiveFacts() {
  console.log('=== Test: At least 5 derived facts with confidence > 0.5 ===');
  const result = runReasoning(PROJECT_DIR);
  const factsWithHighConfidence = result.facts.filter(f => f.confidence > 0.5);
  
  if (result.facts.length < 5) {
    throw new Error(`Only ${result.facts.length} facts produced, expected at least 5`);
  }
  if (factsWithHighConfidence.length < 5) {
    throw new Error(`Only ${factsWithHighConfidence.length} facts with confidence > 0.5, expected at least 5`);
  }
  console.log(`  PASS: ${result.facts.length} facts total, ${factsWithHighConfidence.length} with confidence > 0.5`);
  return true;
}

function testDeterminism() {
  console.log('=== Test: Determinism ===');
  const r1 = runReasoning(PROJECT_DIR);
  const r2 = runReasoning(PROJECT_DIR);
  
  const c1 = canonical(r1.facts.map(f => ({ id: f.id, type: f.inference_type, statement: f.statement, confidence: f.confidence })));
  const c2 = canonical(r2.facts.map(f => ({ id: f.id, type: f.inference_type, statement: f.statement, confidence: f.confidence })));
  
  if (c1 !== c2) {
    throw new Error('Determinism FAILED: facts differ between runs');
  }
  console.log('  PASS: identical derived facts across runs');
  return true;
}

function testEvidenceAndSourceRef() {
  console.log('=== Test: Every derived fact has source_ref and evidence_quote ===');
  const result = runReasoning(PROJECT_DIR);
  
  for (const fact of result.facts) {
    if (!fact.evidence || fact.evidence.length === 0) {
      throw new Error(`Fact ${fact.id} has no evidence`);
    }
    for (const ev of fact.evidence) {
      if (!ev.source_ref) {
        throw new Error(`Fact ${fact.id} has evidence without source_ref`);
      }
      if (!ev.quote) {
        throw new Error(`Fact ${fact.id} has evidence without quote`);
      }
    }
  }
  console.log(`  PASS: all ${result.facts.length} facts have source_ref and evidence_quote`);
  return true;
}

function testDoesNotBreakStructural() {
  console.log('=== Test: Reasoning does not break structural engines ===');
  const { reconstruct } = require('../src/orchestrator');
  
  // Run without reasoning
  const r1 = reconstruct({ reasoning: false });
  const nodes1 = r1.store.allNodes().length;
  const edges1 = r1.store.allEdges().length;
  
  // Run with reasoning
  const r2 = reconstruct({ reasoning: true });
  const nodes2 = r2.store.allNodes().length;
  const edges2 = r2.store.allEdges().length;
  
  // Structural nodes and edges should be identical
  if (nodes1 !== nodes2) {
    throw new Error(`Node count changed: ${nodes1} vs ${nodes2}`);
  }
  if (edges1 !== edges2) {
    throw new Error(`Edge count changed: ${edges1} vs ${edges2}`);
  }
  console.log(`  PASS: structural unchanged (${nodes1} nodes, ${edges1} edges)`);
  return true;
}

function testPersistAndLoad() {
  console.log('=== Test: Reasoning output persisted and loadable ===');
  cleanRuntime();
  
  const result = runReasoning(PROJECT_DIR);
  const store = new Store();
  
  // Re-populate store with nodes/edges/truth from reasoning
  const model = result.store.serialize();
  for (const n of model.nodes || []) store.putNode(n);
  for (const e of model.edges || []) store.putEdge(e);
  for (const t of model.truth || []) store.putTruth(t);
  
  const saveResult = save(PROJECT_DIR, store, {}, {}, result.store.allTruth(), result.facts);
  if (!saveResult.committed) {
    throw new Error('Save failed');
  }
  
  const loaded = load(PROJECT_DIR);
  if (!loaded.exists) {
    throw new Error('Load failed');
  }
  if (!loaded.reasoning || loaded.reasoning.length === 0) {
    throw new Error('Reasoning not persisted');
  }
  
  const origFacts = canonical(result.facts);
  const loadedFacts = canonical(loaded.reasoning);
  if (origFacts !== loadedFacts) {
    throw new Error('Round-trip FAILED: reasoning facts mismatch');
  }
  
  console.log(`  PASS: ${loaded.reasoning.length} reasoning facts persisted and loadable`);
  return true;
}

function testCLIIntegration() {
  console.log('=== Test: CLI integration (reason command) ===');
  cleanRuntime();
  
  const cmd = `node "${CLI_PATH}" reason --project="${PROJECT_DIR}"`;
  const output = execSync(cmd, { encoding: 'utf-8', cwd: path.resolve(__dirname, '..') });
  const result = JSON.parse(output);
  
  if (!result.derived_facts || result.derived_facts < 5) {
    throw new Error(`CLI produced only ${result.derived_facts || 0} facts, expected at least 5`);
  }
  console.log(`  PASS: CLI produced ${result.derived_facts} derived facts`);
  return true;
}

function runAll() {
  console.log('\nReasoning Harness — S5 Reasoning Engines\n');
  const tests = [
    testAtLeastFiveFacts,
    testDeterminism,
    testEvidenceAndSourceRef,
    testDoesNotBreakStructural,
    testPersistAndLoad,
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

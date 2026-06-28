#!/usr/bin/env node
'use strict';
// CLI surface. The AI/operator interacts with the project ONLY through these commands;
// it never reads or edits the project directly. Commands: verify | reconstruct | impact | package.
const { canonical } = require('./util');
const orch = require('./orchestrator');
const { runValidationSuite } = require('./validation');
const { runConformanceSuite } = require('./ai-conformance');
const { save, load, roundTrip } = require('./persistence');
const { startSession, endSession } = require('./session');
const { generateHandoff } = require('./handoff-protocol');
const { Store } = require('./store');

function arg(flag, dflt) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : dflt;
}
const pos = process.argv.slice(3).filter(a => !a.startsWith('--'));
const opts = { projectDir: arg('--project', undefined), mission: arg('--mission', undefined), reason: arg('--reason', undefined) };

function main() {
  const cmd = process.argv[2];
  switch (cmd) {
    case 'verify': {
      const { kernel } = orch.reconstruct(opts);
      console.log(JSON.stringify({
        kernel_commit: kernel.lock.kernel_commit, kernel_path: kernel.kernelPath,
        verified: kernel.verified
      }, null, 2));
      break;
    }
    case 'reconstruct': {
      const r = orch.reconstruct(opts);
      console.log(JSON.stringify({
        project: r.projectDir,
        nodes: r.store.allNodes().length,
        edges: r.store.allEdges().length,
        truth: r.store.allTruth().length,
        model_coverage: r.modelCoverage.coverage,
        blindspots: r.modelCoverage.blindspots,
        gate: r.gate,
        unsupported: r.unsupported
      }, null, 2));
      break;
    }
    case 'impact': {
      const target = pos[0];
      if (!target) return fail('usage: runtime impact <nodeId>');
      const r = orch.impactReport(target, opts);
      console.log(JSON.stringify(r.impact, null, 2));
      break;
    }
    case 'package': {
      const target = pos[0];
      if (!target) return fail('usage: runtime package <nodeId>');
      const r = orch.executionPackage(target, opts);
      console.log(JSON.stringify(r.package, null, 2));
      break;
    }
    case 'validate': {
      const target = pos[0] || 'column:users.status';
      const r = runValidationSuite(target, opts);
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'conformance': {
      const target = pos[0] || 'column:users.status';
      const r = runConformanceSuite(target, opts);
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'persist': {
      const target = pos[0] || 'column:users.status';
      const mission = opts.mission || `modify ${target}`;
      const projectDir = opts.projectDir || orch.DEFAULT_PROJECT;

      // Run full pipeline with reasoning
      const r = orch.executionPackage(target, { ...opts, reasoning: true });

      // Start session
      const session = startSession(projectDir, mission, target);

      // Persist to git repo
      const persistResult = save(projectDir, r.store, r.impact, r.package, r.store.allTruth(), r.facts);

      // End session with summary
      const summary = {
        nodes: r.store.allNodes().length,
        edges: r.store.allEdges().length,
        truth: r.store.allTruth().length,
        derived_facts: r.facts ? r.facts.length : 0,
        coverage: r.modelCoverage.coverage,
        snapshot: r.package ? r.package.repository_snapshot : null
      };
      endSession(session.session_id, projectDir, r.gate.pass ? 'completed' : 'blocked', summary);

      // Generate handoff
      const handoff = generateHandoff(projectDir, session, r.store.serialize(), r.impact, r.package, r.gate);

      // Print results
      console.log(JSON.stringify({
        session: session.session_id,
        persisted: persistResult.committed,
        runtime_path: persistResult.runtimePath,
        snapshot: persistResult.snapshot,
        handoff: handoff.handoff_id,
        next_steps: handoff.next_steps,
        gate: r.gate
      }, null, 2));
      break;
    }
    case 'reason': {
      const r = orch.reason(opts);
      console.log(JSON.stringify({
        project: r.projectDir,
        nodes: r.store.allNodes().length,
        edges: r.store.allEdges().length,
        truth: r.store.allTruth().length,
        derived_facts: r.facts.length,
        facts: r.facts.map(f => ({
          type: f.inference_type,
          subject: f.subject,
          statement: f.statement,
          confidence: f.confidence
        })),
        model_coverage: r.modelCoverage.coverage,
        gate: r.gate
      }, null, 2));
      break;
    }
    case 'promote': {
      const { runTruthLifecycle, promoteTruth, evaluateTruth } = require('./truth');
      const truthId = pos[0];
      if (!truthId) return fail('usage: runtime promote <truthId>');
      const targetState = pos[1] || 'Published';
      const projectDir = opts.projectDir || orch.DEFAULT_PROJECT;

      const loaded = load(projectDir);
      const store = loaded.store || new Store();
      const truth = store.allTruth().find(t => t.id === truthId);
      if (!truth) return fail(`Truth not found: ${truthId}`);

      const evalResult = evaluateTruth(truth, store);
      const result = promoteTruth(truth, targetState, { store });

      if (result.success) {
        // Re-persist with updated truth
        save(projectDir, store, loaded.impact, loaded.package, store.allTruth(), loaded.reasoning);
      }

      console.log(JSON.stringify({
        truth_id: truthId,
        success: result.success,
        from: result.from,
        to: result.to,
        error: result.error || null,
        can_promote: evalResult.can_promote
      }, null, 2));
      break;
    }
    case 'invalidate': {
      const { invalidateTruth } = require('./truth');
      const truthId = pos[0];
      if (!truthId) return fail('usage: runtime invalidate <truthId> --reason="..."');
      const reason = opts.reason || 'No reason provided';
      const projectDir = opts.projectDir || orch.DEFAULT_PROJECT;

      const loaded = load(projectDir);
      const store = loaded.store || new Store();
      const truth = store.allTruth().find(t => t.id === truthId);
      if (!truth) return fail(`Truth not found: ${truthId}`);

      const result = invalidateTruth(truth, reason);

      if (result.success) {
        save(projectDir, store, loaded.impact, loaded.package, store.allTruth(), loaded.reasoning);
      }

      console.log(JSON.stringify({
        truth_id: truthId,
        success: result.success,
        from: result.from,
        to: result.to,
        reason: result.reason,
        error: result.error || null
      }, null, 2));
      break;
    }
    case 'truth': {
      const { getTruthStats, findContradictions } = require('./truth');
      const { gateTruthValid, gateTruthConsistent } = require('./gates');
      const projectDir = opts.projectDir || orch.DEFAULT_PROJECT;

      const loaded = load(projectDir);
      const store = loaded.store || new Store();
      const truths = store.allTruth();
      const stats = getTruthStats(store);
      const contradictions = findContradictions(truths);
      const gValid = gateTruthValid(truths);
      const gConsistent = gateTruthConsistent(truths);

      console.log(JSON.stringify({
        project: projectDir,
        total_truths: truths.length,
        stats,
        truths: truths.map(t => ({
          id: t.id,
          class: t.class,
          lifecycle: t.lifecycle,
          evidence_count: (t.evidence || []).length,
          statement: t.statement
        })),
        contradictions: contradictions.length,
        contradiction_details: contradictions,
        gates: {
          'G-TRUTH-VALID': gValid,
          'G-TRUTH-CONSISTENT': gConsistent
        }
      }, null, 2));
      break;
    }
    default:
      fail('commands: verify | reconstruct | impact <node> | package <node> | validate [node] | conformance [node] | persist [node] | reason [node] | promote <truthId> [targetState] | invalidate <truthId> | truth');
  }
}
function fail(m) { console.error(m); process.exit(1); }
main();

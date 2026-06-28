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

function arg(flag, dflt) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : dflt;
}
const pos = process.argv.slice(3).filter(a => !a.startsWith('--'));
const opts = { projectDir: arg('--project', undefined), mission: arg('--mission', undefined) };

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

      // Run full pipeline
      const r = orch.executionPackage(target, opts);

      // Start session
      const session = startSession(projectDir, mission, target);

      // Persist to git repo
      const persistResult = save(projectDir, r.store, r.impact, r.package, r.store.allTruth());

      // End session with summary
      const summary = {
        nodes: r.store.allNodes().length,
        edges: r.store.allEdges().length,
        truth: r.store.allTruth().length,
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
    default:
      fail('commands: verify | reconstruct | impact <node> | package <node> | validate [node] | conformance [node] | persist [node] | reason [node]');
  }
}
function fail(m) { console.error(m); process.exit(1); }
main();

#!/usr/bin/env node
'use strict';
// CLI surface. The AI/operator interacts with the project ONLY through these commands;
// it never reads or edits the project directly. Commands: verify | reconstruct | impact | package.
const { canonical } = require('./util');
const orch = require('./orchestrator');

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
    default:
      fail('commands: verify | reconstruct | impact <node> | package <node>');
  }
}
function fail(m) { console.error(m); process.exit(1); }
main();

'use strict';
// S2 — Formal AI-to-AI Resumption Protocol. Generates a machine-readable handoff
// document that the next AI can read to resume work without re-reading the
// original project source. Deterministic: canonical JSON, no timestamps.
const fs = require('fs');
const path = require('path');
const { canonical } = require('./util');
const { runtimeDir } = require('./persistence');

function handoffDir(projectDir) {
  return path.join(runtimeDir(projectDir), 'handoffs');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function generateHandoff(projectDir, session, model, impact, pkg, gate) {
  const dir = handoffDir(projectDir);
  ensureDir(dir);

  const handoff = {
    handoff_id: `handoff:${session.session_id}`,
    session_id: session.session_id,
    mission: session.mission,
    target: session.target,
    project_dir: session.project_dir,
    version: '0.1.0',
    protocol_version: '1.0',
    discovery: {
      nodes: model ? model.nodes.length : 0,
      edges: model ? model.edges.length : 0,
      truths: model ? model.truth.length : 0,
      coverage: pkg ? pkg.coverage : null,
      blindspots: pkg ? pkg.blindspots : [],
      snapshot: pkg ? pkg.repository_snapshot : null
    },
    impact: impact ? {
      target: impact.target,
      nodes: impact.nodes,
      count: impact.count
    } : null,
    gate: gate ? {
      gate: gate.gate,
      pass: gate.pass,
      blocking: gate.blocking,
      detail: gate.detail,
      remediation: gate.remediation || null
    } : null,
    next_steps: deriveNextSteps(session, gate, pkg)
  };

  const filePath = path.join(dir, `${handoff.handoff_id}.json`.replace(/:/g, '_'));
  fs.writeFileSync(filePath, canonical(handoff), 'utf8');

  return handoff;
}

function deriveNextSteps(session, gate, pkg) {
  const steps = [];

  if (!gate || gate.blocking) {
    steps.push({
      priority: 1,
      action: 'INVESTIGATE',
      description: `Gate ${gate ? gate.gate : 'unknown'} is blocking. Review remediation before proceeding.`,
      target: session.target
    });
  }

  if (pkg && pkg.blindspots && pkg.blindspots.length > 0) {
    steps.push({
      priority: 2,
      action: 'FILL_BLINDSPOTS',
      description: `Coverage is ${pkg.coverage}. Address blind spots: ${pkg.blindspots.join(', ')}`,
      target: session.target
    });
  }

  if (gate && gate.pass && !gate.blocking) {
    steps.push({
      priority: 1,
      action: 'PLAN',
      description: 'Reconstruction complete. Proceed to planning from the frozen Execution Package.',
      target: session.target
    });
  }

  steps.push({
    priority: 3,
    action: 'VERIFY',
    description: 'Run all three harnesses before making any changes.',
    target: 'all'
  });

  return steps.sort((a, b) => a.priority - b.priority);
}

function loadHandoff(projectDir) {
  const dir = handoffDir(projectDir);
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.json') && f.startsWith('handoff_'))
    .sort();

  if (files.length === 0) return null;

  const latestFile = files[files.length - 1];
  const filePath = path.join(dir, latestFile);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listHandoffs(projectDir) {
  const dir = handoffDir(projectDir);
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json') && f.startsWith('handoff_'))
    .sort()
    .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
}

module.exports = { generateHandoff, loadHandoff, listHandoffs };

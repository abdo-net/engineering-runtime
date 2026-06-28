'use strict';
// S2 — Git-File Persistence Layer. Writes the frozen engineering model to a
// sibling git repository so state survives reboots and another AI can resume work.
// Deterministic: canonical JSON, sorted keys, no timestamps, no volatile fields.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { canonical } = require('./util');
const { Store } = require('./store');

function runtimeDir(projectDir) {
  const base = path.basename(projectDir);
  return path.resolve(path.dirname(projectDir), `${base}-runtime`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function initGitRepo(runtimePath) {
  if (!fs.existsSync(path.join(runtimePath, '.git'))) {
    try {
      execSync('git init', { cwd: runtimePath, stdio: 'ignore' });
      execSync('git config user.email "runtime@engineering.local"', { cwd: runtimePath, stdio: 'ignore' });
      execSync('git config user.name "Engineering Runtime"', { cwd: runtimePath, stdio: 'ignore' });
    } catch (e) {
      throw new Error('E_GIT_NOT_AVAILABLE: git is required for persistence but not found or failed');
    }
  }
}

function gitCommit(runtimePath, message) {
  try {
    execSync('git add -A', { cwd: runtimePath, stdio: 'ignore' });
    execSync(`git commit -m "${message}" --allow-empty`, { cwd: runtimePath, stdio: 'ignore' });
  } catch (e) {
    // No changes to commit is OK
  }
}

function gitTag(runtimePath, tag) {
  try {
    execSync(`git tag -f "${tag}"`, { cwd: runtimePath, stdio: 'ignore' });
  } catch (e) {
    // Tag may already exist
  }
}

function save(projectDir, store, impact, pkg, truth, facts) {
  const runtimePath = runtimeDir(projectDir);
  ensureDir(runtimePath);
  ensureDir(path.join(runtimePath, 'sessions'));
  ensureDir(path.join(runtimePath, 'mediation'));
  ensureDir(path.join(runtimePath, 'handoffs'));
  ensureDir(path.join(runtimePath, 'plans'));

  initGitRepo(runtimePath);

  const model = store.serialize();
  const snapshot = pkg ? pkg.repository_snapshot : null;

  const artifacts = {
    model: canonical(model),
    impact: canonical(impact),
    package: canonical(pkg),
    truth: canonical(truth ? [...truth.values()] : store.allTruth()),
    reasoning: canonical(facts || []),
    snapshot: snapshot || 'no-package',
    version: '0.1.0',
    protocol_version: '1.0'
  };

  // Write each artifact as canonical JSON string (deterministic, no timestamps)
  for (const [key, value] of Object.entries(artifacts)) {
    const filePath = path.join(runtimePath, `${key}.json`);
    fs.writeFileSync(filePath, value, 'utf8');
  }

  const msg = snapshot
    ? `Runtime snapshot: ${snapshot}`
    : 'Runtime model persisted';
  gitCommit(runtimePath, msg);

  if (snapshot) {
    gitTag(runtimePath, `snapshot-${snapshot.slice(0, 16)}`);
  }

  return { runtimePath, snapshot, committed: true };
}

function load(projectDir) {
  const runtimePath = runtimeDir(projectDir);
  if (!fs.existsSync(runtimePath)) {
    return { store: null, impact: null, package: null, truth: null, snapshot: null, exists: false };
  }

  const readFile = (name) => {
    const p = path.join(runtimePath, `${name}.json`);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  };

  const modelStr = readFile('model');
  const impactStr = readFile('impact');
  const pkgStr = readFile('package');
  const truthStr = readFile('truth');
  const snapshotStr = readFile('snapshot');

  const store = new Store();
  if (modelStr) {
    const model = JSON.parse(modelStr);
    for (const n of model.nodes || []) store.putNode(n);
    for (const e of model.edges || []) store.putEdge(e);
    for (const t of model.truth || []) store.putTruth(t);
  }

  const impact = impactStr ? JSON.parse(impactStr) : null;
  const pkg = pkgStr && pkgStr !== 'no-package' ? JSON.parse(pkgStr) : null;
  const truth = truthStr ? JSON.parse(truthStr) : null;
  const snapshot = snapshotStr && snapshotStr !== 'no-package' ? snapshotStr : null;
  const reasoningStr = readFile('reasoning');
  const reasoning = reasoningStr ? JSON.parse(reasoningStr) : null;

  return { store, impact, package: pkg, truth, reasoning, snapshot, exists: true, runtimePath };
}

function roundTrip(projectDir, store, impact, pkg, truth, facts) {
  const saveResult = save(projectDir, store, impact, pkg, truth, facts);
  const loadResult = load(projectDir);
  if (!loadResult.exists) throw new Error('E_PERSISTENCE_FAILED: load returned empty after save');

  const origModel = canonical(store.serialize());
  const loadedModel = canonical(loadResult.store.serialize());
  const match = origModel === loadedModel;

  return { saveResult, loadResult, match };
}

module.exports = { save, load, roundTrip, runtimeDir };

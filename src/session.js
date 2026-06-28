'use strict';
// S2 — Session State Tracking. Records what an AI session did, discovered, and
// blocked on, so another AI can resume without re-reading the original source.
// Deterministic: canonical JSON, no timestamps, no volatile fields.
const fs = require('fs');
const path = require('path');
const { canonical } = require('./util');
const { runtimeDir } = require('./persistence');

function sessionDir(projectDir) {
  return path.join(runtimeDir(projectDir), 'sessions');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function deriveSessionId(projectDir, mission, target) {
  // Deterministic: same inputs → same session id
  const base = `${path.basename(projectDir)}:${mission}:${target}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = ((hash << 5) - hash) + base.charCodeAt(i);
    hash |= 0;
  }
  return `session:${Math.abs(hash).toString(16)}`;
}

function startSession(projectDir, mission, target) {
  const dir = sessionDir(projectDir);
  ensureDir(dir);

  const sessionId = deriveSessionId(projectDir, mission, target);
  const session = {
    session_id: sessionId,
    project_dir: path.resolve(projectDir),
    mission,
    target,
    status: 'active',
    started_at: null, // Deterministic: no timestamps
    version: '0.1.0',
    protocol_version: '1.0'
  };

  const filePath = path.join(dir, `${sessionId.replace(/:/g, '_')}.json`);
  fs.writeFileSync(filePath, canonical(session), 'utf8');

  return session;
}

function endSession(sessionId, projectDir, status = 'completed', summary = {}) {
  const dir = sessionDir(projectDir);
  const filePath = path.join(dir, `${sessionId.replace(/:/g, '_')}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`E_SESSION_NOT_FOUND: ${sessionId}`);
  }

  const session = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  session.status = status;
  session.summary = summary;

  fs.writeFileSync(filePath, canonical(session), 'utf8');
  return session;
}

function resumeSession(projectDir) {
  const dir = sessionDir(projectDir);
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.json') && f.startsWith('session_'))
    .sort();

  if (files.length === 0) return null;

  // Load the most recent session (deterministic: alphabetical order of ids)
  const latestFile = files[files.length - 1];
  const filePath = path.join(dir, latestFile);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listSessions(projectDir) {
  const dir = sessionDir(projectDir);
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json') && f.startsWith('session_'))
    .sort()
    .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
}

module.exports = { startSession, endSession, resumeSession, listSessions, deriveSessionId };

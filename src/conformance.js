'use strict';
// AI Conformance Validator. The Runtime treats every external AI as untrusted: it
// validates the AI Output Package as an artifact, structurally and against the
// project's own source files — never by reading or trusting natural-language
// explanations. Any check failing produces a fixed, machine-readable rejection
// reason (src/protocol.js REJECTION_REASONS); the AI is never the source of truth.
const fs = require('fs');
const path = require('path');
const { readAllowedFile, TRUTH_CLASSES } = require('./protocol');

function reject(code, detail) { return { code, detail }; }

// 1. Structural contract — required fields and types only. Fails fast: a
// structurally invalid package is rejected before any semantic check runs.
function verifySchema(output) {
  const errors = [];
  const req = ['protocol_version', 'session_id', 'worker_id', 'mission', 'target', 'stage', 'claims', 'impact_closure', 'coverage_self_report'];
  for (const k of req) if (!(k in output)) errors.push(`missing field: ${k}`);
  if (errors.length) return errors;
  if (!output.claims || typeof output.claims !== 'object') errors.push('claims must be an object');
  else {
    for (const k of ['nodes', 'edges', 'truth']) {
      if (!Array.isArray(output.claims[k])) errors.push(`claims.${k} must be an array`);
    }
  }
  if (Array.isArray(output.claims && output.claims.nodes)) {
    output.claims.nodes.forEach((n, i) => {
      for (const k of ['id', 'class', 'name', 'source_ref', 'evidence_quote']) {
        if (typeof n[k] !== 'string') errors.push(`claims.nodes[${i}].${k} must be a string`);
      }
    });
  }
  if (Array.isArray(output.claims && output.claims.edges)) {
    output.claims.edges.forEach((e, i) => {
      for (const k of ['id', 'type', 'from', 'to', 'source_ref', 'evidence_quote']) {
        if (typeof e[k] !== 'string') errors.push(`claims.edges[${i}].${k} must be a string`);
      }
    });
  }
  if (Array.isArray(output.claims && output.claims.truth)) {
    output.claims.truth.forEach((t, i) => {
      if (typeof t.id !== 'string') errors.push(`claims.truth[${i}].id must be a string`);
      if (typeof t.statement !== 'string') errors.push(`claims.truth[${i}].statement must be a string`);
      if (!TRUTH_CLASSES.includes(t.class)) errors.push(`claims.truth[${i}].class invalid`);
      if (!Array.isArray(t.evidence)) errors.push(`claims.truth[${i}].evidence must be an array`);
    });
  }
  if (!output.impact_closure || !Array.isArray(output.impact_closure.nodes)) errors.push('impact_closure.nodes must be an array');
  if (!output.coverage_self_report || typeof output.coverage_self_report.coverage !== 'number') errors.push('coverage_self_report.coverage must be a number');
  return errors;
}

// 2. Contract conformance — the AI must echo back exactly what was requested.
// Returning a different target/mission/stage/protocol_version is treated as
// ignoring instructions, not as a creative reinterpretation.
function verifyContract(output, input) {
  const v = [];
  if (output.protocol_version !== input.protocol_version) v.push(reject('CONTRACT_VIOLATION', 'protocol_version mismatch'));
  if (output.target !== input.target) v.push(reject('CONTRACT_VIOLATION', 'target mismatch'));
  if (output.mission !== input.mission) v.push(reject('CONTRACT_VIOLATION', 'mission mismatch'));
  if (output.stage !== input.stage) v.push(reject('CONTRACT_VIOLATION', 'stage mismatch'));
  return v;
}

// 3/4. Mandatory evidence — every claim must cite a file inside allowed_reads, and
// the evidence_quote must be a literal substring of that actual file AND contain
// the claimed name. This is mechanical string containment, never interpretation.
function verifyEvidence(output, projectDir, allowedReads) {
  const v = [];
  const checkClaim = (claim, kind, nameCheck) => {
    if (!allowedReads.includes(claim.source_ref)) {
      v.push({ ...reject('READ_OUTSIDE_ALLOWED', `${kind} ${claim.id} cites ${claim.source_ref}`), id: claim.id, kind });
      return false;
    }
    const { ok, content } = readAllowedFile(projectDir, allowedReads, claim.source_ref);
    if (!ok || !content.includes(claim.evidence_quote)) {
      v.push({ ...reject('EVIDENCE_NOT_VERIFIABLE', `${kind} ${claim.id}: evidence_quote not found in ${claim.source_ref}`), id: claim.id, kind });
      return false;
    }
    if (!nameCheck(claim)) {
      v.push({ ...reject('EVIDENCE_NAME_MISMATCH', `${kind} ${claim.id}: evidence_quote does not contain claimed name`), id: claim.id, kind });
      return false;
    }
    return true;
  };
  for (const n of output.claims.nodes) {
    const coreToken = n.name.includes('.') ? n.name.split('.').pop() : n.name;
    checkClaim(n, 'node', c => c.evidence_quote.includes(coreToken));
  }
  for (const e of output.claims.edges) checkClaim(e, 'edge', () => true);
  for (const t of output.claims.truth) {
    if (!t.evidence.length) { v.push({ ...reject('MISSING_EVIDENCE', `truth ${t.id} has no evidence`), id: t.id, kind: 'truth' }); continue; }
    for (const ref of t.evidence) {
      if (!allowedReads.includes(ref)) v.push({ ...reject('READ_OUTSIDE_ALLOWED', `truth ${t.id} cites ${ref}`), id: t.id, kind: 'truth' });
    }
  }
  return v;
}

// 5/9. Reconstruction + contract: a claim whose evidence check failed is, by
// definition, unsupported — re-tagged here so UNSUPPORTED_NODE/EDGE appear
// alongside the underlying EVIDENCE_* reason rather than replacing it.
function tagUnsupported(evidenceViolations) {
  const v = [];
  for (const x of evidenceViolations) {
    if (x.kind === 'node') v.push(reject('UNSUPPORTED_NODE', x.id));
    if (x.kind === 'edge') v.push(reject('UNSUPPORTED_EDGE', x.id));
  }
  return v;
}

// 7. Impact verification — the AI's claimed closure must be at least as large as
// the Runtime's own deterministic floor. Under-claiming impact silently hides
// affected components; that is worse than over-claiming and is rejected outright.
function verifyImpact(output, groundTruthImpact) {
  const claimed = new Set(output.impact_closure.nodes);
  const missing = groundTruthImpact.nodes.filter(id => !claimed.has(id));
  if (missing.length) return [reject('IMPACT_UNDERCLAIM', `missing: ${missing.join(', ')}`)];
  return [];
}

// 6. Constraint verification — proposed edits must stay inside the Execution
// Package's allowed_scope; anything else is "modify files outside scope."
function verifyScope(output, executionPackage) {
  const v = [];
  const scope = new Set(executionPackage.allowed_scope);
  for (const edit of output.proposed_edits || []) {
    if (!scope.has(edit.file)) v.push(reject('SCOPE_VIOLATION', edit.file));
  }
  return v;
}

// Coverage self-report must match what the AI's own submitted claims actually
// support — a mismatch means analysis was skipped or coverage was misreported.
function verifyCoverageClaim(output, ontology) {
  const present = new Set(output.claims.nodes.map(n => n.class));
  const expected = ontology.impact_classes;
  const covered = expected.filter(c => present.has(c));
  const recomputed = expected.length ? +(covered.length / expected.length).toFixed(3) : 1;
  if (output.coverage_self_report.coverage !== recomputed) {
    return [reject('COVERAGE_MISCLAIM', `claimed ${output.coverage_self_report.coverage}, recomputed ${recomputed}`)];
  }
  return [];
}

// Full evaluation. Schema failure short-circuits everything else — a structurally
// invalid package is rejected without any semantic interpretation being attempted.
function evaluate(output, ctx) {
  const schemaErrors = verifySchema(output);
  if (schemaErrors.length) {
    return {
      worker_id: output.worker_id || 'unknown', accepted: false,
      rejections: schemaErrors.map(e => reject('SCHEMA_INVALID', e))
    };
  }
  const evidenceViolations = verifyEvidence(output, ctx.projectDir, ctx.input.allowed_reads);
  const rejections = [
    ...verifyContract(output, ctx.input),
    ...evidenceViolations,
    ...tagUnsupported(evidenceViolations),
    ...verifyImpact(output, ctx.groundTruth.impact),
    ...verifyScope(output, ctx.groundTruth.package),
    ...verifyCoverageClaim(output, ctx.ontology)
  ];
  return { worker_id: output.worker_id, accepted: rejections.length === 0, rejections };
}

module.exports = { evaluate, verifySchema, verifyContract, verifyEvidence, verifyImpact, verifyScope, verifyCoverageClaim };

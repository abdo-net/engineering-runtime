'use strict';
// AI Conformance Protocol. Defines exactly what the Runtime sends to an AI worker
// (AI Input Package) and the fixed rejection-reason taxonomy the Runtime uses to
// accept or reject what comes back. The Runtime never reads natural-language
// explanations — every rejection reason here is structural/mechanical.
const fs = require('fs');
const path = require('path');

const PROTOCOL_VERSION = '1.0';

const REJECTION_REASONS = Object.freeze({
  SCHEMA_INVALID: 'output does not conform to the AI Output Package schema',
  CONTRACT_VIOLATION: 'output target/mission/stage/protocol_version does not match the request',
  READ_OUTSIDE_ALLOWED: 'a claim cites a source_ref outside allowed_reads',
  MISSING_EVIDENCE: 'a claim has no evidence / empty evidence array',
  EVIDENCE_NOT_VERIFIABLE: 'cited evidence_quote does not appear in the cited source_ref file',
  EVIDENCE_NAME_MISMATCH: 'evidence_quote does not contain the claimed name/identifier',
  UNSUPPORTED_NODE: 'node claim could not be independently verified against project sources',
  UNSUPPORTED_EDGE: 'edge claim could not be independently verified against project sources',
  SCOPE_VIOLATION: 'a proposed edit targets a file outside the Execution Package allowed_scope',
  IMPACT_UNDERCLAIM: 'claimed impact closure omits nodes the Runtime requires as a deterministic floor',
  COVERAGE_MISCLAIM: 'self-reported coverage is inconsistent with the claims actually submitted',
  TRUTH_CLASS_INVALID: 'truth claim uses a class outside the fixed Engineering Truth enum'
});

const TRUTH_CLASSES = Object.freeze(['DIRECT_OBSERVATION', 'VERIFIED_FACT', 'DERIVED_FACT', 'HYPOTHESIS']);

// AI Input Package — exactly what is sent to the model. Deterministic: built only
// from the Kernel-pinned ontology and the project's own file listing, never from
// conversation history.
function buildInputPackage(target, mission, projectDir, ontology, opts = {}) {
  const allowed_reads = fs.readdirSync(projectDir).sort();
  return {
    protocol_version: PROTOCOL_VERSION,
    session_id: opts.sessionId || `session:${target}`,
    mission, target,
    stage: 'RECONSTRUCT_AND_PACKAGE',
    allowed_reads,
    ontology: {
      node_classes: ontology.node_classes,
      edge_types: ontology.edge_types.map(e => ({ type: e.type, from: e.from, to: e.to, propagates: e.propagates })),
      impact_classes: ontology.impact_classes
    },
    node_id_scheme: 'id = "<lowercase class prefix>:<name>", derived only from text literally present in a file listed in allowed_reads (e.g. column:<table>.<col>, entity:<Name>, field:<Entity>.<field>, repository:<Name>, service:<Name>, controller:<Name>, endpoint:<METHOD> <path>, openapi:<path>)',
    evidence_requirement: 'every node/edge/truth claim MUST cite source_ref drawn from allowed_reads and an evidence_quote that is a literal substring of that file and contains the claimed name',
    output_schema_ref: 'spec/schemas/ai-output-package.schema.json',
    rejection_reasons: REJECTION_REASONS,
    deadline_ms: opts.deadlineMs || 30000
  };
}

function readAllowedFile(projectDir, allowedReads, sourceRef) {
  if (!allowedReads.includes(sourceRef)) return { ok: false, content: null };
  const p = path.join(projectDir, sourceRef);
  if (!fs.existsSync(p)) return { ok: false, content: null };
  return { ok: true, content: fs.readFileSync(p, 'utf8') };
}

module.exports = { PROTOCOL_VERSION, REJECTION_REASONS, TRUTH_CLASSES, buildInputPackage, readAllowedFile };

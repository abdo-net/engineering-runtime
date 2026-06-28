'use strict';
// Runtime Validation framework. Validates an AI worker's submission against the
// ground-truth reconstruction, independent of which vendor produced it. Two duties:
// (1) automatic rejection of unsupported or misreported submissions (Q6/Q7),
// (2) measured convergence between submission and ground truth (Q1-Q5/Q9).
// Equivalence is checked as SETS keyed by the Runtime's deterministic id scheme, not
// by literal text — vendor-specific ordering or phrasing must not affect the verdict.

function setOf(arr) { return new Set(arr); }

function jaccard(a, b) {
  const A = setOf(a), B = setOf(b);
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 1 : +(inter / union).toFixed(4);
}

function diffSets(gt, sub) {
  const A = setOf(gt), B = setOf(sub);
  return {
    missing: [...A].filter(x => !B.has(x)).sort(), // present in ground truth, absent from submission
    extra: [...B].filter(x => !A.has(x)).sort()     // present in submission, absent from ground truth
  };
}

// Q6/Q7 — a submission node/edge is supported only if a ground-truth node/edge with
// the same id (and, for nodes, the same source_ref) actually exists. Anything else
// was fabricated — guessed rather than observed.
function checkUnsupported(submission, groundTruthStore) {
  const violations = [];
  for (const n of submission.model.nodes) {
    const gt = groundTruthStore.getNode(n.id);
    if (!gt || gt.source_ref !== n.source_ref) {
      violations.push({ type: 'UNSUPPORTED_NODE', id: n.id, source_ref: n.source_ref });
    }
  }
  const gtEdgeIds = new Set(groundTruthStore.allEdges().map(e => e.id));
  for (const e of submission.model.edges) {
    if (!gtEdgeIds.has(e.id)) violations.push({ type: 'UNSUPPORTED_EDGE', id: e.id });
  }
  return violations;
}

// Q6/Q8 — a submission that proceeded to packaging must report a coverage figure
// consistent with what its OWN submitted model actually supports. A mismatch means
// analysis was skipped (or misreported) after the fact rather than honestly recorded
// as a blind spot.
function checkSkippedAnalysis(submission, ontology) {
  const violations = [];
  if (!submission.package || submission.package.coverage === undefined) return violations;
  const presentClasses = setOf(submission.model.nodes.map(n => n.class));
  const expected = ontology.impact_classes;
  const covered = expected.filter(c => presentClasses.has(c));
  const recomputed = expected.length ? +(covered.length / expected.length).toFixed(3) : 1;
  if (submission.package.coverage !== recomputed) {
    violations.push({
      type: 'SKIPPED_ANALYSIS', recomputed_coverage: recomputed,
      claimed_coverage: submission.package.coverage,
      detail: 'package claims a coverage value inconsistent with its own submitted model'
    });
  }
  return violations;
}

// Q1-Q5/Q9 — measured convergence between a submission and ground truth, per layer.
function convergence(submission, groundTruth) {
  const gtNodeIds = groundTruth.store.allNodes().map(n => n.id);
  const subNodeIds = submission.model.nodes.map(n => n.id);
  const gtEdgeIds = groundTruth.store.allEdges().map(e => e.id);
  const subEdgeIds = submission.model.edges.map(e => e.id);
  const gtTruthKeys = groundTruth.store.allTruth().map(t => `${t.id}|${t.statement}`);
  const subTruthKeys = submission.model.truth.map(t => `${t.id}|${t.statement}`);
  const gtImpact = groundTruth.impact.nodes;
  const subImpact = submission.impact ? submission.impact.nodes : [];

  let pkg = null;
  if (submission.package && groundTruth.package) {
    pkg = {
      allowed_scope: jaccard(groundTruth.package.allowed_scope, submission.package.allowed_scope || []),
      gating_truth: jaccard(groundTruth.package.gating_truth, submission.package.gating_truth || []),
      coverage_match: groundTruth.package.coverage === submission.package.coverage
    };
  }

  return {
    topology: jaccard(gtNodeIds, subNodeIds),
    knowledgeGraph: jaccard([...gtNodeIds, ...gtEdgeIds], [...subNodeIds, ...subEdgeIds]),
    truth: jaccard(gtTruthKeys, subTruthKeys),
    impactGraph: jaccard(gtImpact, subImpact),
    package: pkg,
    node_diff: diffSets(gtNodeIds, subNodeIds),
    edge_diff: diffSets(gtEdgeIds, subEdgeIds),
    impact_diff: diffSets(gtImpact, subImpact)
  };
}

function validateSubmission(submission, groundTruth, ontology) {
  const violations = [
    ...checkUnsupported(submission, groundTruth.store),
    ...checkSkippedAnalysis(submission, ontology)
  ];
  return {
    worker_id: submission.worker_id, vendor_class: submission.vendor_class,
    accepted: violations.length === 0,
    violations,
    convergence: convergence(submission, groundTruth)
  };
}

module.exports = { validateSubmission, convergence, checkUnsupported, checkSkippedAnalysis, jaccard };

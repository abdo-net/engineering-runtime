'use strict';
// S7 — Truth Lifecycle Engine. Manages transitions of truth records through
// their lifecycle states: Observed → Documented → Validated → Published →
// Challenged → Corrected → Archived. Validates promotion criteria, detects
// contradictions, and merges truth records. Deterministic. No AI calls.

const { canonical } = require('./util');

// Valid lifecycle states and their order
const LIFECYCLE_ORDER = [
  'Observed', 'Documented', 'Validated', 'Published', 'Challenged', 'Corrected', 'Archived'
];

const LIFECYCLE_INDEX = Object.fromEntries(LIFECYCLE_ORDER.map((s, i) => [s, i]));

// Promotion criteria for each transition
const PROMOTION_CRITERIA = {
  'Observed→Documented': (t) => t.statement && t.statement.length > 0 && t.evidence && t.evidence.length >= 1,
  'Documented→Validated': (t) => t.evidence && t.evidence.length >= 2,
  'Validated→Published': (t) => {
    // All dependencies must be at least Validated
    const deps = t.dependencies || [];
    if (deps.length === 0) return true; // no dependencies to check
    // We need a store to check dependencies — this is handled in evaluateTruth
    return true; // placeholder, checked in evaluateTruth with store context
  },
  'Published→Challenged': (t, reason) => !!reason && reason.length > 0,
  'Challenged→Corrected': (t, newEvidence) => newEvidence && newEvidence.length > 0,
  'Any→Archived': () => true
};

function getCurrentState(truth) {
  return truth.lifecycle || 'Observed';
}

function canPromoteTo(truth, targetState, context = {}) {
  const current = getCurrentState(truth);
  const currentIdx = LIFECYCLE_INDEX[current];
  const targetIdx = LIFECYCLE_INDEX[targetState];

  if (targetIdx === undefined) return false;
  if (currentIdx === undefined) return false;

  // Can only promote forward (or to Archived from any state)
  if (targetState === 'Archived') return true;
  if (targetIdx <= currentIdx) return false;

  // Check criteria for each step
  const steps = [];
  for (let i = currentIdx; i < targetIdx; i++) {
    const from = LIFECYCLE_ORDER[i];
    const to = LIFECYCLE_ORDER[i + 1];
    steps.push(`${from}→${to}`);
  }

  for (const step of steps) {
    const criteria = PROMOTION_CRITERIA[step];
    if (criteria && !criteria(truth, context.reason, context.newEvidence)) {
      return false;
    }
  }

  // For Validated→Published, check dependencies
  if (targetState === 'Published' || (currentIdx < LIFECYCLE_INDEX['Published'] && targetIdx >= LIFECYCLE_INDEX['Published'])) {
    const deps = truth.dependencies || [];
    if (deps.length > 0 && context.store) {
      for (const depId of deps) {
        const dep = context.store.allTruth().find(t => t.id === depId);
        if (!dep) return false;
        const depState = getCurrentState(dep);
        const depIdx = LIFECYCLE_INDEX[depState] || 0;
        if (depIdx < LIFECYCLE_INDEX['Validated']) {
          return false; // dependency not yet validated
        }
      }
    }
  }

  return true;
}

function evaluateTruth(truth, store, context = {}) {
  const current = getCurrentState(truth);
  const result = {
    truth_id: truth.id,
    current_state: current,
    can_promote: {},
    next_state: null,
    blockers: []
  };

  // Check what states this truth can be promoted to
  for (const state of LIFECYCLE_ORDER) {
    if (state === current) continue;
    const can = canPromoteTo(truth, state, { ...context, store });
    result.can_promote[state] = can;
    if (can && result.next_state === null) {
      // Find the immediate next promotable state
      const currentIdx = LIFECYCLE_INDEX[current];
      const targetIdx = LIFECYCLE_INDEX[state];
      if (targetIdx === currentIdx + 1) {
        result.next_state = state;
      }
    }
  }

  // If next state is not immediately reachable, find the first reachable state
  if (result.next_state === null) {
    for (const state of LIFECYCLE_ORDER) {
      const targetIdx = LIFECYCLE_INDEX[state];
      const currentIdx = LIFECYCLE_INDEX[current];
      if (targetIdx > currentIdx && result.can_promote[state]) {
        result.next_state = state;
        break;
      }
    }
  }

  // Build blockers list
  if (!result.can_promote['Documented'] && current === 'Observed') {
    result.blockers.push({ state: 'Documented', reason: 'Insufficient evidence: need ≥ 1 source' });
  }
  if (!result.can_promote['Validated'] && (current === 'Observed' || current === 'Documented')) {
    result.blockers.push({ state: 'Validated', reason: 'Insufficient evidence: need ≥ 2 independent sources' });
  }
  if (!result.can_promote['Published'] && (current === 'Observed' || current === 'Documented' || current === 'Validated')) {
    const deps = truth.dependencies || [];
    if (deps.length > 0) {
      result.blockers.push({ state: 'Published', reason: 'Dependencies not all Validated' });
    } else {
      result.blockers.push({ state: 'Published', reason: 'Unknown blocker' });
    }
  }

  return result;
}

function promoteTruth(truth, targetState, context = {}) {
  const current = getCurrentState(truth);
  if (!canPromoteTo(truth, targetState, context)) {
    return {
      success: false,
      truth_id: truth.id,
      from: current,
      to: targetState,
      error: `Cannot promote from ${current} to ${targetState}: criteria not met`
    };
  }

  const oldState = truth.lifecycle;
  truth.lifecycle = targetState;

  return {
    success: true,
    truth_id: truth.id,
    from: oldState,
    to: targetState,
    timestamp: null // deterministic: no timestamps
  };
}

function invalidateTruth(truth, reason, context = {}) {
  if (!reason || reason.length === 0) {
    return {
      success: false,
      truth_id: truth.id,
      error: 'Invalidation requires a reason'
    };
  }

  const oldState = truth.lifecycle;
  truth.lifecycle = 'Challenged';
  truth.invalidation_reason = reason;

  return {
    success: true,
    truth_id: truth.id,
    from: oldState,
    to: 'Challenged',
    reason
  };
}

function archiveTruth(truth, reason) {
  const oldState = truth.lifecycle;
  truth.lifecycle = 'Archived';
  truth.archive_reason = reason || 'Explicit archival';

  return {
    success: true,
    truth_id: truth.id,
    from: oldState,
    to: 'Archived',
    reason: truth.archive_reason
  };
}

function mergeTruth(truthA, truthB) {
  // Merge two truths with the same subject, keeping higher-confidence evidence
  // and the more advanced lifecycle state
  const stateA = getCurrentState(truthA);
  const stateB = getCurrentState(truthB);
  const idxA = LIFECYCLE_INDEX[stateA] || 0;
  const idxB = LIFECYCLE_INDEX[stateB] || 0;

  const merged = {
    id: truthA.id, // keep A's ID
    statement: truthA.statement || truthB.statement,
    class: truthA.class || truthB.class,
    source_authority: truthA.source_authority || truthB.source_authority,
    evidence: [...new Set([...(truthA.evidence || []), ...(truthB.evidence || [])])].sort(),
    dependencies: [...new Set([...(truthA.dependencies || []), ...(truthB.dependencies || [])])].sort(),
    lifecycle: idxA >= idxB ? stateA : stateB,
    merged_from: [truthA.id, truthB.id]
  };

  // Keep additional fields from the more advanced truth
  if (truthA.invalidation_reason) merged.invalidation_reason = truthA.invalidation_reason;
  if (truthB.invalidation_reason) merged.invalidation_reason = truthB.invalidation_reason;
  if (truthA.archive_reason) merged.archive_reason = truthA.archive_reason;
  if (truthB.archive_reason) merged.archive_reason = truthB.archive_reason;

  return merged;
}

function findContradictions(truths) {
  // Two truths contradict if they share the same subject (or same subject field)
  // but have different statements that are negations of each other.
  // For simplicity: same subject, same class, different statements = potential contradiction
  const contradictions = [];
  const truthList = Array.isArray(truths) ? truths : Object.values(truths);

  for (let i = 0; i < truthList.length; i++) {
    for (let j = i + 1; j < truthList.length; j++) {
      const a = truthList[i];
      const b = truthList[j];

      // Only check Published truths (exactly Published, not Challenged or Corrected)
      const stateA = getCurrentState(a);
      const stateB = getCurrentState(b);
      if (stateA !== 'Published' || stateB !== 'Published') continue;

      // Check if same subject
      const subjectA = a.subject || a.id;
      const subjectB = b.subject || b.id;
      if (subjectA !== subjectB) continue;

      // Check if statements are different (potential contradiction)
      if (a.statement === b.statement) continue; // same statement, no contradiction

      // Check if one is a negation of the other
      const stmtA = (a.statement || '').toLowerCase();
      const stmtB = (b.statement || '').toLowerCase();
      const negations = ['not ', 'no ', 'never ', 'false', 'invalid', 'missing', 'absent'];
      const aNegated = negations.some(n => stmtA.includes(n));
      const bNegated = negations.some(n => stmtB.includes(n));

      if (aNegated !== bNegated) {
        // One is negated, the other is not — definite contradiction
        contradictions.push({
          truth_a: a.id,
          truth_b: b.id,
          subject: subjectA,
          statement_a: a.statement,
          statement_b: b.statement,
          severity: 'definite'
        });
      } else if (stmtA !== stmtB) {
        // Different statements, same polarity — potential contradiction
        contradictions.push({
          truth_a: a.id,
          truth_b: b.id,
          subject: subjectA,
          statement_a: a.statement,
          statement_b: b.statement,
          severity: 'potential'
        });
      }
    }
  }

  return contradictions;
}

function buildTruthLifecycle(store, opts = {}) {
  const truths = store.allTruth();
  const results = [];

  // Auto-promote truths where eligible
  for (const truth of truths) {
    const evalResult = evaluateTruth(truth, store);
    if (evalResult.next_state && opts.autoPromote !== false) {
      const promoteResult = promoteTruth(truth, evalResult.next_state, { store });
      results.push(promoteResult);
    }
  }

  return {
    promotions: results.filter(r => r.success),
    failures: results.filter(r => !r.success),
    total_processed: truths.length
  };
}

function getTruthStats(store) {
  const truths = store.allTruth();
  const stats = {};
  for (const state of LIFECYCLE_ORDER) {
    stats[state] = truths.filter(t => getCurrentState(t) === state).length;
  }
  stats.total = truths.length;
  return stats;
}

function runTruthLifecycle(projectDir, opts = {}) {
  const { load } = require('./persistence');
  const { Store } = require('./store');

  const loaded = load(projectDir);
  const store = loaded.store || new Store();

  const result = buildTruthLifecycle(store, opts);
  const contradictions = findContradictions(store.allTruth());
  const stats = getTruthStats(store);

  return { result, contradictions, stats, store };
}

module.exports = {
  evaluateTruth,
  promoteTruth,
  invalidateTruth,
  archiveTruth,
  mergeTruth,
  findContradictions,
  buildTruthLifecycle,
  getTruthStats,
  runTruthLifecycle,
  LIFECYCLE_ORDER,
  LIFECYCLE_INDEX
};

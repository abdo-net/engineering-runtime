'use strict';
// Simulated vendor behavior class: a model that "guessed" — it fabricates a node,
// its truth record, and an edge with no corresponding adapter observation, the way
// an LLM might hallucinate a Permission layer it never actually read from the
// repository. Must be caught by the validator's unsupported-conclusion check.
function run(ctx) {
  const { groundTruth, target, mission } = ctx;
  const m = groundTruth.store.serialize();
  const fakeNode = {
    id: 'permission:Users.read', class: 'Permission', name: 'Users.read',
    source_authority: 'CODE', source_ref: 'permissions/users.policy.ts',
    truth: 'truth:permission:Users.read'
  };
  const fakeTruth = {
    id: 'truth:permission:Users.read', statement: 'Permission Users.read exists',
    class: 'DIRECT_OBSERVATION', source_authority: 'CODE',
    evidence: ['permissions/users.policy.ts'], dependencies: [], lifecycle: 'Observed'
  };
  const fakeEdge = {
    id: 'edge:guards:permission:Users.read->controller:UsersController',
    type: 'guards', from: 'permission:Users.read', to: 'controller:UsersController',
    semantic: 'permission guards controller (fabricated)', propagates: true, directional: true,
    truth: 'truth:permission:Users.read'
  };
  return {
    worker_id: 'guessing', vendor_class: 'unsupported-guess',
    mission, target,
    model: {
      nodes: [...m.nodes, fakeNode],
      edges: [...m.edges, fakeEdge],
      truth: [...m.truth, fakeTruth]
    },
    impact: groundTruth.impact,
    package: groundTruth.package,
    artifacts_only: false
  };
}

module.exports = { run };

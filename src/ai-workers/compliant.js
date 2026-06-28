'use strict';
// A fully compliant AI worker: every claim cites a real file and a literal quote
// drawn from it, the impact closure matches the deterministic floor exactly, and
// coverage is self-reported honestly. Must be ACCEPTED.
function run(ctx) {
  const { input, groundTruth } = ctx;
  const nodes = [
    { id: 'table:users', class: 'Table', name: 'users', source_ref: 'db.sql', evidence_quote: 'CREATE TABLE users (' },
    { id: 'column:users.id', class: 'Column', name: 'users.id', source_ref: 'db.sql', evidence_quote: 'id INTEGER PRIMARY KEY' },
    { id: 'column:users.email', class: 'Column', name: 'users.email', source_ref: 'db.sql', evidence_quote: 'email TEXT NOT NULL' },
    { id: 'column:users.status', class: 'Column', name: 'users.status', source_ref: 'db.sql', evidence_quote: 'status TEXT NOT NULL' },
    { id: 'entity:User', class: 'Entity', name: 'User', source_ref: 'user.entity.ts', evidence_quote: '// @entity User' },
    { id: 'field:User.id', class: 'Field', name: 'User.id', source_ref: 'user.entity.ts', evidence_quote: '@Column() id: number;' },
    { id: 'field:User.email', class: 'Field', name: 'User.email', source_ref: 'user.entity.ts', evidence_quote: '@Column() email: string;' },
    { id: 'field:User.status', class: 'Field', name: 'User.status', source_ref: 'user.entity.ts', evidence_quote: '@Column() status: string;' },
    { id: 'repository:UsersRepository', class: 'Repository', name: 'UsersRepository', source_ref: 'users.repository.ts', evidence_quote: '// @repository UsersRepository' },
    { id: 'service:UsersService', class: 'Service', name: 'UsersService', source_ref: 'users.service.ts', evidence_quote: '// @service UsersService' },
    { id: 'controller:UsersController', class: 'Controller', name: 'UsersController', source_ref: 'users.controller.ts', evidence_quote: '// @controller UsersController' },
    { id: 'endpoint:GET /users', class: 'Endpoint', name: 'GET /users', source_ref: 'users.controller.ts', evidence_quote: '// @exposes GET /users' },
    { id: 'openapi:/users', class: 'OpenAPI', name: '/users', source_ref: 'openapi.json', evidence_quote: '"/users": {' }
  ];
  const edges = [
    { id: 'edge:field-of:field:User.id->entity:User', type: 'field-of', from: 'field:User.id', to: 'entity:User', source_ref: 'user.entity.ts', evidence_quote: '@Column() id: number;' },
    { id: 'edge:field-of:field:User.email->entity:User', type: 'field-of', from: 'field:User.email', to: 'entity:User', source_ref: 'user.entity.ts', evidence_quote: '@Column() email: string;' },
    { id: 'edge:field-of:field:User.status->entity:User', type: 'field-of', from: 'field:User.status', to: 'entity:User', source_ref: 'user.entity.ts', evidence_quote: '@Column() status: string;' },
    { id: 'edge:maps:column:users.id->field:User.id', type: 'maps', from: 'column:users.id', to: 'field:User.id', source_ref: 'user.entity.ts', evidence_quote: '@Column() id: number;' },
    { id: 'edge:maps:column:users.email->field:User.email', type: 'maps', from: 'column:users.email', to: 'field:User.email', source_ref: 'user.entity.ts', evidence_quote: '@Column() email: string;' },
    { id: 'edge:maps:column:users.status->field:User.status', type: 'maps', from: 'column:users.status', to: 'field:User.status', source_ref: 'user.entity.ts', evidence_quote: '@Column() status: string;' },
    { id: 'edge:persisted-by:entity:User->repository:UsersRepository', type: 'persisted-by', from: 'entity:User', to: 'repository:UsersRepository', source_ref: 'users.repository.ts', evidence_quote: '// @uses-entity User' },
    { id: 'edge:used-by-service:repository:UsersRepository->service:UsersService', type: 'used-by-service', from: 'repository:UsersRepository', to: 'service:UsersService', source_ref: 'users.service.ts', evidence_quote: '// @uses UsersRepository' },
    { id: 'edge:used-by-controller:service:UsersService->controller:UsersController', type: 'used-by-controller', from: 'service:UsersService', to: 'controller:UsersController', source_ref: 'users.controller.ts', evidence_quote: '// @uses UsersService' },
    { id: 'edge:exposes:controller:UsersController->endpoint:GET /users', type: 'exposes', from: 'controller:UsersController', to: 'endpoint:GET /users', source_ref: 'users.controller.ts', evidence_quote: '// @exposes GET /users' },
    { id: 'edge:documented-by:endpoint:GET /users->openapi:/users', type: 'documented-by', from: 'endpoint:GET /users', to: 'openapi:/users', source_ref: 'users.controller.ts', evidence_quote: '// @exposes GET /users' }
  ];
  const truth = nodes.map(n => ({
    id: `truth:${n.id}`, statement: `${n.class} ${n.name} exists`, class: 'DIRECT_OBSERVATION', evidence: [n.source_ref]
  })).concat(edges.map(e => ({
    id: `truth:${e.id}`, statement: `${e.from} ${e.type} ${e.to}`, class: 'DIRECT_OBSERVATION', evidence: [e.source_ref]
  })));

  const presentClasses = new Set(nodes.map(n => n.class));
  const expected = ctx.ontology.impact_classes;
  const covered = expected.filter(c => presentClasses.has(c));
  const coverage = +(covered.length / expected.length).toFixed(3);

  return {
    protocol_version: input.protocol_version, session_id: input.session_id, worker_id: 'compliant',
    mission: input.mission, target: input.target, stage: input.stage,
    claims: { nodes, edges, truth },
    impact_closure: { target: input.target, nodes: groundTruth.impact.nodes },
    coverage_self_report: { coverage, covered_classes: covered, blindspots: expected.filter(c => !presentClasses.has(c)) },
    proposed_edits: []
  };
}

module.exports = { run };

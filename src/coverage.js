'use strict';
// S8 — Coverage / Completeness Engine (E14). Quantifies how much of the expected
// engineering surface a closure actually covers, and names the blind spots, instead
// of asserting "complete" (I-3). closure coverage = present impact-classes / expected.

function classOf(id) { return id.split(':')[0]; }

const CLASS_BY_PREFIX = {
  table: 'Table', column: 'Column', entity: 'Entity', field: 'Field',
  repository: 'Repository', service: 'Service', controller: 'Controller',
  endpoint: 'Endpoint', openapi: 'OpenAPI'
};

function measureClosure(store, ontology, closureIds) {
  const present = new Set();
  for (const id of closureIds) {
    const cls = CLASS_BY_PREFIX[classOf(id)];
    if (cls) present.add(cls);
  }
  const expected = ontology.impact_classes;
  const covered = expected.filter(c => present.has(c));
  const blindspots = expected.filter(c => !present.has(c));
  const coverage = expected.length ? +(covered.length / expected.length).toFixed(3) : 1;
  return { coverage, covered_classes: covered, blindspots };
}

function modelCoverage(store, ontology) {
  const present = new Set(store.allNodes().map(n => n.class));
  const expected = ontology.impact_classes;
  const covered = expected.filter(c => present.has(c));
  return {
    coverage: expected.length ? +(covered.length / expected.length).toFixed(3) : 1,
    blindspots: expected.filter(c => !present.has(c))
  };
}

module.exports = { measureClosure, modelCoverage };

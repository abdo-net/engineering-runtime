'use strict';
// S4 — Ontology Engine (warm read of an active profile). In cold mode this would be
// inferred + ratified; here we read a committed profile so every later engine is
// parameterized by it (I-7: ontology-first, not CRUD-hardcoded).
const fs = require('fs');

function loadOntology(file) {
  const o = JSON.parse(fs.readFileSync(file, 'utf8'));
  o.edgeTypeByName = Object.fromEntries(o.edge_types.map(e => [e.type, e]));
  o.propagatingTypes = new Set(o.edge_types.filter(e => e.propagates).map(e => e.type));
  return o;
}

module.exports = { loadOntology };

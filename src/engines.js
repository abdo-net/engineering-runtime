'use strict';
// S5 — Reconstruction engines (deterministic subset): E01/E03 Structural and E11
// Traceability. Structural turns node-observations into model nodes; Traceability
// resolves rel-observations into typed TRACEABILITY_LINK edges. Every object gets a
// DIRECT_OBSERVATION truth record tagged source_authority=CODE (S7 owns promotion).

function truthFor(store, subjectId, statement, ref) {
  const id = `truth:${subjectId}`;
  store.putTruth({
    id, statement, class: 'DIRECT_OBSERVATION', source_authority: 'CODE',
    evidence: [ref], dependencies: [], lifecycle: 'Observed'
  });
  return id;
}

// E01/E03 — Structural
function buildStructural(store, observations) {
  for (const o of observations.filter(o => o.kind === 'node')) {
    if (store.hasNode(o.id)) continue;
    const truth = truthFor(store, o.id, `${o.class} ${o.name} exists`, o.source_ref);
    store.putNode({
      id: o.id, class: o.class, name: o.name,
      source_authority: 'CODE', source_ref: o.source_ref, truth
    });
  }
}

// E11 — Traceability. Only materializes an edge when both endpoints are real nodes.
function buildTraceability(store, observations, ontology) {
  for (const o of observations.filter(o => o.kind === 'rel')) {
    if (!store.hasNode(o.from) || !store.hasNode(o.to)) continue; // dangling ref → skipped
    const def = ontology.edgeTypeByName[o.type];
    const id = `edge:${o.type}:${o.from}->${o.to}`;
    const truth = truthFor(store, id, `${o.from} ${o.type} ${o.to}`, o.source_ref);
    store.putEdge({
      id, type: o.type, from: o.from, to: o.to,
      semantic: def ? def.semantic : o.type, // edges may not be semantically empty
      propagates: def ? !!def.propagates : false, directional: true, truth
    });
  }
}

module.exports = { buildStructural, buildTraceability };
